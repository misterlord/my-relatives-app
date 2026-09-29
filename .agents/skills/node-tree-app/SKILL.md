---
name: my-relatives-app
description: >-
  Best practices and operational procedures for building, maintaining, and managing SQLite-backed family tree and relative diagram applications ("เครือญาติของฉัน") using Next.js, Prisma, and React Flow in Node v24.x.
---

# เครือญาติของฉัน (My Relatives) Management Skill

คู่มือมาตรฐานขั้นตอนการปฏิบัติงานสำหรับการพัฒนาและดูแลรักษาแอปพลิเคชันผังเครือญาติและสายสัมพันธ์ "เครือญาติของฉัน"

## 🎯 Best Practices & Guidelines

### 1. โครงสร้างข้อมูลและสายสัมพันธ์เครือญาติ
- **Adjacency List Structure**: ใช้ `parentId` อ้างอิง `Node.id` ใน Prisma Schema
- **การเพิ่มสมาชิก (Parent vs Child Insertion)**:
  - **Child Node (บุตรหลาน/ลำดับลง - Default)**: ตั้งค่า `parentId` ของสมาชิกใหม่ไปที่สมาชิกอ้างอิง
  - **Parent Node (บุพการี/ลำดับขึ้น)**: แทรกสมาชิกใหม่เป็น Parent ของสมาชิกอ้างอิง

### 2. การจัดการรูปภาพบุคคล (สูงสุด 3 รูปต่อคน)
- ตรวจสอบจำนวนรูปภาพไม่เกิน 3 รูปก่อนอัปโหลดทั้ง Client และ Server

### 3. แผนภูมิแสดงผลด้วย `@xyflow/react` + Dagre
- คำนวณตำแหน่งผังตระกูลแบบ Top-Bottom (TB) อัตโนมัติ

---

## 📋 Verification Checklist

1. **Prisma & DB Sync**: `npx prisma db push && npx prisma db seed`
2. **Node 24 Compatibility**: สภาพแวดล้อม Node v24.x
3. **Build Check**: `npm run build` ผ่านโดยไม่มี error
