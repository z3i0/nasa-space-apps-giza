export function normalizePhone(value: string): string {
  return value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\s()-]/g, '');
}

export const phonePattern = /^\+?[0-9]{7,15}$/;
