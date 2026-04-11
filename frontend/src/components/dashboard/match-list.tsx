'use client';

import { MatchResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function MatchList({ matches, role }: { matches: MatchResult[]; role: 'SEEKER' | 'EMPLOYER' }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Matching {role === 'SEEKER' ? 'Jobs' : 'Candidates'} (Top-{matches.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {matches.map((m, i) => (
          <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
            <div>
              <p className="text-sm font-medium">{i + 1}. {m.jobTitle} - {m.companyName}</p>
              <div className="flex gap-1 mt-1">
                {m.seekerSkills.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                <Badge variant="secondary" className="text-xs">Match {Math.round(m.rerankScore * 100)}%</Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm">Agree</Button>
              <Button size="sm" variant="ghost">Decline</Button>
            </div>
          </div>
        ))}
        {matches.length === 0 && <p className="text-sm text-muted-foreground">No matching results.</p>}
      </CardContent>
    </Card>
  );
}
