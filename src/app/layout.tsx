import type { Metadata } from 'next';
import Providers from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: '安全支付 | FilixPay Secure Checkout',
  description: 'FilixPay 安全支付页面',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
