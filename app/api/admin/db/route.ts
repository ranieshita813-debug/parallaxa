import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@/lib/db'

// Whitelisted public tables that can be viewed and managed directly
const ALLOWED_TABLES = new Set([
  'pages',
  'articles',
  'users',
  'home_sections',
  'settings',
  'reactions',
  'comments',
  'custom_blocks',
])

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const tableName = searchParams.get('table')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10)))
  const offset = (page - 1) * limit

  try {
    // If no specific table requested, return all accessible tables with stats
    if (!tableName) {
      const tableRows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name ASC
      `

      const tablesWithDetails = await Promise.all(
        tableRows.map(async (t: any) => {
          const name = t.table_name
          const cols = await sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ${name}
            ORDER BY ordinal_position ASC
          `

          let count = 0
          try {
            // Safe identifier quoting
            const countRes = await sql.query(`SELECT COUNT(*)::int AS count FROM "${name.replace(/"/g, '""')}"`)
            count = countRes[0]?.count || 0
          } catch {
            // ignore
          }

          return {
            name,
            isAllowed: ALLOWED_TABLES.has(name),
            columns: cols.map((c: any) => ({
              name: c.column_name,
              type: c.data_type,
              nullable: c.is_nullable === 'YES',
              default: c.column_default,
            })),
            rowCount: count,
          }
        })
      )

      return NextResponse.json({ tables: tablesWithDetails })
    }

    // Specific table view
    if (!ALLOWED_TABLES.has(tableName)) {
      return NextResponse.json({ error: `Table '${tableName}' is not accessible.` }, { status: 400 })
    }

    const safeTable = tableName.replace(/"/g, '""')

    // Columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position ASC
    `

    // Count
    const countRes = await sql.query(`SELECT COUNT(*)::int AS count FROM "${safeTable}"`)
    const total = countRes[0]?.count || 0

    // Rows
    const rows = await sql.query(`SELECT * FROM "${safeTable}" LIMIT ${limit} OFFSET ${offset}`)

    return NextResponse.json({
      table: tableName,
      columns: columns.map((c: any) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === 'YES',
        default: c.column_default,
      })),
      rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (e: any) {
    console.error('GET /api/admin/db error:', e)
    return NextResponse.json({ error: e.message || 'Database query error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { action, table, data, query } = body

    // 1. Raw SQL Query runner (Admin superuser execution)
    if (action === 'query') {
      if (!query || typeof query !== 'string' || !query.trim()) {
        return NextResponse.json({ error: 'SQL query cannot be empty.' }, { status: 400 })
      }

      const trimmed = query.trim()
      // Disallow dangerous drop database commands
      if (/drop\s+database/i.test(trimmed)) {
        return NextResponse.json({ error: 'DROP DATABASE is disallowed.' }, { status: 400 })
      }

      const result = await sql.query(trimmed)
      return NextResponse.json({
        success: true,
        result,
        rowCount: Array.isArray(result) ? result.length : 0,
      })
    }

    // 2. Insert row into table
    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table '${table}' is not accessible.` }, { status: 400 })
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Row data must be an object.' }, { status: 400 })
    }

    // Validate columns against schema
    const colDefs = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
    `
    const validColNames = new Set(colDefs.map((c: any) => c.column_name))

    const insertKeys: string[] = []
    const insertVals: any[] = []

    for (const [k, v] of Object.entries(data)) {
      if (!validColNames.has(k)) continue
      // Don't manually insert auto-generated id unless supplied
      if (k === 'id' && (v === '' || v === undefined || v === null)) continue
      insertKeys.push(`"${k.replace(/"/g, '""')}"`)
      insertVals.push(v)
    }

    if (insertKeys.length === 0) {
      return NextResponse.json({ error: 'No valid columns provided for insertion.' }, { status: 400 })
    }

    const safeTable = table.replace(/"/g, '""')
    const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ')
    const insertSql = `INSERT INTO "${safeTable}" (${insertKeys.join(', ')}) VALUES (${placeholders}) RETURNING *`

    const res = await sql.query(insertSql, insertVals)
    return NextResponse.json({
      success: true,
      insertedRow: res[0],
    })
  } catch (e: any) {
    console.error('POST /api/admin/db error:', e)
    return NextResponse.json({ error: e.message || 'Operation failed' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { table, pkField = 'id', pkValue, data } = body

    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table '${table}' is not accessible.` }, { status: 400 })
    }

    if (pkValue === undefined || pkValue === null) {
      return NextResponse.json({ error: 'Primary key value is required for update.' }, { status: 400 })
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Update data is required.' }, { status: 400 })
    }

    const colDefs = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
    `
    const validColNames = new Set(colDefs.map((c: any) => c.column_name))

    const setClauses: string[] = []
    const values: any[] = []
    let valIdx = 1

    for (const [k, v] of Object.entries(data)) {
      if (!validColNames.has(k) || k === pkField) continue
      setClauses.push(`"${k.replace(/"/g, '""')}" = $${valIdx}`)
      values.push(v)
      valIdx++
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No updatable columns provided.' }, { status: 400 })
    }

    values.push(pkValue)
    const pkPlaceholder = `$${valIdx}`

    const safeTable = table.replace(/"/g, '""')
    const safePk = pkField.replace(/"/g, '""')
    const updateSql = `UPDATE "${safeTable}" SET ${setClauses.join(', ')} WHERE "${safePk}" = ${pkPlaceholder} RETURNING *`

    const res = await sql.query(updateSql, values)
    if (!res[0]) {
      return NextResponse.json({ error: 'Record not found to update.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      updatedRow: res[0],
    })
  } catch (e: any) {
    console.error('PUT /api/admin/db error:', e)
    return NextResponse.json({ error: e.message || 'Update failed' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const table = searchParams.get('table')
    const pkField = searchParams.get('pkField') || 'id'
    const pkValue = searchParams.get('pkValue')

    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table '${table}' is not accessible.` }, { status: 400 })
    }

    if (!pkValue) {
      return NextResponse.json({ error: 'Primary key value required for deletion.' }, { status: 400 })
    }

    const safeTable = table.replace(/"/g, '""')
    const safePk = pkField.replace(/"/g, '""')

    const delSql = `DELETE FROM "${safeTable}" WHERE "${safePk}" = $1 RETURNING *`
    const res = await sql.query(delSql, [pkValue])

    if (!res[0]) {
      return NextResponse.json({ error: 'Record not found for deletion.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      deletedRow: res[0],
    })
  } catch (e: any) {
    console.error('DELETE /api/admin/db error:', e)
    return NextResponse.json({ error: e.message || 'Deletion failed' }, { status: 400 })
  }
}
