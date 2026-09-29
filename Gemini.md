# Gemini Project Guidelines: เครือญาติของฉัน (My Relatives - Node Diagram)

## 📌 Project Overview
โปรเจกต์นี้คือเว็บแอปพลิเคชัน **"เครือญาติของฉัน" (My Relatives Visualizer)** สำหรับสร้าง แสดงผล และจัดการผังเครือญาติและสายสัมพันธ์ในรูปแบบแผนภูมิ Node Tree สร้างด้วย **Next.js** และ **SQLite (ผ่าน Prisma)** รองรับการกำหนด Parent/Child Node และการแนบรูปภาพประกอบสมาชิกสูงสุด 3 รูปต่อคน

---

## 🛠️ Technical Stack & Environment

- **Node.js**: `v24.x`
- **Framework**: Next.js (App Router, TypeScript, React)
- **Database & ORM**: SQLite (`prisma/dev.db`) + Prisma ORM
- **Authentication**: Custom Session Auth กับ Prisma (Single Role access level)
- **Styling & UI**: Tailwind CSS, Lucide React Icons
- **Node Diagram Renderer**: `@xyflow/react` (React Flow) + Dagre (Tree layout engine)
- **File Storage**: Local uploads เก็บใน `public/uploads/` (สูงสุด 3 รูปต่อ Node)

---

## 🔑 Default Credentials & Auth Rules

- **Default User**: Username `admin`, Password `admin1234`
- **Role Model**: Single permission level (ผู้ใช้ที่เข้าสู่ระบบสามารถจัดการผังเครือญาติได้ทั้งหมด)

---

## 🌳 Core Functional Requirements

1. **การจัดการผังเครือญาติและสายสัมพันธ์**:
   - เพิ่มสมาชิก/โหนดใหม่โดยอ้างอิงกับสมาชิกคนใดก็ได้ในผัง
   - เลือกตำแหน่งได้: **Parent Node (บุพการี/ลำดับขึ้น)** หรือ **Child Node (บุตรหลาน/ลำดับลง)** (Default: `Child Node`).
2. **คุณสมบัติประจำตัวสมาชิก (Node Attributes)**:
   - ชื่อ-นามสกุล / ชื่อกำกับ (Required)
   - รายละเอียดประวัติ / คำอธิบายเพิ่มเติม (Optional)
   - รูปภาพประกอบ: สูงสุด 3 รูปต่อ 1 สมาชิก
3. **การแสดงผลแผนภูมิเครือญาติ (Interactive Tree Visualization)**:
   - แสดงผังเครือญาติที่สวยงาม ดูง่าย และเข้าใจได้ง่าย
   - แสดงชื่อกำกับที่ Node แต่ละตัว
   - คลิกที่ Node เพื่อแก้ไข ดูรายละเอียด หรือจัดการสมาชิกในตระกูล

---

## ⚠️ Important Rules for AI Development

1. **Database Integrity**: ควบคุมความสัมพันธ์บิดามารดา-บุตรหลาน ไม่ให้เกิด วงวนซ้ำ (Circular Reference)
2. **Node 24 Compatibility**: ใช้งานร่วมกับ Node 24.x ESM/CJS packages
3. **Image Limit Enforcement**: ตรวจสอบจำนวนรูปภาพไม่เกิน 3 รูปทั้งฝั่ง Client และ Server
