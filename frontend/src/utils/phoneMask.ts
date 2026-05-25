export function formatRuPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);
  if (digits.length <= 1) return '+7';
  let result = '+7 (';
  const local = digits.slice(1);
  if (local.length > 0) result += local.slice(0, 3);
  if (local.length >= 3) result += ') ' + local.slice(3, 6);
  if (local.length >= 6) result += '-' + local.slice(6, 8);
  if (local.length >= 8) result += '-' + local.slice(8, 10);
  return result;
}

export function isPhoneComplete(masked: string): boolean {
  return masked.length === 18;
}
