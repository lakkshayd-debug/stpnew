/** Normalises Indian mobile numbers to E.164 (+91XXXXXXXXXX). Returns null when invalid. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const ten =
    digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
    : digits;
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null;
}
