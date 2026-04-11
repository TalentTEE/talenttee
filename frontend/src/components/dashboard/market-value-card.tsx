'use client';

import { ResumeProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatSalary(val: number): string {
  return `${(val / 10000).toLocaleString()}M KRW`;
}

export function MarketValueCard({ resume }: { resume: ResumeProfile | null }) {
  if (!resume || !resume.marketValueMin) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Market Value</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-lg font-semibold">
          Fair Salary: {formatSalary(resume.marketValueMin)} ~ {formatSalary(resume.marketValueMax!)}
        </p>
        {resume.negotiationPoints && (
          <p className="text-sm text-muted-foreground">
            Strengths: {resume.negotiationPoints.strengths.join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
