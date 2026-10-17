import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Travel OS — 해외 여행 올인원 모바일 웹앱',
  description: '해외 여행 중 지도, 상황별 텍스트 번역, 실시간 환율 계산을 하나의 모바일 화면에서 끊김 없이 제공하는 여행 OS',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Travel OS',
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-slate-950 text-slate-100`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-x-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
