export const inr = (n) =>
  '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// local YYYY-MM-DD (restaurant timezone = device timezone in India)
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const shiftDay = (day, n) => {
  const d = new Date(day + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fmtDay = (day) => {
  if (!day) return '';
  const d = new Date(day + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const fmtDayLong = (day) => {
  if (!day) return '';
  const d = new Date(day + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

// Labels (portions, payment methods, expense categories) live in src/i18n.js
// and are rendered via the useLang() hook so the whole UI can switch languages.
