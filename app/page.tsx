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
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1 mt-16 basis-0">
        <Map />
      </div>
      <Footer />
    </main>
  );
}