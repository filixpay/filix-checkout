import { NextRequest, NextResponse } from 'next/server';
import { requireEnv } from '@/lib/env';
import { getBackendAccessToken } from '@/lib/filixpay';

export async function GET(request: NextRequest, { params }: { params: Promise<{ merchantOrderId: string }> }) {
  const resolvedParams = await params;
  const { merchantOrderId } = resolvedParams;

  if (!merchantOrderId) {
    return NextResponse.json({ code: 'INVALID_PARAMS', message: '缺少商户订单号' }, { status: 400 });
  }

  try {
    const accessToken = await getBackendAccessToken();
    const filixPayUrl = requireEnv('FILIXPAY_ORDER_URL');
    const paymentTokenUrl = `${filixPayUrl}/${merchantOrderId}/payment-token`;

    const response = await fetch(paymentTokenUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(`Payment token request failed: ${response.status}`);
    }

    const result = JSON.parse(responseBody);
    if (!result.data) throw new Error('Payment token request returned no data');

    return NextResponse.json({
      success: true,
      code: 'SUCCESS',
      message: '支付令牌获取成功',
      data: result.data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting payment token:', error);
    return NextResponse.json(
      {
        success: false,
        code: 'ERROR',
        message: '获取支付令牌失败',
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}
