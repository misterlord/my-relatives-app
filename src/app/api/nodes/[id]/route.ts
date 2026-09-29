import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { unlink } from 'fs/promises';
import path from 'path';

interface Context {
  params: Promise<{ id: string }>;
}

// GET single person
export async function GET(request: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        images: true,
        parentUnion: {
          include: {
            partner1: { select: { id: true, name: true, gender: true } },
            partner2: { select: { id: true, name: true, gender: true } },
          },
        },
        unionsAsPartner1: {
          include: {
            partner2: { select: { id: true, name: true, gender: true } },
            children: { select: { id: true, name: true, gender: true } },
          },
        },
        unionsAsPartner2: {
          include: {
            partner1: { select: { id: true, name: true, gender: true } },
            children: { select: { id: true, name: true, gender: true } },
          },
        },
      },
    });

    if (!person) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลบุคคลนี้' }, { status: 404 });
    }

    return NextResponse.json({ person });
  } catch (error) {
    console.error('Error getting person:', error);
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 });
  }
}

// PUT update person details (name, gender, description, birthDate)
export async function PUT(request: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { name, gender, description, birthDate, isDeceased } = await request.json();

    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json({ error: 'ชื่อบุคคลห้ามเป็นค่าว่าง' }, { status: 400 });
    }

    const updatedPerson = await prisma.person.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(gender !== undefined && { gender }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(birthDate !== undefined && { birthDate: birthDate ? birthDate.trim() : null }),
        ...(isDeceased !== undefined && { isDeceased }),
      },
      include: {
        images: true,
        parentUnion: {
          include: {
            partner1: { select: { id: true, name: true } },
            partner2: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, person: updatedPerson });
  } catch (error) {
    console.error('Error updating person:', error);
    return NextResponse.json({ error: 'Failed to update person' }, { status: 500 });
  }
}

// DELETE person
export async function DELETE(request: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Remove local image files
    const images = await prisma.nodeImage.findMany({
      where: { personId: id },
    });

    for (const img of images) {
      if (img.url.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'public', img.url);
        try {
          await unlink(filePath);
        } catch {
          // ignore
        }
      }
    }

    await prisma.person.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting person:', error);
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 });
  }
}
