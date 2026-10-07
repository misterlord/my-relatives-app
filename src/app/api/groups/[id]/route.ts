import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

interface Context {
  params: Promise<{ id: string }>;
}

// PUT update family group
export async function PUT(request: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { name, description } = await request.json();

    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json({ error: 'ชื่อกลุ่มเครือญาติห้ามเป็นค่าว่าง' }, { status: 400 });
    }

    const updatedGroup = await prisma.familyGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
      },
      include: {
        _count: {
          select: { persons: true },
        },
      },
    });

    return NextResponse.json({ success: true, group: updatedGroup });
  } catch (error) {
    console.error('Error updating family group:', error);
    return NextResponse.json({ error: 'Failed to update family group' }, { status: 500 });
  }
}

// DELETE family group
export async function DELETE(request: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const groupCount = await prisma.familyGroup.count();
    if (groupCount <= 1) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบกลุ่มเครือญาตินี้ได้ เนื่องจากต้องมีอย่างน้อย 1 กลุ่มในระบบ' },
        { status: 400 }
      );
    }

    // Delete group (persons & unions will have groupId set to null via SetNull relation)
    await prisma.familyGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting family group:', error);
    return NextResponse.json({ error: 'Failed to delete family group' }, { status: 500 });
  }
}
