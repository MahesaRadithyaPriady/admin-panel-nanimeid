'use client';

import Link from 'next/link';

export default function Sidebar({ menus, currentPath }) {
  return (
    <aside
      className="bg-white border-4 border-black rounded-xl p-3 md:p-4"
      style={{ boxShadow: '8px 8px 0 #000' }}
    >
      <nav className="space-y-2">
        {menus.map((m) => {
          const active = currentPath === m.href;
          return (
            <Link
              key={m.key}
              href={m.href}
              className={`w-full flex items-center gap-2 px-3 py-2 border-4 border-black rounded-lg font-extrabold ${active ? 'bg-[#FFD803]' : 'bg-[#E2E8F0] hover:bg-[#CBD5E1]'}`}
              style={{ boxShadow: '4px 4px 0 #000' }}
            >
              <m.icon className="size-4" /> {m.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
