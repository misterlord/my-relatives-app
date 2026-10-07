import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET persons and marriage unions (filtered by optional groupId)
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    // Auto-resolve active groupId if not provided
    let activeGroupId = groupId;
    if (!activeGroupId) {
      const defaultGroup = await prisma.familyGroup.findFirst({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      if (defaultGroup) {
        activeGroupId = defaultGroup.id;
      }
    }

    const personWhere = activeGroupId ? { groupId: activeGroupId } : {};
    const unionWhere = activeGroupId
      ? {
          OR: [
            { groupId: activeGroupId },
            { partner1: { groupId: activeGroupId } },
            { partner2: { groupId: activeGroupId } },
          ],
        }
      : {};

    const persons = await prisma.person.findMany({
      where: personWhere,
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
      orderBy: [{ order: 'asc' }, { birthDate: 'asc' }, { createdAt: 'asc' }],
    });

    const unions = await prisma.union.findMany({
      where: unionWhere,
      include: {
        partner1: { select: { id: true, name: true, gender: true } },
        partner2: { select: { id: true, name: true, gender: true } },
        children: {
          select: { id: true, name: true, gender: true, order: true },
          orderBy: [{ order: 'asc' }, { birthDate: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return NextResponse.json({ persons, unions, activeGroupId });
  } catch (error) {
    console.error('Error fetching persons and unions:', error);
    return NextResponse.json({ error: 'Failed to fetch family tree' }, { status: 500 });
  }
}

// POST create new Person Node with relationship setup and groupId
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      name,
      gender = 'MALE',
      description,
      birthDate,
      isDeceased = false,
      relationshipType = 'child', // 'child' | 'spouse' | 'parent' | 'standalone'
      referencePersonId,
      existingUnionId,
      groupId,
    } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อ-นามสกุล บุคคล' }, { status: 400 });
    }

    let targetGroupId = groupId;
    if (!targetGroupId && referencePersonId) {
      const refPerson = await prisma.person.findUnique({
        where: { id: referencePersonId },
        select: { groupId: true },
      });
      if (refPerson?.groupId) targetGroupId = refPerson.groupId;
    }

    if (!targetGroupId) {
      const defaultGroup = await prisma.familyGroup.findFirst({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      if (defaultGroup) targetGroupId = defaultGroup.id;
    }

    let targetParentUnionId: string | null = null;

    // 1. ADD CHILD MODE (Default)
    if (relationshipType === 'child') {
      if (existingUnionId) {
        targetParentUnionId = existingUnionId;
      } else if (referencePersonId) {
        const refPerson = await prisma.person.findUnique({
          where: { id: referencePersonId },
          include: { unionsAsPartner1: true, unionsAsPartner2: true },
        });

        if (refPerson) {
          const firstUnion = refPerson.unionsAsPartner1[0] || refPerson.unionsAsPartner2[0];
          if (firstUnion) {
            targetParentUnionId = firstUnion.id;
          } else {
            const newUnion = await prisma.union.create({
              data: { partner1Id: refPerson.id, groupId: targetGroupId },
            });
            targetParentUnionId = newUnion.id;
          }
        }
      }
    }

    // Create the new Person record
    const newPerson = await prisma.person.create({
      data: {
        name: name.trim(),
        gender,
        description: description?.trim() || null,
        birthDate: birthDate?.trim() || null,
        isDeceased: Boolean(isDeceased),
        parentUnionId: targetParentUnionId,
        groupId: targetGroupId,
      },
      include: { images: true, parentUnion: true },
    });

    // 2. ADD SPOUSE MODE
    if (relationshipType === 'spouse' && referencePersonId) {
      const existingSingleUnion = await prisma.union.findFirst({
        where: { partner1Id: referencePersonId, partner2Id: null },
      });

      if (existingSingleUnion) {
        await prisma.union.update({
          where: { id: existingSingleUnion.id },
          data: { partner2Id: newPerson.id },
        });
      } else {
        await prisma.union.create({
          data: {
            partner1Id: referencePersonId,
            partner2Id: newPerson.id,
            groupId: targetGroupId,
          },
        });
      }
    }

    // 3. ADD PARENT MODE
    if (relationshipType === 'parent' && referencePersonId) {
      const parentUnion = await prisma.union.create({
        data: {
          partner1Id: newPerson.id,
          groupId: targetGroupId,
        },
      });

      await prisma.person.update({
        where: { id: referencePersonId },
        data: { parentUnionId: parentUnion.id },
      });
    }

    return NextResponse.json({ success: true, person: newPerson });
  } catch (error) {
    console.error('Error creating person:', error);
    return NextResponse.json({ error: 'Failed to create person' }, { status: 500 });
  }
}
