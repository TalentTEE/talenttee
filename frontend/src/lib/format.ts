/** Format a numeric salary/money value as USD */
export function formatSalary(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

/** Format nullable currency value as USD */
export function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return `$${value.toLocaleString()}`;
}
