'use strict';

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { hash } = require('bcrypt-ts');

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

async function seedAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL is not defined, skipping admin seed.');
    return;
  }

  const sql = neon(databaseUrl);
  console.log('Seeding admin account...');

  const email = 'report.hcltd@gmail.com';
  const password = '123456789';
  const name = 'Admin';
  const role = 'admin';

  try {
    const hashedPassword = await hash(password, 12);

    const existing = await sql`
      SELECT id, email, role FROM users WHERE email = ${email} LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE users
        SET password = ${hashedPassword},
            role = ${role},
            name = COALESCE(name, ${name}),
            email_verified = NOW(),
            updated_at = NOW()
        WHERE email = ${email}
      `;
      console.log(`Updated admin user: ${email}`);
    } else {
      await sql`
        INSERT INTO users (email, password, name, role, email_verified)
        VALUES (${email}, ${hashedPassword}, ${name}, ${role}, NOW())
      `;
      console.log(`Created admin user: ${email}`);
    }
  } catch (error) {
    console.error('Failed to seed admin account:', error);
    process.exit(1);
  }
}

seedAdmin();
