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
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
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
  const [isProlonged, setIsProlonged] = useState(false);
  const [spamWarning, setSpamWarning] = useState<string | null>(null);

  const activeRequestsRef = useRef(0);
  const pillTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prolongedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userInteractionActiveUntilRef = useRef<number>(0);
  const lastClickedButtonRef = useRef<HTMLElement | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const manualLoadingCounterRef = useRef(0);
  const pillShownAtRef = useRef<number>(0);

  // Start progress bar animation (Neon Top Laser)
  const startProgressBar = useCallback(() => {
    setShowProgressBar(true);
    setProgress(18);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) return prev + Math.floor(Math.random() * 8) + 4;
        if (prev < 80) return prev + Math.floor(Math.random() * 4) + 1;
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
      setTimeout(() => setProgress(0), 200);
    }, 250);
  }, []);

  // 🎯 Presisi Delay: Tampilkan logo loading tepat pada 60ms jika sistem mulai memproses
  const scheduleFloatingPill = useCallback((text?: string) => {
    if (text) setLoadingText(text);

    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    if (prolongedTimerRef.current) clearTimeout(prolongedTimerRef.current);

    // 60ms presisi: langsung merespons ketika sistem memproses
    pillTimerRef.current = setTimeout(() => {
      pillShownAtRef.current = Date.now();
      setShowFloatingPill(true);
      setIsLoading(true);
    }, 60);

    prolongedTimerRef.current = setTimeout(() => {
      setIsProlonged(true);
    }, 2800);
  }, []);

  // 🛡️ Smooth Dismiss: Pastikan animasi terlihat mulus (minimal 400ms) agar tidak hilang sekejap seperti glitch
  const dismissFloatingPill = useCallback(() => {
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    if (prolongedTimerRef.current) clearTimeout(prolongedTimerRef.current);

    const now = Date.now();
    const visibleDuration = pillShownAtRef.current > 0 ? now - pillShownAtRef.current : 0;
    const minWait = pillShownAtRef.current > 0 && visibleDuration < 420 ? 420 - visibleDuration : 0;

    setTimeout(() => {
      setShowFloatingPill(false);
      setIsProlonged(false);
      setIsLoading(false);
      pillShownAtRef.current = 0;
    }, minWait);
  }, []);

  // Trigger brief anti-spam warning when user repeatedly clicks while busy
  const triggerSpamWarning = useCallback((msg?: string) => {
    setSpamWarning(msg || 'Harap tunggu, proses sebelumnya sedang berlangsung...');
    setTimeout(() => {
      setSpamWarning(null);
    }, 2800);
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

  // Global Interaction & Fetch Interceptor (Anti-Spam & Network Activity)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Transparently wrap window.fetch to detect server actions and network requests
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const now = Date.now();
      const firstArg = args[0];
      const secondArg = args[1];
      const url = typeof firstArg === 'string' ? firstArg : (firstArg as any)?.url || '';
      const method = (secondArg?.method || (firstArg as any)?.method || 'GET').toUpperCase();

      // Silent ignore for automated background polls
      const isBackgroundPoll = url.includes('/api/health') || url.includes('silent=true');

      // Server actions in Next.js use POST. Every mutation or click interaction triggers loader:
      const isUserAction = !isBackgroundPoll && (
        method !== 'GET' ||
        now < userInteractionActiveUntilRef.current || 
        manualLoadingCounterRef.current > 0
      );

      activeRequestsRef.current++;

      if (isUserAction) {
        startProgressBar();
        scheduleFloatingPill();
      }

      try {
        return await originalFetch.apply(window, args);
      } finally {
        activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
        if (activeRequestsRef.current === 0 && manualLoadingCounterRef.current === 0) {
          completeProgressBar();
          dismissFloatingPill();
        }
      }
    };

    // 2. Global Document Click & Double-Click Anti-Spam Guard
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const now = Date.now();
      userInteractionActiveUntilRef.current = now + 6000;

      // Detect button or clickable submit trigger
      const interactiveBtn = target.closest(
        'button, [role="button"], input[type="submit"], a[href], [data-clickable="true"]'
      ) as HTMLElement | null;

      if (!interactiveBtn) return;

      // Check if clicking internal navigation link
      if (interactiveBtn.tagName === 'A' && interactiveBtn.hasAttribute('href')) {
        const href = interactiveBtn.getAttribute('href') || '';
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          startProgressBar();
          scheduleFloatingPill('Memuat halaman...');
          return;
        }
      }

      // 🛡️ ANTI-DOUBLE CLICK & SPAM PROTECTION:
      // Cegah klik berulang-ulang pada tombol yang sama dalam durasi singkat (< 650ms)
      if (lastClickedButtonRef.current === interactiveBtn && now - lastClickTimeRef.current < 650) {
        e.preventDefault();
        e.stopPropagation();
        triggerSpamWarning('⚠️ Harap jangan klik berulang kali! Sistem sedang memproses...');
        return;
      }

      // Jika tombol adalah tombol aksi / form submit dan sedang ada proses berlangsung
      const isSubmitBtn = interactiveBtn.getAttribute('type') === 'submit' || 
                          interactiveBtn.classList.contains('cursor-pointer') ||
                          interactiveBtn.closest('form');

      if (isSubmitBtn && activeRequestsRef.current > 0 && now - lastClickTimeRef.current < 1200) {
        e.preventDefault();
        e.stopPropagation();
        triggerSpamWarning('⚠️ Proses sebelumnya masih berjalan di server. Mohon tunggu...');
        return;
      }

      // Record button interaction
      lastClickedButtonRef.current = interactiveBtn;
      lastClickTimeRef.current = now;

      // Extract descriptive text from button for context-aware loading
      const rawText = (
        interactiveBtn.getAttribute('data-action-label') ||
        interactiveBtn.innerText || 
        interactiveBtn.getAttribute('title') || 
        interactiveBtn.getAttribute('aria-label') || 
        ''
      ).trim().replace(/\s+/g, ' ');

      const cleanLabel = rawText.length > 2 && rawText.length < 35 
        ? `Memproses: ${rawText}...` 
        : 'Memproses permintaan...';

      setLoadingText(cleanLabel);
      startProgressBar();
      scheduleFloatingPill(cleanLabel);
    };

    // 3. Global Form Submit Guard
    const handleDocumentSubmit = (e: SubmitEvent) => {
      const now = Date.now();
      userInteractionActiveUntilRef.current = now + 6000;
      startProgressBar();
      scheduleFloatingPill('Menyimpan data ke server...');
    };

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('submit', handleDocumentSubmit, true);

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('submit', handleDocumentSubmit, true);
    };
  }, [startProgressBar, completeProgressBar, scheduleFloatingPill, dismissFloatingPill, triggerSpamWarning]);

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

      {/* 🌈 TOP NEON PROGRESS BAR (YouTube/Vercel/GitHub Style) */}
      {showProgressBar && (
        <div 
          className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-300"
          style={{ opacity: showProgressBar ? 1 : 0 }}
        >
          <div
            className="h-[3.5px] bg-gradient-to-r from-blue-600 via-indigo-500 via-purple-500 to-emerald-400 transition-all ease-out"
            style={{
              width: `${progress}%`,
              transitionDuration: progress === 100 ? '200ms' : '300ms',
              boxShadow: '0 0 12px rgba(168, 85, 247, 0.9), 0 0 4px rgba(59, 130, 246, 0.8)',
            }}
          >
            {/* Pulsing leading laser tip */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white opacity-80 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* 📖 CENTERED BOOK ANIMATION LOADER DENGAN LATAR TRANSPARAN (Muncul otomatis saat respon melambat > 220ms) */}
      {showFloatingPill && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-slate-950/20 dark:bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200 select-none">
          {/* Container Murni Transparan Tanpa Kotak / Tanpa Card Background */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              triggerSpamWarning('⚠️ Harap tunggu, proses sedang diselesaikan...');
            }}
            className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200 relative p-4 max-w-sm w-full bg-transparent"
          >
            {/* Book Flip Animated Component Sesuai Desain Gambar (Full Transparent) */}
            <BookLoadingAnimation 
              actionText={loadingText} 
              isProlonged={isProlonged} 
            />

            {/* Hint Anti-Freeze jika memakan waktu lebih dari 3.2 detik */}
            {isProlonged && (
              <div className="mt-3 px-4 py-2 rounded-2xl bg-slate-950/80 dark:bg-black/80 backdrop-blur-md border border-amber-500/50 text-[11px] text-amber-300 text-left flex items-start gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-1">
                <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">
                  Server sedang memproses transaksi. Mohon tidak menutup halaman atau menekan tombol berulang kali.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⚠️ NOTIFIKASI SPAM ANTI-DOUBLE CLICK (Jika user spam klik saat tombol busy) */}
      {spamWarning && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="pointer-events-auto px-4 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2 border border-amber-300">
            <AlertTriangle size={16} className="text-slate-950 flex-shrink-0 animate-bounce" />
            <span>{spamWarning}</span>
          </div>
        </div>
      )}

      {/* Main Content Tree */}
      {children}
    </GlobalLoadingContext.Provider>
  );
}

export default GlobalLoadingProvider;
