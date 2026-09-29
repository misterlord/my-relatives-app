import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST create marriage union between two persons
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { partner1Id, partner2Id } = await request.json();

    if (!partner1Id) {
      return NextResponse.json({ error: 'กรุณาระบุบุคคลอย่างน้อย 1 คน' }, { status: 400 });
    }

    if (partner1Id === partner2Id) {
      return NextResponse.json({ error: 'ไม่สามารถแต่งงานกับตัวเองได้' }, { status: 400 });
    }

    const union = await prisma.union.create({
      data: {
        partner1Id,
        partner2Id: partner2Id || null,
      },
      include: {
        partner1: true,
        partner2: true,
        children: true,
      },
    });

    return NextResponse.json({ success: true, union });
  } catch (error) {
    console.error('Error creating marriage union:', error);
    return NextResponse.json({ error: 'Failed to create marriage union' }, { status: 500 });
  }
}

// DELETE marriage union
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { unionId } = await request.json();
    if (!unionId) {
      return NextResponse.json({ error: 'กรุณาระบุ unionId' }, { status: 400 });
    }

    await prisma.union.delete({
      where: { id: unionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting marriage union:', error);
    return NextResponse.json({ error: 'Failed to delete marriage union' }, { status: 500 });
  }
}
