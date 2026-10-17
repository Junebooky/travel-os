'use client';

import { TravelProvider } from '@/context/TravelContext';
import TravelApp from '@/components/TravelApp';

export default function Home() {
  return (
    <TravelProvider>
      <TravelApp />
    </TravelProvider>
  );
}
