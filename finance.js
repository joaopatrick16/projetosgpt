export const monthOf = date => date.slice(0, 7);
export function amountToCents(value) {
  const cleaned = value.trim().replace(/\s/g, '');
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(cleaned)) return null;
  const amount = Math.round(Number(cleaned.replace(',', '.')) * 100);
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 1e12 ? amount : null;
}
export function expensesForMonth(entries, month) {
  return entries.filter(e => monthOf(e.date) === month || (e.recurring && monthOf(e.date) < month));
}
export function totals(entries, month) {
  const selected = expensesForMonth(entries, month);
  const fixed = selected.filter(e => e.type === 'fixed').reduce((s, e) => s + e.cents, 0);
  const variable = selected.filter(e => e.type === 'variable').reduce((s, e) => s + e.cents, 0);
  return {fixed, variable, total: fixed + variable};
}
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
export function validEntries(entries) {
  return Array.isArray(entries) && entries.length <= 100000 && new Set(entries.map(e => e?.id)).size === entries.length && entries.every(e => e && typeof e.id === 'string' && e.id.length > 0 && typeof e.description === 'string' && e.description.trim().length > 0 && e.description.length <= 80 && Number.isSafeInteger(e.cents) && e.cents > 0 && e.cents <= 1e12 && typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && !isNaN(Date.parse(e.date)) && new Date(e.date).toISOString().slice(0,10) === e.date && ['fixed','variable'].includes(e.type) && typeof e.category === 'string' && e.category.length > 0 && e.category.length <= 80 && typeof e.recurring === 'boolean' && (!e.recurring || e.type === 'fixed'));
}
