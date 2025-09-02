'use client';

import { LogOut, Shield } from 'lucide-react';

export default function Header({ user, role, onLogout }) {
  return (
    <header className="max-w-5xl mx-auto flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center size-10 bg-[#9AE6B4] border-4 border-black rounded-md"
          style={{ boxShadow: '4px 4px 0 #000' }}
        >
          <Shield className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Dashboard NanimeID</h1>
          <div className="text-xs font-semibold opacity-70">{user?.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="px-2 py-1 border-4 border-black rounded-md bg-white text-xs font-extrabold" style={{ boxShadow: '3px 3px 0 #000' }}>
          {role}
        </span>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-[#FFD803] hover:bg-[#F1C40F] border-4 border-black rounded-md px-3 py-2 font-extrabold"
          style={{ boxShadow: '4px 4px 0 #000' }}
        >
          <LogOut className="size-4" /> Keluar
        </button>
      </div>
    </header>
  );
}
