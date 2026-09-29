import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'เครือญาติของฉัน - ผังสายสัมพันธ์ตระกูล',
  description: 'ระบบสร้างและแสดงผลแผนภูมิผังสายสัมพันธ์เครือญาติ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
