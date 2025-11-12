const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '/catalog';

export function api(path: string) {
  if (!path.startsWith('/')) path = '/' + path;
  return `${BASE}${path}`;
}

export function bp(path: string) {
  if (!path.startsWith('/')) path = '/' + path;
  return `${BASE}${path}`;
}
