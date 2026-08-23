export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function apiBaseUrl(): string {
  return (
    process.env.FILIXPAY_API_BASE_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    (() => {
      throw new Error('Missing required environment variable: FILIXPAY_API_BASE_URL or BACKEND_API_URL');
    })()
  );
}

export function backendApiUrl(): string {
  return process.env.BACKEND_API_URL?.trim() || apiBaseUrl();
}

export function serviceUrl(pathEnv: string, pathFallback: string): string {
  const path = process.env[pathEnv]?.trim() || pathFallback;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${backendApiUrl()}${path}`;
}
