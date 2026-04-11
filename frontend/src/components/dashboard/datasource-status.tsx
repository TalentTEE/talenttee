'use client';

import { DataSourceConnection } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const providerLabels: Record<string, string> = { github: 'GitHub', slack: 'Slack', discord: 'Discord', gov24: 'Gov24' };

export function DatasourceStatus({ connections }: { connections: DataSourceConnection[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Data Source Status</CardTitle>
        <Link href="/datasource"><Button variant="outline" size="sm">+ Add Source</Button></Link>
      </CardHeader>
      <CardContent className="flex gap-2 flex-wrap">
        {connections.map((c) => (
          <Badge key={c.id} variant={c.status !== 'DISCONNECTED' ? 'default' : 'secondary'}>
            {providerLabels[c.provider] || c.provider} {c.status !== 'DISCONNECTED' ? '✓' : '✗'}
          </Badge>
        ))}
        {connections.length === 0 && <p className="text-sm text-muted-foreground">No connected data sources.</p>}
      </CardContent>
    </Card>
  );
}
