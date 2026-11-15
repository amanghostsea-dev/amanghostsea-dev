'use client';

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  Suspense 
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { BookLoadingAnimation } from './BookLoadingAnimation';

interface GlobalLoadingContextType {
  isLoading: boolean;
  loadingText: string;
  startLoading: (customText?: string) => void;
  stopLoading: () => void;
  withLoading: <T>(promise: Promise<T>, customText?: string) => Promise<T>;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType>({
  isLoading: false,
  loadingText: 'Memproses...',
  startLoading: () => {},
  stopLoading: () => {},
  withLoading: (p) => p,
});

export const useGlobalLoading = () => useContext(GlobalLoadingContext);

/**
 * 🛰️ NavigationWatcher
 * Mendeteksi perpindahan rute dan parameter URL secara aman dengan Suspense
 */
function NavigationWatcher({ onNavigateComplete }: { onNavigateComplete: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onNavigateComplete();
  }, [pathname, searchParams, onNavigateComplete]);

  return null;
}

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Memproses...');
  const [progress, setProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [showFloatingPill, setShowFloatingPill] = useState(false);

  const activeRequestsRef = useRef(0);
  const pillTimerRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const manualLoadingCounterRef = useRef(0);
  const pillShownAtRef = useRef<number>(0);

  // Start progress bar animation (Neon Top Laser)
  const startProgressBar = useCallback(() => {
    setShowProgressBar(true);
    setProgress(20);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) return prev + Math.floor(Math.random() * 8) + 4;
        if (prev < 82) return prev + Math.floor(Math.random() * 4) + 1;
        if (prev < 94) return prev + 0.5;
        return prev;
      });
    }, 120);
  }, []);

  // Complete and hide progress bar
  const completeProgressBar = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setProgress(100);
    setTimeout(() => {
      setShowProgressBar(false);
      setTimeout(() => setProgress(0), 180);
    }, 200);
  }, []);

  // 🎯 Tampilkan Book Loading HANYA jika server benar-benar memakan waktu (> 450ms)
  // Ini mencegah kedipan layar (flicker) untuk proses ringan/instan
  const scheduleFloatingPill = useCallback((text?: string) => {
    if (text) setLoadingText(text);

    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);

    pillTimerRef.current = setTimeout(() => {
      pillShownAtRef.current = Date.now();
      setShowFloatingPill(true);
      setIsLoading(true);

      // Failsafe: Jika proses menggantung lebih dari 6 detik, otomatis tutup agar halaman tidak freeze
      failsafeTimerRef.current = setTimeout(() => {
        setShowFloatingPill(false);
        setIsLoading(false);
        completeProgressBar();
        activeRequestsRef.current = 0;
      }, 6000);
    }, 450);
  }, [completeProgressBar]);

  // 🛡️ Dismiss loading secara mulus
  const dismissFloatingPill = useCallback(() => {
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);

    const now = Date.now();
    const visibleDuration = pillShownAtRef.current > 0 ? now - pillShownAtRef.current : 0;
    // Jika animasi sempat muncul, beri durasi minimal 300ms agar transisinya rapi
    const minWait = pillShownAtRef.current > 0 && visibleDuration < 300 ? 300 - visibleDuration : 0;

    setTimeout(() => {
      setShowFloatingPill(false);
      setIsLoading(false);
      pillShownAtRef.current = 0;
    }, minWait);
  }, []);

  // Programmatic API
  const startLoading = useCallback((customText?: string) => {
    manualLoadingCounterRef.current++;
    startProgressBar();
    scheduleFloatingPill(customText || 'Memproses permintaan...');
  }, [startProgressBar, scheduleFloatingPill]);

  const stopLoading = useCallback(() => {
    manualLoadingCounterRef.current = Math.max(0, manualLoadingCounterRef.current - 1);
    if (manualLoadingCounterRef.current === 0 && activeRequestsRef.current === 0) {
      completeProgressBar();
      dismissFloatingPill();
    }
  }, [completeProgressBar, dismissFloatingPill]);

  const withLoading = useCallback(async <T,>(promise: Promise<T>, customText?: string): Promise<T> => {
    startLoading(customText);
    try {
      return await promise;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  // Hook into navigation changes
  const handleNavigationComplete = useCallback(() => {
    completeProgressBar();
    dismissFloatingPill();
  }, [completeProgressBar, dismissFloatingPill]);

  // Global Network & Form Mutation Interceptor
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Transparently wrap window.fetch untuk Server Action & API mutations (POST/PUT/DELETE)
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const firstArg = args[0];
      const secondArg = args[1];
      const url = typeof firstArg === 'string' ? firstArg : (firstArg as any)?.url || '';
      const method = (secondArg?.method || (firstArg as any)?.method || 'GET').toUpperCase();

      // Abaikan request background diam-diam (healthcheck, lookup identity siswa realtime, prefetch Next.js)
      const isSilentQuery = 
        url.includes('/api/health') || 
        url.includes('silent=true') || 
        url.includes('lookupStudentIdentity') ||
        url.includes('_next/static');

      const isMutation = !isSilentQuery && method !== 'GET';

      if (isMutation) {
        activeRequestsRef.current++;
        startProgressBar();
        scheduleFloatingPill('Memproses data ke server...');
      }

      try {
        return await originalFetch.apply(window, args);
      } finally {
        if (isMutation) {
          activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
          if (activeRequestsRef.current === 0 && manualLoadingCounterRef.current === 0) {
            completeProgressBar();
            dismissFloatingPill();
          }
        }
      }
    };

    // 2. Intercept Real Link Navigation (Klik tautan <a href="/...">)
    const handleNavigationLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      // Hanya tangani link internal halaman baru
      if (
        href && 
        !href.startsWith('#') && 
        !href.startsWith('http') && 
        !href.startsWith('mailto:') && 
        !href.startsWith('tel:') &&
        !anchor.getAttribute('target')
      ) {
        startProgressBar();
        // Tampilkan book loader hanya jika loading halaman baru memakan waktu > 450ms
        scheduleFloatingPill('Memuat halaman...');
      }
    };

    // 3. Intercept Form Submit (Hanya saat form BENAR-BENAR dikirimkan)
    const handleDocumentSubmit = (e: SubmitEvent) => {
      startProgressBar();
      scheduleFloatingPill('Menyimpan data ke server...');
    };

    document.addEventListener('click', handleNavigationLinkClick, true);
    document.addEventListener('submit', handleDocumentSubmit, true);

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener('click', handleNavigationLinkClick, true);
      document.removeEventListener('submit', handleDocumentSubmit, true);
    };
  }, [startProgressBar, completeProgressBar, scheduleFloatingPill, dismissFloatingPill]);

  return (
    <GlobalLoadingContext.Provider
      value={{
        isLoading,
        loadingText,
        startLoading,
        stopLoading,
        withLoading,
      }}
    >
      {/* 🧭 URL Navigation Listener (Safe in Suspense) */}
      <Suspense fallback={null}>
        <NavigationWatcher onNavigateComplete={handleNavigationComplete} />
      </Suspense>

      {/* 🌈 TOP NEON PROGRESS BAR (Halus & Non-intrusive) */}
      {showProgressBar && (
        <div 
          className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-300"
          style={{ opacity: showProgressBar ? 1 : 0 }}
        >
          <div
            className="h-[3px] bg-gradient-to-r from-[#3e8571] via-[#5fa08d] via-[#f0ca65] to-[#caa55d] transition-all ease-out"
            style={{
              width: `${progress}%`,
              transitionDuration: progress === 100 ? '180ms' : '280ms',
              boxShadow: '0 0 10px rgba(95, 160, 141, 0.8), 0 0 4px rgba(202, 165, 93, 0.7)',
            }}
          >
            {/* Glowing laser tip */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white opacity-85"></div>
          </div>
        </div>
      )}

      {/* 📖 CENTERED BOOK ANIMATION LOADER (Transparan Murni, Ringan, Tidak Mengunci Layar) */}
      {showFloatingPill && (
        <div 
          onClick={dismissFloatingPill}
          className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-slate-900/15 backdrop-blur-[2px] animate-in fade-in duration-200 select-none cursor-pointer"
          title="Klik di mana saja untuk menutup jika selesai"
        >
          {/* Container Murni Transparan Tanpa Card Box / Tanpa Alert Bertumpuk */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200 relative p-4 max-w-sm w-full bg-transparent pointer-events-auto"
          >
            <BookLoadingAnimation actionText={loadingText} />
          </div>
        </div>
      )}

      {/* Main Content Tree */}
      {children}
    </GlobalLoadingContext.Provider>
  );
}

export default GlobalLoadingProvider;
