import { AppShell } from '@/components/layout/app-shell';

export default function DatasourceLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
