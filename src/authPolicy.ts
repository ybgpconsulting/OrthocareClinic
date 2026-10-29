export const ADMIN_PASSWORD_MIN_LENGTH = 15;
export const ADMIN_PASSWORD_MAX_LENGTH = 128;

export function getAdminPasswordPolicyError(password: string): string | null {
  const length = Array.from(password).length;
  if (length < ADMIN_PASSWORD_MIN_LENGTH || length > ADMIN_PASSWORD_MAX_LENGTH) {
    return `Password must be between ${ADMIN_PASSWORD_MIN_LENGTH} and ${ADMIN_PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
}
