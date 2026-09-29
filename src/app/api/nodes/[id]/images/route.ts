import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface Context {
  params: Promise<{ id: string }>;
}

// POST upload image(s) to a person (Max 3 images per person limit)
export async function POST(request: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!person) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลบุคคล' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์รูปภาพอย่างน้อย 1 ไฟล์' }, { status: 400 });
    }

    // ENFORCE MAX 3 IMAGES PER PERSON LIMIT
    const existingCount = person.images.length;
    if (existingCount + files.length > 3) {
      return NextResponse.json(
        {
          error: `รูปภาพเกินโควต้า! แต่ละบุคคลสามารถมีรูปภาพได้ไม่เกิน 3 รูป (ปัจจุบันมี ${existingCount} รูป, พยายามเพิ่มอีก ${files.length} รูป)`,
        },
        { status: 400 }
      );
    }

    const createdImages = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `ไฟล์ "${file.name}" ไม่ใช่รูปภาพที่ถูกต้อง` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name) || '.jpg';
      const filename = `person_${id}_${crypto.randomBytes(6).toString('hex')}${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const filePath = path.join(uploadDir, filename);

      await writeFile(filePath, buffer);

      const imageUrl = `/uploads/${filename}`;

      const newImage = await prisma.nodeImage.create({
        data: {
          personId: id,
          url: imageUrl,
        },
      });

      createdImages.push(newImage);
    }

    return NextResponse.json({
      success: true,
      images: createdImages,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

// DELETE an image from a person
export async function DELETE(request: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { imageId } = await request.json();

    if (!imageId) {
      return NextResponse.json({ error: 'กรุณาระบุ imageId' }, { status: 400 });
    }

    const image = await prisma.nodeImage.findFirst({
      where: { id: imageId, personId: id },
    });

    if (!image) {
      return NextResponse.json({ error: 'ไม่พบรูปภาพนี้ในบุคคลดังกล่าว' }, { status: 404 });
    }

    if (image.url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', image.url);
      try {
        await unlink(filePath);
      } catch {
        // ignore
      }
    }

    await prisma.nodeImage.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
