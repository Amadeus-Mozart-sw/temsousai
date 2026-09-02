import './globals.css';

export const metadata = {
  title: '天爽祭 投票入力',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
