'use client';

import { EscrowAccount } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function EscrowBalance({ escrow }: { escrow: EscrowAccount | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Escrow Balance</CardTitle>
        <Link href="/escrow"><Button size="sm" variant="outline">Deposit More</Button></Link>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{escrow?.balance ?? 0} NEAR</p>
      </CardContent>
    </Card>
  );
}
