'use client';

import { NegotiationSession } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function NegotiationList({ sessions }: { sessions: NegotiationSession[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Active Negotiations</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0">
            <div>
              <p className="text-sm font-medium">Session {s.id}</p>
              <Badge variant={s.state === 'AGREED' ? 'default' : 'secondary'}>
                {s.state === 'AGREED' ? 'Agreed ✓' : `Round ${s.currentRound}/${s.maxRounds} in progress`}
              </Badge>
            </div>
            <Link href={s.state === 'AGREED' ? `/negotiation/${s.id}/agree` : `/negotiation/${s.id}`}>
              <Button size="sm" variant="outline">
                {s.state === 'AGREED' ? 'View Result' : 'Monitor'}
              </Button>
            </Link>
          </div>
        ))}
        {sessions.length === 0 && <p className="text-sm text-muted-foreground">No active negotiations.</p>}
      </CardContent>
    </Card>
  );
}
