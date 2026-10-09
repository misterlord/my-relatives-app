import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dev.db with initial test data (No marriage unions)...');

  // 1. Admin User
  const hashedPassword = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword },
    create: {
      username: 'admin',
      password: hashedPassword,
    },
  });

  // Clear existing nodes, unions, images, and family groups
  await prisma.nodeImage.deleteMany();
  await prisma.person.deleteMany();
  await prisma.union.deleteMany();
  await prisma.familyGroup.deleteMany();

  // 2. Default Family Group
  const defaultGroup = await prisma.familyGroup.create({
    data: {
      name: 'กลุ่มเครือญาติหลัก',
      description: 'กลุ่มเครือญาติเริ่มต้นประจำผัง',
      isDefault: true,
    },
  });

  // 3. Generation 1: Grandfather (Single Parent - No Marriage Union)
  const grandpa = await prisma.person.create({
    data: {
      name: 'คุณปู่ สมศักดิ์',
      gender: 'MALE',
      birthDate: '1955-04-12',
      description: 'ผู้นำต้นตระกูลลำดับที่ 1 (บุพการีสูงสุด)',
      groupId: defaultGroup.id,
      order: 0,
    },
  });

  // Single Parent Union (partner1Id only, partner2Id is null)
  const grandUnion = await prisma.union.create({
    data: {
      partner1Id: grandpa.id,
      partner2Id: null,
      groupId: defaultGroup.id,
    },
  });

  // 4. Generation 2: Father & Uncle (Direct children of Grandpa)
  const father = await prisma.person.create({
    data: {
      name: 'คุณพ่อ วิชัย',
      gender: 'MALE',
      birthDate: '1980-06-15',
      description: 'บุตรชายคนโตของตระกูล (พี่)',
      parentUnionId: grandUnion.id,
      groupId: defaultGroup.id,
      order: 0,
    },
  });

  await prisma.person.create({
    data: {
      name: 'คุณอา วิทูร',
      gender: 'MALE',
      birthDate: '1984-11-03',
      description: 'บุตรชายคนเล็ก (น้อง)',
      parentUnionId: grandUnion.id,
      groupId: defaultGroup.id,
      order: 1,
    },
  });

  // Single Parent Union for Father (partner1Id only, partner2Id is null)
  const fatherUnion = await prisma.union.create({
    data: {
      partner1Id: father.id,
      partner2Id: null,
      groupId: defaultGroup.id,
    },
  });

  // 5. Generation 3: Children (Me & Sister - Direct children of Father)
  await prisma.person.create({
    data: {
      name: 'ฉัน (ตัวฉัน)',
      gender: 'MALE',
      birthDate: '2005-08-20',
      description: 'บุตรชายคนโต (พี่)',
      parentUnionId: fatherUnion.id,
      groupId: defaultGroup.id,
      order: 0,
    },
  });

  await prisma.person.create({
    data: {
      name: 'น้องสาว (สุดา)',
      gender: 'FEMALE',
      birthDate: '2010-01-10',
      description: 'บุตรสาวคนเล็ก (น้อง)',
      parentUnionId: fatherUnion.id,
      groupId: defaultGroup.id,
      order: 1,
    },
  });

  console.log('Sample family tree (No marriage unions) seeded successfully to dev.db.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
