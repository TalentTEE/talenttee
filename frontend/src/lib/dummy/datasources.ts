import { DataSourceConnection } from '../types';

const STORAGE_KEY = 'dummy_datasources';

/** Initial state: no sources connected (demo starts fresh) */
export const DUMMY_DATASOURCES: DataSourceConnection[] = [];

/** Read persisted connections from localStorage (for dummy mode) */
export function getDummyDatasources(): DataSourceConnection[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/** Persist a new connection to localStorage (for dummy mode) */
export function addDummyDatasource(conn: DataSourceConnection): void {
  const current = getDummyDatasources();
  const existing = current.findIndex((c) => c.provider === conn.provider);
  if (existing >= 0) {
    current[existing] = conn;
  } else {
    current.push(conn);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
