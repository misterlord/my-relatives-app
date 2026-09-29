import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET all persons and marriage unions
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const persons = await prisma.person.findMany({
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
      orderBy: { createdAt: 'asc' },
    });

    const unions = await prisma.union.findMany({
      include: {
        partner1: { select: { id: true, name: true, gender: true } },
        partner2: { select: { id: true, name: true, gender: true } },
        children: { select: { id: true, name: true, gender: true } },
      },
    });

    return NextResponse.json({ persons, unions });
  } catch (error) {
    console.error('Error fetching persons and unions:', error);
    return NextResponse.json({ error: 'Failed to fetch family tree' }, { status: 500 });
  }
}

// POST create new Person Node with relationship setup
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
      relationshipType = 'child', // 'child' | 'spouse' | 'parent' | 'standalone'
      referencePersonId,
      existingUnionId,
    } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อ-นามสกุล บุคคล' }, { status: 400 });
    }

    let targetParentUnionId: string | null = null;

    // 1. ADD CHILD MODE (Default)
    if (relationshipType === 'child') {
      if (existingUnionId) {
        // Option A: Direct union selected
        targetParentUnionId = existingUnionId;
      } else if (referencePersonId) {
        // Option B: Reference person selected -> Find or create their union
        const refPerson = await prisma.person.findUnique({
          where: { id: referencePersonId },
          include: { unionsAsPartner1: true, unionsAsPartner2: true },
        });

        if (refPerson) {
          const firstUnion = refPerson.unionsAsPartner1[0] || refPerson.unionsAsPartner2[0];
          if (firstUnion) {
            targetParentUnionId = firstUnion.id;
          } else {
            // Create a new union for this single parent
            const newUnion = await prisma.union.create({
              data: { partner1Id: refPerson.id },
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
        parentUnionId: targetParentUnionId,
      },
      include: { images: true, parentUnion: true },
    });

    // 2. ADD SPOUSE MODE
    if (relationshipType === 'spouse' && referencePersonId) {
      // Check if reference person is already partner1 in a single union
      const existingSingleUnion = await prisma.union.findFirst({
        where: { partner1Id: referencePersonId, partner2Id: null },
      });

      if (existingSingleUnion) {
        await prisma.union.update({
          where: { id: existingSingleUnion.id },
          data: { partner2Id: newPerson.id },
        });
      } else {
        // Create new marriage union
        await prisma.union.create({
          data: {
            partner1Id: referencePersonId,
            partner2Id: newPerson.id,
          },
        });
      }
    }

    // 3. ADD PARENT MODE
    if (relationshipType === 'parent' && referencePersonId) {
      // Create a union for the new parent and set as parentUnion for referencePerson
      const parentUnion = await prisma.union.create({
        data: {
          partner1Id: newPerson.id,
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
