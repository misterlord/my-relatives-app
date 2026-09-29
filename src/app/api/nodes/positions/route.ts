import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// PUT update node positions (batch position save)
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { positions } = await request.json(); // Array of { id, x, y }

    if (!Array.isArray(positions)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Update positions in transaction
    await prisma.$transaction(
      positions.map((p: { id: string; x: number | null; y: number | null }) =>
        prisma.person.update({
          where: { id: p.id },
          data: {
            positionX: p.x !== null ? p.x : null,
            positionY: p.y !== null ? p.y : null,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving positions:', error);
    return NextResponse.json({ error: 'Failed to save node positions' }, { status: 500 });
  }
}

// DELETE reset all node positions (Clear saved positions for Auto Layout)
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.person.updateMany({
      data: {
        positionX: null,
        positionY: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting positions:', error);
    return NextResponse.json({ error: 'Failed to reset positions' }, { status: 500 });
  }
}
