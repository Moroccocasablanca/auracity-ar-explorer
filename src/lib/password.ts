// Strong-password policy shared by the sign-up form (leaked passwords are also rejected by the auth server).
export const PASSWORD_RULES = [
  { key: "len", test: (p: string) => p.length >= 10 },
  { key: "upper", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", test: (p: string) => /[a-z]/.test(p) },
  { key: "digit", test: (p: string) => /\d/.test(p) },
  { key: "symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export type PasswordRule = (typeof PASSWORD_RULES)[number]["key"];

export function isStrongPassword(p: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(p));
}
