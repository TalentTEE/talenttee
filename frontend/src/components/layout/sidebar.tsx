'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useAgentStatusContext } from '@/hooks/AgentStatusProvider';
import { AgentActivityStream } from './AgentActivityStream';

const seekerLinks = [
  { href: '/dashboard/seeker', label: 'Dashboard', icon: 'dashboard', neonColor: '' },
  { href: '/datasource', label: 'Data Sources', icon: 'database', neonColor: '#00F0FF' },
  { href: '/resume', label: 'Resume', icon: 'description', neonColor: '#BF5AF2' },
  { href: '/negotiations', label: 'Negotiations', icon: 'handshake', neonColor: '#FF2DF1' },
];

const employerLinks = [
  { href: '/dashboard/employer', label: 'Dashboard', icon: 'dashboard', neonColor: '' },
  { href: '/jobs/create', label: 'Create Job', icon: 'edit_note', neonColor: '#FFE600' },
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
  const agentStatus = useAgentStatusContext();
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
          'fixed top-[65px] left-0 z-50 h-[calc(100vh-65px)] w-56 bg-sidebar border-r border-border/10 p-4 flex flex-col transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
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
        <AgentActivityStream activities={agentStatus.activities} />
      </aside>
    </>
  );
}
