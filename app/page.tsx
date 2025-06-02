"use client";

import dynamic from 'next/dynamic';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

const Map = dynamic(
  () => import('@/components/map'),
  {
    loading: () => <div className="w-full h-full bg-muted animate-pulse" />,
    ssr: false
  }
);

export default function Home() {
  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr_auto]">
      <Navbar />
      <div className="h-full">
        <Map />
      </div>
      <Footer />
    </main>
  );
}