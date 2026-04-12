'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const seekerLinks = [
  { href: '/dashboard/seeker', label: 'Dashboard', icon: 'dashboard' },
  { href: '/datasource', label: 'Data Sources', icon: 'database' },
  { href: '/resume', label: 'Resume', icon: 'description' },
  { href: '/negotiations', label: 'Negotiations', icon: 'handshake' },
];

const employerLinks = [
  { href: '/dashboard/employer', label: 'Dashboard', icon: 'dashboard' },
  { href: '/jobs/create', label: 'Create Job', icon: 'edit_note' },
  { href: '/escrow', label: 'Escrow', icon: 'account_balance' },
  { href: '/negotiations', label: 'Negotiations', icon: 'handshake' },
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const links = user?.role === 'SEEKER' ? seekerLinks : employerLinks;

  return (
    <aside className="w-56 min-h-[calc(100vh-65px)] bg-[#131313] border-r border-border/10 p-4 flex flex-col">
      <nav className="flex flex-col gap-1 flex-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <span className={cn(
                'material-symbols-outlined text-lg',
                isActive && 'text-primary'
              )} style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-border/10">
        <div className="px-3 py-2 rounded-lg bg-accent/50 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-[11px] text-muted-foreground">NEAR Mainnet</span>
        </div>
      </div>
    </aside>
  );
}
