const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_NAME_KEY = 'user_name';

export function saveAuth(access: string, refresh: string, name: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(USER_NAME_KEY, name);
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_NAME_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function hasStoredAuth(): boolean {
  return !!getAccessToken();
}
