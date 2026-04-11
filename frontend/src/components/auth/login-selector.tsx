'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginSelector() {
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (role: 'SEEKER' | 'EMPLOYER') => {
    await login(role);
    router.push(role === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-4xl font-bold">NEAR AI Career Agent</h1>
      <p className="text-muted-foreground">AI agents negotiate job offers on your behalf</p>
      <div className="flex gap-4">
        <Card className="w-64 cursor-pointer hover:border-primary transition-colors" onClick={() => handleLogin('SEEKER')}>
          <CardHeader>
            <CardTitle>Alice (Seeker)</CardTitle>
            <CardDescription>alice.testnet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Login as Seeker</Button>
          </CardContent>
        </Card>
        <Card className="w-64 cursor-pointer hover:border-primary transition-colors" onClick={() => handleLogin('EMPLOYER')}>
          <CardHeader>
            <CardTitle>Bob (Employer)</CardTitle>
            <CardDescription>bob.testnet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Login as Employer</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
