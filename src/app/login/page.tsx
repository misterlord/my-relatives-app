'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Lock, User, AlertCircle, Info } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 shadow-xl shadow-indigo-500/10">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            เครือญาติของฉัน
          </h1>
          <p className="text-sm text-slate-400">
            เข้าสู่ระบบเพื่อจัดการและแสดงผลผังเครือญาติและสายสัมพันธ์
          </p>
        </div>

        {/* Credentials Info Callout */}
        <div className="flex items-start gap-3 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 p-4 text-xs text-indigo-200">
          <Info className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-indigo-300">รหัสผ่านเริ่มต้นสำหรับเข้าใช้งาน:</p>
            <p>
              Username: <code className="bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-100 font-mono">admin</code> |
              Password: <code className="bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-100 font-mono">admin1234</code>
            </p>
          </div>
        </div>

        {/* Login Card Form */}
        <form onSubmit={handleLogin} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all disabled:opacity-50"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
