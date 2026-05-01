export function toTitleCase(value) {
  if (!value) return '-';

  return String(value)
    .toLowerCase()
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}
