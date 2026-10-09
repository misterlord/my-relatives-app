const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const prismaDir = path.join(rootDir, 'prisma');
const envPath = path.join(rootDir, '.env');

// Simple .env parser to get environment variables without requiring external dependencies
function loadEnv() {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
  return env;
}

const fileEnv = loadEnv();
const rawArg = process.argv[2] || '';
const argTarget = rawArg.toLowerCase();

let provider = 'sqlite';

if (argTarget === 'supabase' || argTarget === 'postgres' || argTarget === 'postgresql') {
  provider = 'supabase';
} else if (argTarget === 'sqlite') {
  provider = 'sqlite';
} else {
  // Auto-detect from environment variables
  const dbProvider = (process.env.DB_PROVIDER || fileEnv.DB_PROVIDER || '').toLowerCase();
  const dbUrl = process.env.DATABASE_URL || fileEnv.DATABASE_URL || '';

  if (dbProvider === 'supabase' || dbProvider === 'postgres' || dbProvider === 'postgresql') {
    provider = 'supabase';
  } else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    provider = 'supabase';
  } else {
    provider = 'sqlite';
  }
}

const sourceFile = path.join(prismaDir, `schema.${provider}.prisma`);
const targetFile = path.join(prismaDir, 'schema.prisma');

if (!fs.existsSync(sourceFile)) {
  console.error(`[DB Switcher] Error: Source schema file not found: ${sourceFile}`);
  process.exit(1);
}

const schemaContent = fs.readFileSync(sourceFile, 'utf8');
fs.writeFileSync(targetFile, schemaContent);

console.log(`[DB Switcher] Successfully activated Prisma schema for: ${provider.toUpperCase()}`);
