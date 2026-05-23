import { TickerBar } from '@/components/layout/ticker-bar';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TickerBar />
    </>
  );
}
