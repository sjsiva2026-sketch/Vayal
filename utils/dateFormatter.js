// Safe date formatter — no external dependency needed for basic operations.
// date-fns is still used for formatDate/formatDateTime, but todayString
// is plain JS so it never throws if date-fns has a parse issue.

import { format, isToday, isYesterday, parseISO } from 'date-fns';

export const formatDate = (date) => {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isToday(d))     return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd MMM yyyy');
  } catch {
    return String(date);
  }
};

export const formatDateTime = (date) => {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return String(date);
  }
};

// Returns today as 'YYYY-MM-DD' — used everywhere as a Firestore key.
export const todayString = () => {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
