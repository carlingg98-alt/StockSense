const DAY_MS = 24 * 60 * 60 * 1000;

// Midnight at the start of the given day (server local time).
function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// The start of the day that was `days` days ago. daysAgo(0) is today.
function daysAgo(days, from = new Date()) {
  return new Date(startOfDay(from).getTime() - days * DAY_MS);
}

// "2026-10-07" style key, used to group transactions per day.
function dayKey(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// REQUIREMENT [Data Processing and Business Logic]: date logic - days until a date; negative means it has already passed (used for expiry).
// Whole days from today until `date`. Negative when the date has passed.
function daysUntil(date, from = new Date()) {
  return Math.round((startOfDay(date).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

// REQUIREMENT [Core Req 2 - REST API]: validates numeric query parameters and keeps them inside a safe range.
// Read a whole number from the query string and keep it inside [min, max].
function clampInt(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

module.exports = { DAY_MS, startOfDay, daysAgo, dayKey, daysUntil, clampInt };
