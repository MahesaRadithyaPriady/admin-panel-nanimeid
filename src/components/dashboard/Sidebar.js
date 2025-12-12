'use client';

import Link from 'next/link';

export default function Sidebar({ menus, currentPath }) {
  return (
    <aside
      className="border-4 rounded-xl p-3 md:p-4"
      style={{ boxShadow: '8px 8px 0 #000', background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
    >
      <nav className="space-y-2">
        {menus.map((m) => {
          if (m.children) {
            const hasActiveChild = m.children.some(child => currentPath === child.href);

            return (
              <div key={m.key} className="space-y-1">
                <div className="px-3 text-xs font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-2">
                  <m.icon className="size-3 opacity-70" />
                  <span>{m.label}</span>
                </div>

                <div className="ml-4 space-y-1">
                  {m.children.map((child) => {
                    const active = currentPath === child.href;
                    return (
                      <Link
                        key={child.key}
                        href={child.href}
                        className={`w-full flex items-center gap-2 px-3 py-2 border-4 rounded-lg font-extrabold hover:brightness-95 text-sm`}
                        style={{
                          boxShadow: '4px 4px 0 #000',
                          background: active ? '#FFD803' : 'var(--panel-bg)',
                          borderColor: 'var(--panel-border)',
                          color: 'var(--foreground)'
                        }}
                      >
                        <child.icon className="size-3" /> {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const active = currentPath === m.href;
          return (
            <Link
              key={m.key}
              href={m.href}
              className={`w-full flex items-center gap-2 px-3 py-2 border-4 rounded-lg font-extrabold hover:brightness-95`}
              style={{ 
                boxShadow: '4px 4px 0 #000', 
                background: active ? '#FFD803' : 'var(--panel-bg)', 
                borderColor: 'var(--panel-border)', 
                color: 'var(--foreground)' 
              }}
            >
              <m.icon className="size-4" /> {m.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
