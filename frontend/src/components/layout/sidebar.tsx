'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const seekerLinks = [
  { href: '/dashboard/seeker', label: 'Dashboard' },
  { href: '/datasource', label: 'Data Sources' },
  { href: '/resume', label: 'Resume' },
  { href: '/matching', label: 'Matching' },
];

const employerLinks = [
  { href: '/dashboard/employer', label: 'Dashboard' },
  { href: '/jobs/create', label: 'Create Job' },
  { href: '/escrow', label: 'Escrow' },
  { href: '/matching', label: 'Matching' },
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const links = user?.role === 'SEEKER' ? seekerLinks : employerLinks;

  return (
    <aside className="w-56 border-r min-h-screen p-4">
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'px-3 py-2 rounded-md text-sm hover:bg-accent',
              pathname === link.href && 'bg-accent font-medium'
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
