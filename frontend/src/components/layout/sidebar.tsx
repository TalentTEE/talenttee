'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { SidebarJobSeekToggle } from './sidebar-job-seek-toggle';
import { SidebarSeekerEarnings } from './sidebar-seeker-earnings';
import { SidebarEscrowBalance } from './sidebar-escrow-balance';

const seekerLinks = [
  { href: '/dashboard/seeker', label: 'Dashboard', icon: 'dashboard', neonColor: '' },
  { href: '/datasource', label: 'My Value', icon: 'diamond', neonColor: '#0891b2' },
  { href: '/negotiations', label: 'Negotiations', icon: 'handshake', neonColor: '#be185d' },
];

const employerLinks = [
  { href: '/dashboard/employer', label: 'Dashboard', icon: 'dashboard', neonColor: '' },
  { href: '/jobs', label: 'Job Postings', icon: 'work', neonColor: '#d97706' },
  { href: '/escrow', label: 'Escrow', icon: 'account_balance', neonColor: '#65a30d' },
  { href: '/negotiations', label: 'Negotiations', icon: 'handshake', neonColor: '#be185d' },
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
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
           'fixed bottom-0 left-0 z-50 w-60 border-r border-sidebar-border bg-sidebar/90 p-4 flex flex-col shadow-[18px_0_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-transform duration-300 ease-in-out overflow-y-auto',
          'top-[57px] lg:top-0 lg:sticky lg:h-screen lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Link href="/" className="flex items-center gap-2 px-3 pt-4 pb-6 hover:opacity-80 transition-opacity">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 shadow-[0_14px_30px_rgba(8,145,178,0.18)]">
            <img src="/icon.svg" alt="TalentTee" className="w-6 h-6" />
          </span>
          <span className="text-xl font-black tracking-tight text-primary font-[var(--font-playfair)]">
            TalentTee<span className="text-[#be185d]">.</span>
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-base transition-[background-color,color,box-shadow] duration-200',
                  isActive
                    ? 'font-bold shadow-sm'
                    : 'text-sidebar-foreground hover:text-foreground hover:bg-white/60'
                )}
                style={isActive && color ? { color, backgroundColor: `color-mix(in srgb, ${color} 12%, white 70%)` } : isActive ? { color: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, white 70%)' } : undefined}
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
        {user?.role === 'EMPLOYER' && <SidebarEscrowBalance />}
        {user?.role === 'SEEKER' && <SidebarSeekerEarnings />}
        {user?.role === 'SEEKER' && <SidebarJobSeekToggle />}
      </aside>
    </>
  );
}
