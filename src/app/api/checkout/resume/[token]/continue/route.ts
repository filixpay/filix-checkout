import { NextRequest, NextResponse } from 'next/server';
import { getBackendAccessToken } from '@/lib/filixpay';
import { serviceUrl } from '@/lib/env';

/** POST /api/checkout/resume/[token]/continue */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json(
      { code: 'RESUME_TOKEN_INVALID', message: '缺少续跑凭证' },
      { status: 404 },
    );
  }

  try {
    const basePath = serviceUrl('FILIXPAY_RESUME_CONTINUE_URL', '/api/v1/checkout/resume');
    const url = `${basePath}/${encodeURIComponent(token)}/continue`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      accept: 'application/json',
    };

    const userAuthHeader = request.headers.get('Authorization');
    if (userAuthHeader) {
      headers.Authorization = userAuthHeader;
    } else {
      try {
        headers.Authorization = `Bearer ${await getBackendAccessToken()}`;
      } catch {
        // Proceed without Authorization when credentials are unavailable.
      }
    }

    let body = '{}';
    try {
      body = JSON.stringify(await request.json());
    } catch {
      body = '{}';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    console.error('Error continuing resume payment:', error);
    return NextResponse.json({ code: 'ERROR', message: '服务暂时不可用' }, { status: 502 });
  }
}
