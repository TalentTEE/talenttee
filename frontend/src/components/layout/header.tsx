'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) return null;

  return (
    <header className="border-b px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-lg">NEAR AI Career Agent</h2>
        <Badge variant={user.role === 'SEEKER' ? 'default' : 'secondary'}>
          {user.role === 'SEEKER' ? 'Seeker' : 'Employer'}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user.nearAccountId}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
      </div>
    </header>
  );
}
