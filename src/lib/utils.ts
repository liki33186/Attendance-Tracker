import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getAttendancePercentage(records: any[]): number {
  if (records.length === 0) return 0;
  const present = records.filter(r => r.status === 'present').length;
  return Math.round((present / records.length) * 100);
}
