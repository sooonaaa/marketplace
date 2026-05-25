export function validateNewPassword(password: string): string | null {
  if (password.length < 6 || password.length > 20) {
    return 'От 6 до 20 символов';
  }
  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    return 'Только латинские буквы и цифры';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Нужна минимум одна заглавная буква';
  }
  if (!/[0-9]/.test(password)) {
    return 'Нужна минимум одна цифра';
  }
  return null;
}
