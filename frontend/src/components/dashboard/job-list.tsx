'use client';

import { JobPosting } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function JobList({ jobs }: { jobs: JobPosting[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">My Job Postings</CardTitle>
        <Link href="/jobs/create"><Button size="sm">+ New Posting</Button></Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.map((j) => (
          <div key={j.id} className="flex items-center justify-between border-b pb-2 last:border-0">
            <div>
              <p className="text-sm font-medium">{j.title}</p>
              <Badge variant={j.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">{j.status}</Badge>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline">Edit</Button>
              <Button size="sm" variant="ghost">Close</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
