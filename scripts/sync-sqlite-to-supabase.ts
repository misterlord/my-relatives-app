/**
 * Utility script to migrate local SQLite data to Supabase (PostgreSQL)
 * Usage: npx tsx scripts/sync-sqlite-to-supabase.ts
 */
import { PrismaClient as SqliteClient } from '@prisma/client';
import path from 'path';

async function main() {
  const targetDbUrl = process.env.DATABASE_URL;

  if (!targetDbUrl || (!targetDbUrl.startsWith('postgresql://') && !targetDbUrl.startsWith('postgres://'))) {
    console.error('❌ Error: DATABASE_URL must be set to a valid Supabase PostgreSQL connection string.');
    console.error('Example: DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:6543/postgres"');
    process.exit(1);
  }

  const sqliteDbPath = path.resolve(__dirname, '../prisma/dev.db');
  console.log(`🚀 Starting migration from SQLite (${sqliteDbPath}) -> Supabase PostgreSQL...`);

  // Connect to local SQLite DB
  const sqlitePrisma = new SqliteClient({
    datasources: {
      db: {
        url: `file:${sqliteDbPath}`,
      },
    },
  });

  // Connect to Supabase PostgreSQL DB
  const supabasePrisma = new SqliteClient({
    datasources: {
      db: {
        url: targetDbUrl,
      },
    },
  });

  try {
    // 1. Migrate Users
    const users = await sqlitePrisma.user.findMany();
    console.log(`📦 Found ${users.length} Users in SQLite`);
    for (const user of users) {
      await supabasePrisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }

    // 2. Migrate Family Groups
    const groups = await sqlitePrisma.familyGroup.findMany();
    console.log(`📦 Found ${groups.length} Family Groups in SQLite`);
    for (const group of groups) {
      await supabasePrisma.familyGroup.upsert({
        where: { id: group.id },
        update: group,
        create: group,
      });
    }

    // 3. Migrate Persons
    const persons = await sqlitePrisma.person.findMany();
    console.log(`📦 Found ${persons.length} Persons in SQLite`);
    for (const person of persons) {
      await supabasePrisma.person.upsert({
        where: { id: person.id },
        update: person,
        create: person,
      });
    }

    // 4. Migrate Unions
    const unions = await sqlitePrisma.union.findMany();
    console.log(`📦 Found ${unions.length} Unions in SQLite`);
    for (const union of unions) {
      await supabasePrisma.union.upsert({
        where: { id: union.id },
        update: union,
        create: union,
      });
    }

    // 5. Migrate Node Images
    const images = await sqlitePrisma.nodeImage.findMany();
    console.log(`📦 Found ${images.length} Node Images in SQLite`);
    for (const image of images) {
      await supabasePrisma.nodeImage.upsert({
        where: { id: image.id },
        update: image,
        create: image,
      });
    }

    console.log('✅ Successfully migrated all data from SQLite to Supabase!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sqlitePrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

main();
