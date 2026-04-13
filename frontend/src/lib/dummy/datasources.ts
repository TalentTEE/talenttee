import { DataSourceConnection } from '../types';

export const DUMMY_DATASOURCES: DataSourceConnection[] = [
  { id: 'ds-1', userId: 'user-1', provider: 'GITHUB', status: 'CONNECTED', lastSyncedAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-2', userId: 'user-1', provider: 'SLACK', status: 'MOCK', lastSyncedAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-3', userId: 'user-1', provider: 'DISCORD', status: 'MOCK', lastSyncedAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-4', userId: 'user-1', provider: 'GOV24', status: 'MOCK', lastSyncedAt: '2026-04-11T08:00:00Z' },
];
