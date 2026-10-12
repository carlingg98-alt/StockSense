const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const wholePesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });

export const peso = (value: number) => pesoFormatter.format(value);
export const pesoWhole = (value: number) => wholePesoFormatter.format(value);
export const formatNumber = (value: number) => numberFormatter.format(value);

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// "2026-10-07" -> "Oct 7"
export function formatDayKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// Today as "YYYY-MM-DD" in local time (what <input type="date"> uses)
export function todayInputValue() {
  return toInputDate(new Date().toISOString());
}

// ISO date string -> "YYYY-MM-DD" for a date input ('' when there is no date)
export function toInputDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
