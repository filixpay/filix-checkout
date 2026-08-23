import { NextRequest, NextResponse } from 'next/server';
import { OrderCreateRequest } from '@/types/checkout';
import { requireEnv } from '@/lib/env';
import { getBackendAccessToken } from '@/lib/filixpay';

function validateMerchantOrderId(merchantOrderId: string): boolean {
  if (!merchantOrderId || merchantOrderId.length > 100) return false;
  return /^[0-9a-zA-Z_-]{1,100}$/.test(merchantOrderId);
}

function validateSubject(subject: string): boolean {
  return !!subject && subject.length <= 200;
}

function validateTotalAmount(totalAmount: { amount: number; currency: string }): boolean {
  if (!totalAmount || !totalAmount.amount || !totalAmount.currency) return false;
  return totalAmount.amount > 0;
}

function validateOrderItems(orderItems: any[]): boolean {
  if (!orderItems || orderItems.length < 1 || orderItems.length > 100) return false;
  return orderItems.every((item) => {
    const quantity = item.quantity;
    const unitPrice = item.unitPrice;
    return !isNaN(quantity) && quantity > 0 && !isNaN(unitPrice) && unitPrice > 0;
  });
}

export async function POST(request: NextRequest) {
  try {
    const orderData: OrderCreateRequest = await request.json();

    if (!validateMerchantOrderId(orderData.merchantOrderId)) {
      return NextResponse.json({ code: 'INVALID_PARAMETER', message: 'Invalid merchantOrderId' }, { status: 400 });
    }
    if (!validateSubject(orderData.subject)) {
      return NextResponse.json({ code: 'INVALID_PARAMETER', message: 'Invalid subject' }, { status: 400 });
    }
    if (!validateTotalAmount(orderData.totalAmount)) {
      return NextResponse.json({ code: 'INVALID_PARAMETER', message: 'Invalid totalAmount' }, { status: 400 });
    }
    if (!validateOrderItems(orderData.orderItems)) {
      return NextResponse.json({ code: 'INVALID_PARAMETER', message: 'Invalid orderItems' }, { status: 400 });
    }

    const accessToken = await getBackendAccessToken();

    const protocol = request.nextUrl.protocol;
    const host = request.nextUrl.host;
    const returnUrl = `${protocol}//${host}`;

    const formattedOrderData = {
      ...orderData,
      returnUrl,
      totalAmount: {
        ...orderData.totalAmount,
        amount: Number(orderData.totalAmount.amount),
      },
      orderItems: orderData.orderItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    };

    const filixPayUrl = requireEnv('FILIXPAY_ORDER_URL');
    const res = await fetch(filixPayUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(formattedOrderData),
      cache: 'no-store',
    });

    const responseBody = await res.text();
    if (!res.ok) {
      throw new Error(`Order request failed: ${res.status}`);
    }

    return NextResponse.json(JSON.parse(responseBody));
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to create order' }, { status: 500 });
  }
}
