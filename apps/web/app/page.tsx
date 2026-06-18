'use client';

// Home responsiva: mobile = feed Kite Life Mobile; desktop = layout web (Busca).
// As duas compartilham dados/filtros via useBrowse; a troca é por CSS (breakpoint).
import { useBrowse } from '../lib/useBrowse';
import { HomeMobile } from '../components/HomeMobile';
import { HomeDesktop } from '../components/HomeDesktop';

export default function Home() {
  const b = useBrowse();
  return (
    <>
      <div className="only-mobile">
        <HomeMobile b={b} />
      </div>
      <div className="only-desktop">
        <HomeDesktop b={b} />
      </div>
    </>
  );
}
