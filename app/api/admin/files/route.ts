import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import fs from 'fs'
import path from 'path'

// Allowed top-level directories / files that the admin can view & read
const ALLOWED_TOP_DIRS = new Set([
  'app',
  'components',
  'hooks',
  'lib',
  'public',
  'scripts',
  'styles',
  'package.json',
  'tsconfig.json',
  'README.md',
  'proxy.ts',
  'auth.ts',
  'auth.config.ts',
  'next.config.mjs',
  'components.json',
])

// Disallowed directories and files
const BLOCKED_PATTERNS = [
  /^\.env/i,
  /node_modules/,
  /^\.git/,
  /^\.next/,
  /firebase.*\.json$/i,
  /\.log$/i,
  /\.tsbuildinfo$/i,
]

function isBlocked(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/')
  return BLOCKED_PATTERNS.some(p => p.test(normalized) || p.test(path.basename(normalized)))
}

export function isServerlessReadOnly(): boolean {
  // Common serverless environment indicators where the root filesystem is read-only
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    return true
  }
  // If cwd starts with /var/task or is known serverless root
  if (process.cwd().startsWith('/var/task')) {
    return true
  }
  return false
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  extension?: string
  children?: FileNode[]
}

function scanDir(dirPath: string, rootDir: string): FileNode[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const result: FileNode[] = []

  // Sort: directories first, then files
  const sorted = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  })

  for (const entry of sorted) {
    const fullPath = path.join(dirPath, entry.name)
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/')

    if (isBlocked(relPath) || entry.name.startsWith('.')) {
      continue
    }

    if (entry.isDirectory()) {
      const children = scanDir(fullPath, rootDir)
      result.push({
        name: entry.name,
        path: relPath,
        type: 'directory',
        children,
      })
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      let size = 0
      try {
        size = fs.statSync(fullPath).size
      } catch {
        // ignore
      }
      result.push({
        name: entry.name,
        path: relPath,
        type: 'file',
        size,
        extension: ext,
      })
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { path: requestedFile, content } = body

    if (!requestedFile || typeof requestedFile !== 'string') {
      return NextResponse.json({ error: 'File path is required.' }, { status: 400 })
    }

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'File content must be a string.' }, { status: 400 })
    }

    const rootDir = process.cwd()
    const cleanPath = path.normalize(requestedFile).replace(/^(\.\.(\/|\\|$))+/, '')
    const fullPath = path.join(rootDir, cleanPath)

    // Security check: ensure path is within rootDir and not blocked
    if (!fullPath.startsWith(rootDir) || isBlocked(cleanPath)) {
      return NextResponse.json({ error: 'Access denied: Cannot write to protected path.' }, { status: 403 })
    }

    // Check top-level permission
    const topLevelDir = cleanPath.split(/[/\\]/)[0]
    if (!ALLOWED_TOP_DIRS.has(topLevelDir)) {
      return NextResponse.json({ error: `Writing to ${topLevelDir} is not permitted.` }, { status: 403 })
    }

    if (isServerlessReadOnly()) {
      return NextResponse.json(
        {
          error:
            'File system is read-only in this serverless deployment environment (e.g. Vercel / AWS Lambda). Project source files cannot be modified directly on disk at runtime. To create or edit custom pages, please use the Page Editor which saves pages in the database.',
          readOnly: true,
          code: 'EROFS',
        },
        { status: 403 }
      )
    }

    // Check if directory exists, create if needed
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Write file
    fs.writeFileSync(fullPath, content, 'utf8')

    const stat = fs.statSync(fullPath)
    return NextResponse.json({
      success: true,
      path: cleanPath,
      name: path.basename(cleanPath),
      size: stat.size,
      updatedAt: stat.mtime,
    })
  } catch (e: any) {
    console.error('Failed to write file:', e)
    if (e.code === 'EROFS' || e.message?.includes('read-only file system') || e.message?.includes('EROFS')) {
      return NextResponse.json(
        {
          error:
            'File system is read-only in this serverless deployment environment. Project source files cannot be modified directly on disk at runtime. To create or edit custom pages, please use the Page Editor which saves pages in the database.',
          readOnly: true,
          code: 'EROFS',
        },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: `Failed to save file: ${e.message}` }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const requestedFile = searchParams.get('path')
  const rootDir = process.cwd()

  // 1. Read specific file content
  if (requestedFile) {
    const cleanPath = path.normalize(requestedFile).replace(/^(\.\.(\/|\\|$))+/, '')
    const fullPath = path.join(rootDir, cleanPath)

    // Security check: ensure path is within rootDir and not blocked
    if (!fullPath.startsWith(rootDir) || isBlocked(cleanPath)) {
      return NextResponse.json({ error: 'Access denied to requested file path.' }, { status: 400 })
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 })
    }

    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      return NextResponse.json({ error: 'Path is a directory, not a file.' }, { status: 400 })
    }

    // Limit maximum file size to 2MB to prevent memory exhaustion
    if (stat.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File is too large to display (over 2MB).' }, { status: 400 })
    }

    const ext = path.extname(cleanPath).toLowerCase()
    const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.ttf', '.otf', '.woff', '.woff2', '.zip']
    const isBinary = binaryExts.includes(ext)

    if (isBinary) {
      return NextResponse.json({
        path: cleanPath,
        name: path.basename(cleanPath),
        isBinary: true,
        size: stat.size,
        extension: ext,
        content: null,
      })
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8')
      return NextResponse.json({
        path: cleanPath,
        name: path.basename(cleanPath),
        isBinary: false,
        size: stat.size,
        extension: ext,
        content,
      })
    } catch (e: any) {
      return NextResponse.json({ error: `Failed to read file: ${e.message}` }, { status: 500 })
    }
  }

  // 2. Return tree of accessible files
  try {
    const tree: FileNode[] = []

    for (const topItem of Array.from(ALLOWED_TOP_DIRS)) {
      const fullPath = path.join(rootDir, topItem)
      if (!fs.existsSync(fullPath)) continue
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        tree.push({
          name: topItem,
          path: topItem,
          type: 'directory',
          children: scanDir(fullPath, rootDir),
        })
      } else {
        const ext = path.extname(topItem).toLowerCase()
        tree.push({
          name: topItem,
          path: topItem,
          type: 'file',
          size: stat.size,
          extension: ext,
        })
      }
    }

    return NextResponse.json({
      root: 'app-root',
      tree,
      readOnly: isServerlessReadOnly(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: `Failed to scan directory: ${e.message}` }, { status: 500 })
  }
}
