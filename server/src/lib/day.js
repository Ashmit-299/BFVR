// IST (Asia/Kolkata) day/hour helpers — the restaurant's timezone is fixed at UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istParts(date = new Date()) {
  const d = new Date(date.getTime() + IST_OFFSET_MS);
  const iso = d.toISOString();
  return {
    day: iso.slice(0, 10),
    hour: Number(iso.slice(11, 13)),
    month: iso.slice(0, 7),
    year: Number(iso.slice(0, 4)),
  };
}

export function dayKey(date = new Date()) {
  return istParts(date).day;
}

export function hourKey(date = new Date()) {
  return istParts(date).hour;
}

// "YYYY-MM-DD" +/- n days
export function addDays(day, n) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// inclusive list of day keys from -> to
export function dayRange(from, to) {
  const out = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard++ < 4000) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isValidDay(day) {
  return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day);
}
