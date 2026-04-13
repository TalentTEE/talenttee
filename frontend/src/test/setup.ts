import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock('next/link', () => {
  const { createElement } = require('react');
  return {
    default: (props: Record<string, unknown>) => {
      const { children, href, ...rest } = props;
      return createElement('a', { href, ...rest }, children);
    },
  };
});
