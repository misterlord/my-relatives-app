import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET all family groups (Auto-seed default group if empty)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let groups = await prisma.familyGroup.findMany({
      include: {
        _count: {
          select: { persons: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // If no groups exist in DB, create default group and link existing persons/unions
    if (groups.length === 0) {
      const defaultGroup = await prisma.familyGroup.create({
        data: {
          name: 'กลุ่มเครือญาติหลัก',
          description: 'กลุ่มเครือญาติเริ่มต้นประจำผัง',
          isDefault: true,
        },
      });

      // Update existing persons and unions without a group
      await prisma.person.updateMany({
        where: { groupId: null },
        data: { groupId: defaultGroup.id },
      });

      await prisma.union.updateMany({
        where: { groupId: null },
        data: { groupId: defaultGroup.id },
      });

      groups = await prisma.familyGroup.findMany({
        include: {
          _count: {
            select: { persons: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching family groups:', error);
    return NextResponse.json({ error: 'Failed to fetch family groups' }, { status: 500 });
  }
}

// POST create new family group
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อกลุ่มเครือญาติ' }, { status: 400 });
    }

    const newGroup = await prisma.familyGroup.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
      },
      include: {
        _count: {
          select: { persons: true },
        },
      },
    });

    return NextResponse.json({ success: true, group: newGroup });
  } catch (error) {
    console.error('Error creating family group:', error);
    return NextResponse.json({ error: 'Failed to create family group' }, { status: 500 });
  }
}
