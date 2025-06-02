"use client";

import Image from 'next/image';
import Link from 'next/link';
import { PawPrint } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="top-0 w-full bg-white/80 backdrop-blur-sm z-50 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/IMG_0038.png"
                alt="Firulaix"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/report"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/90] transition-colors"
            >
              <PawPrint className="w-4 h-4 mr-2" />
              Report Animal
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}