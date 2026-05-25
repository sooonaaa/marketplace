const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_NAME_KEY = 'user_name';
const USER_ROLE_KEY = 'user_role';

export function saveAuth(access: string, refresh: string, name: string, role = 'user'): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(USER_NAME_KEY, name);
  localStorage.setItem(USER_ROLE_KEY, role);
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getUserRole(): string {
  return localStorage.getItem(USER_ROLE_KEY) || 'user';
}

export function hasStoredAuth(): boolean {
  return !!getAccessToken();
}

export function isSellerRole(): boolean {
  return getUserRole() === 'seller';
}
