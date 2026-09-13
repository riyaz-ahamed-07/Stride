export type PasswordRule = { id: string; label: string; ok: boolean };

export function passwordRules(password: string): PasswordRule[] {
  return [
    { id: "len", label: "At least 8 characters", ok: password.length >= 8 },
    { id: "upper", label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { id: "num", label: "One number", ok: /[0-9]/.test(password) },
    { id: "sym", label: "One symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function passwordValid(password: string): boolean {
  return passwordRules(password).every((r) => r.ok);
}
