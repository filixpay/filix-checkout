import { requireEnv } from '@/lib/env';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export async function getBackendAccessToken(): Promise<string> {
  const tokenUrl = requireEnv('FILIXPAY_TOKEN_URL');
  const clientId = requireEnv('FILIXPAY_BACKEND_CLIENT_ID');
  const clientSecret = requireEnv('FILIXPAY_BACKEND_CLIENT_SECRET');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status}`);
  }

  const result: TokenResponse = await response.json();
  if (!result.access_token) {
    throw new Error('Token request returned no access token');
  }

  return result.access_token;
}

export async function callFilixPayApi(
  path: string,
  method: string = 'GET',
  body?: unknown,
  userToken?: string,
) {
  const baseUrl = requireEnv('BACKEND_API_URL');
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

  const authorizationHeader = userToken
    ? userToken
    : `Bearer ${await getBackendAccessToken()}`;

  const headers: Record<string, string> = {
    accept: 'application/json',
    Authorization: authorizationHeader,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`FilixPay API request failed: ${response.status}`);
  }

  try {
    return JSON.parse(responseBody);
  } catch {
    return responseBody;
  }
}
