import { AppShell } from '@/components/layout/app-shell';

export default function MatchingLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
