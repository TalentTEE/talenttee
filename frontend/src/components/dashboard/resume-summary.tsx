'use client';

import { ResumeProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function ResumeSummary({ resume }: { resume: ResumeProfile | null }) {
  if (!resume) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">My Resume</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">No resume yet.</p>
          <Link href="/resume"><Button size="sm">Generate Resume</Button></Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">My Resume</CardTitle>
        <Badge variant={resume.status === 'COMPLETED' ? 'default' : 'secondary'}>
          {resume.status === 'COMPLETED' ? 'Complete ✓' : resume.status === 'ANALYZING' ? 'Analyzing...' : 'Collecting...'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          {resume.skills.slice(0, 6).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
          {resume.skills.length > 6 && <Badge variant="outline">+{resume.skills.length - 6}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">Experience: {resume.experience.length > 0 ? resume.experience[0].period : '-'}</p>
        <div className="flex gap-2">
          <Link href="/resume"><Button size="sm" variant="outline">View Details</Button></Link>
          <Button size="sm" variant="ghost">Regenerate</Button>
        </div>
      </CardContent>
    </Card>
  );
}
