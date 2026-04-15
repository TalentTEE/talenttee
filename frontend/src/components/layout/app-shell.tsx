'use client';

import { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { AgentStatusProvider } from '@/hooks/AgentStatusProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AgentStatusProvider>
      <div className="min-h-screen flex bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AgentStatusProvider>
  );
}
