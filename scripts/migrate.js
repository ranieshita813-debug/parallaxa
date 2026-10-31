'use strict';

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL is not defined, skipping migrations.');
    return;
  }
  
  const sql = neon(databaseUrl);
  console.log('Running migrations...');
  
  try {
    try {
      await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
      console.log('vector extension enabled/checked.');
    } catch (e) {
      console.warn('vector extension enable failed or not supported:', e.message);
    }

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        role TEXT DEFAULT 'user',
        is_frozen BOOLEAN DEFAULT FALSE,
        email_verified TIMESTAMP WITH TIME ZONE,
        verification_token TEXT,
        reset_token TEXT,
        reset_token_expires TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;`;
      console.log('users is_frozen column checked/added.');
    } catch (e) {
      console.error('Alter users table is_frozen failed:', e);
    }

    await sql`
      CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        author TEXT NOT NULL,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        image TEXT,
        read_time INTEGER DEFAULT 0,
        featured BOOLEAN DEFAULT FALSE,
        breaking BOOLEAN DEFAULT FALSE,
        trending BOOLEAN DEFAULT FALSE,
        views INTEGER DEFAULT 0,
        slug TEXT,
        source_url TEXT,
        seo_title TEXT,
        meta_description TEXT,
        focus_keyword TEXT,
        canonical_url TEXT,
        og_image TEXT,
        twitter_card TEXT DEFAULT 'summary_large_image',
        no_index BOOLEAN DEFAULT FALSE,
        allow_comments BOOLEAN DEFAULT TRUE,
        show_in_rss BOOLEAN DEFAULT TRUE,
        amp_enabled BOOLEAN DEFAULT FALSE,
        redirect_url TEXT,
        css_class TEXT,
        visibility TEXT DEFAULT 'public',
        scheduled_at TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'draft',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        embedding vector(768),
        user_id UUID
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS home_sections (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        category_id INTEGER,
        layout TEXT DEFAULT 'grid',
        limit_count INTEGER DEFAULT 10,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        article_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(article_id, user_id)
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        article_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        user_image TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Convert article_id in reactions to TEXT if it's currently INTEGER
    try {
      await sql`ALTER TABLE reactions ALTER COLUMN article_id TYPE TEXT;`;
    } catch {
      console.log('Alter reactions table article_id type skipped or already done.');
    }
    
    // Convert article_id in comments to TEXT if it's currently INTEGER
    try {
      await sql`ALTER TABLE comments ALTER COLUMN article_id TYPE TEXT;`;
    } catch {
      console.log('Alter comments table article_id type skipped or already done.');
    }

    await sql`
      CREATE TABLE IF NOT EXISTS custom_blocks (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '🧩',
        params JSONB DEFAULT '[]'::jsonb,
        html_template TEXT NOT NULL,
        is_builtin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Backfill any missing columns in home_sections
    try {
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS category_id INTEGER;`;
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT 'grid';`;
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS limit_count INTEGER DEFAULT 10;`;
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;`;
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`;
      console.log('Home sections table columns checked/backfilled.');
    } catch (e) {
      console.error('Alter home_sections table skipped or failed:', e);
    }
    
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
