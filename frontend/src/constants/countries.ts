export const COUNTRIES = [
  { code: 'NO', flag: '\u{1F1F3}\u{1F1F4}', name: 'Norway' },
  { code: 'SE', flag: '\u{1F1F8}\u{1F1EA}', name: 'Sweden' },
  { code: 'DK', flag: '\u{1F1E9}\u{1F1F0}', name: 'Denmark' },
  { code: 'FI', flag: '\u{1F1EB}\u{1F1EE}', name: 'Finland' },
  { code: 'GB-ENG', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', name: 'England' },
  { code: 'GB-SCT', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}', name: 'Scotland' },
  { code: 'IE', flag: '\u{1F1EE}\u{1F1EA}', name: 'Ireland' },
  { code: 'GB-WLS', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}', name: 'Wales' },
  { code: 'DE', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany' },
  { code: 'NL', flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands' },
  { code: 'BE', flag: '\u{1F1E7}\u{1F1EA}', name: 'Belgium' },
  { code: 'FR', flag: '\u{1F1EB}\u{1F1F7}', name: 'France' },
  { code: 'ES', flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain' },
  { code: 'IT', flag: '\u{1F1EE}\u{1F1F9}', name: 'Italy' },
  { code: 'PT', flag: '\u{1F1F5}\u{1F1F9}', name: 'Portugal' },
] as const;

export function getFlagForCode(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.flag || '';
}
