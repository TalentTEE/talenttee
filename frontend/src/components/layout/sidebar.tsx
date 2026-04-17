'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { SidebarJobSeekToggle } from './sidebar-job-seek-toggle';

const seekerLinks = [
  { href: '/dashboard/seeker', label: 'Dashboard', icon: 'dashboard', neonColor: '' },
  { href: '/datasource', label: 'My Value', icon: 'diamond', neonColor: '#00F0FF' },
  { href: '/negotiations', label: 'Negotiations', icon: 'handshake', neonColor: '#FF2DF1' },
];

const employerLinks = [
  { href: '/dashboard/employer', label: 'Dashboard', icon: 'dashboard', neonColor: '' },
  { href: '/jobs', label: 'Job Postings', icon: 'work', neonColor: '#FFE600' },
  { href: '/escrow', label: 'Escrow', icon: 'account_balance', neonColor: '#39FF14' },
  { href: '/negotiations', label: 'Negotiations', icon: 'handshake', neonColor: '#FF2DF1' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const links = user?.role === 'SEEKER' ? seekerLinks : employerLinks;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed bottom-0 left-0 z-50 w-56 bg-sidebar border-r border-border/10 p-4 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto',
          'top-[57px] lg:top-0 lg:sticky lg:h-screen lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Link href="/" className="flex items-center gap-2 px-3 pt-4 pb-6 hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-2xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          <span className="text-lg font-extrabold tracking-tighter text-primary uppercase font-[var(--font-manrope)]">
            Talent-Tee
          </span>
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const color = link.neonColor || undefined;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-base transition-all duration-200',
                  isActive
                    ? 'font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
                style={isActive && color ? { color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` } : isActive ? { color: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' } : undefined}
              >
                <span className={cn(
                  'material-symbols-outlined text-lg',
                )} style={isActive ? { fontVariationSettings: "'FILL' 1", color: color || 'var(--color-primary)' } : undefined}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        {user?.role === 'SEEKER' && <SidebarJobSeekToggle />}
      </aside>
    </>
  );
}
