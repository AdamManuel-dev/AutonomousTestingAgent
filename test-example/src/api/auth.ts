export function authenticate(username: string, password: string): boolean {
  if (!username || !password) {
    return false;
  }
  return username === 'admin' && password === 'secret';
}

export function validateToken(token: string): boolean {
  return token.length > 10;
}

// Modified: 2025-06-18T08:04:22.907Z