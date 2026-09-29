import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding family database with birth dates...');

  const hashedPassword = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword },
    create: {
      username: 'admin',
      password: hashedPassword,
    },
  });

  const personCount = await prisma.person.count();
  if (personCount === 0) {
    // 1. Generation 1: Grandparents
    const grandpa = await prisma.person.create({
      data: {
        name: 'คุณปู่ สมศักดิ์',
        gender: 'MALE',
        birthDate: '1955-04-12',
        description: 'ผู้นำต้นตระกูลลำดับที่ 1 (บุพการีสูงสุด)',
      },
    });

    const grandma = await prisma.person.create({
      data: {
        name: 'คุณย่า สมศรี',
        gender: 'FEMALE',
        birthDate: '1958-09-25',
        description: 'คู่สมรสต้นตระกูลลำดับที่ 1',
      },
    });

    // Marriage Union 1 (Grandparents Union)
    const grandUnion = await prisma.union.create({
      data: {
        partner1Id: grandpa.id,
        partner2Id: grandma.id,
      },
    });

    // 2. Generation 2: Father & Uncle (Born from Grandparents Union)
    const father = await prisma.person.create({
      data: {
        name: 'คุณพ่อ วิชัย',
        gender: 'MALE',
        birthDate: '1980-06-15',
        description: 'บุตรชายคนโตของตระกูล',
        parentUnionId: grandUnion.id,
      },
    });

    await prisma.person.create({
      data: {
        name: 'คุณอา วิทูร',
        gender: 'MALE',
        birthDate: '1984-11-03',
        description: 'บุตรชายคนเล็ก',
        parentUnionId: grandUnion.id,
      },
    });

    const mother = await prisma.person.create({
      data: {
        name: 'คุณแม่ พิมลพรรณ',
        gender: 'FEMALE',
        birthDate: '1982-02-18',
        description: 'คู่สมรสของคุณพ่อวิชัย',
      },
    });

    // Marriage Union 2 (Father & Mother Union)
    const parentsUnion = await prisma.union.create({
      data: {
        partner1Id: father.id,
        partner2Id: mother.id,
      },
    });

    // 3. Generation 3: Children (Born from Father & Mother Union)
    await prisma.person.create({
      data: {
        name: 'ฉัน (ตัวฉัน)',
        gender: 'MALE',
        birthDate: '2005-08-20',
        description: 'บุตรชายคนโต',
        parentUnionId: parentsUnion.id,
      },
    });

    await prisma.person.create({
      data: {
        name: 'น้องสาว (สุดา)',
        gender: 'FEMALE',
        birthDate: '2010-01-10',
        description: 'บุตรสาวคนเล็ก',
        parentUnionId: parentsUnion.id,
      },
    });

    console.log('Sample family tree seeded successfully with birth dates.');
  }
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
