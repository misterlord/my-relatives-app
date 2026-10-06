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

// Helper function: Check if targetPersonId is an ancestor of startPersonId
async function checkIsAncestor(
  startPersonId: string,
  targetPersonId: string,
  visited = new Set<string>()
): Promise<boolean> {
  if (startPersonId === targetPersonId) return true;
  if (visited.has(startPersonId)) return false;
  visited.add(startPersonId);

  const person = await prisma.person.findUnique({
    where: { id: startPersonId },
    select: {
      parentUnion: {
        select: {
          partner1Id: true,
          partner2Id: true,
        },
      },
    },
  });

  if (!person || !person.parentUnion) return false;

  const { partner1Id, partner2Id } = person.parentUnion;
  if (partner1Id) {
    if (partner1Id === targetPersonId || (await checkIsAncestor(partner1Id, targetPersonId, visited))) {
      return true;
    }
  }
  if (partner2Id) {
    if (partner2Id === targetPersonId || (await checkIsAncestor(partner2Id, targetPersonId, visited))) {
      return true;
    }
  }

  return false;
}

// PUT update person details and parent/child relationships
export async function PUT(request: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const {
      name,
      gender,
      description,
      birthDate,
      isDeceased,
      parentPersonId,
      addChildPersonId,
      removeChildPersonId,
    } = body;

    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json({ error: 'ชื่อบุคคลห้ามเป็นค่าว่าง' }, { status: 400 });
    }

    let newParentUnionId: string | null | undefined = undefined;

    // 1. UPDATE PARENT NODE RELATIONSHIP
    if (parentPersonId !== undefined) {
      if (!parentPersonId || parentPersonId.trim() === '') {
        newParentUnionId = null;
      } else {
        const targetParentId = parentPersonId.trim();

        // Prevent self-reference or circular reference
        if (targetParentId === id || (await checkIsAncestor(targetParentId, id))) {
          return NextResponse.json(
            {
              error:
                'ไม่สามารถตั้งค่าบุคคลนี้เป็นบิดา/มารดาได้ เนื่องจากจะทำให้เกิดวงวนซ้ำในผังสายตระกูล (Circular Reference)',
            },
            { status: 400 }
          );
        }

        // Find or create union for targetParentId
        const existingUnion = await prisma.union.findFirst({
          where: {
            OR: [{ partner1Id: targetParentId }, { partner2Id: targetParentId }],
          },
        });

        if (existingUnion) {
          newParentUnionId = existingUnion.id;
        } else {
          const newUnion = await prisma.union.create({
            data: { partner1Id: targetParentId },
          });
          newParentUnionId = newUnion.id;
        }
      }
    }

    // 2. ADD CHILD RELATIONSHIP
    if (addChildPersonId && typeof addChildPersonId === 'string') {
      const childId = addChildPersonId.trim();
      if (childId === id || (await checkIsAncestor(id, childId))) {
        return NextResponse.json(
          {
            error:
              'ไม่สามารถเพิ่มบุคคลนี้เป็นบุตรหลานได้ เนื่องจากจะทำให้เกิดวงวนซ้ำในผังสายตระกูล (Circular Reference)',
          },
          { status: 400 }
        );
      }

      // Find or create union for current person `id`
      let myUnion = await prisma.union.findFirst({
        where: {
          OR: [{ partner1Id: id }, { partner2Id: id }],
        },
      });

      if (!myUnion) {
        myUnion = await prisma.union.create({
          data: { partner1Id: id },
        });
      }

      await prisma.person.update({
        where: { id: childId },
        data: { parentUnionId: myUnion.id },
      });
    }

    // 3. REMOVE CHILD RELATIONSHIP
    if (removeChildPersonId && typeof removeChildPersonId === 'string') {
      await prisma.person.update({
        where: { id: removeChildPersonId.trim() },
        data: { parentUnionId: null },
      });
    }

    // Update main Person fields
    const updatedPerson = await prisma.person.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(gender !== undefined && { gender }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(birthDate !== undefined && { birthDate: birthDate ? birthDate.trim() : null }),
        ...(isDeceased !== undefined && { isDeceased }),
        ...(newParentUnionId !== undefined && { parentUnionId: newParentUnionId }),
      },
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
