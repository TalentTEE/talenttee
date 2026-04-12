import { DataSourceConnection } from '../types';

export const DUMMY_DATASOURCES: DataSourceConnection[] = [
  { id: 'ds-1', userId: 'user-1', provider: 'github', status: 'CONNECTED', lastSyncAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-2', userId: 'user-1', provider: 'slack', status: 'MOCK', lastSyncAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-3', userId: 'user-1', provider: 'discord', status: 'MOCK', lastSyncAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-4', userId: 'user-1', provider: 'gov24', status: 'MOCK', lastSyncAt: '2026-04-11T08:00:00Z' },
];
