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
    }, 150);
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

  // Show floating pill if request takes > 220ms (prevent flicker on fast actions)
  const scheduleFloatingPill = useCallback((text?: string) => {
    if (text) setLoadingText(text);

    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    if (prolongedTimerRef.current) clearTimeout(prolongedTimerRef.current);

    pillTimerRef.current = setTimeout(() => {
      setShowFloatingPill(true);
      setIsLoading(true);
    }, 220);

    prolongedTimerRef.current = setTimeout(() => {
      setIsProlonged(true);
    }, 3200);
  }, []);

  const dismissFloatingPill = useCallback(() => {
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    if (prolongedTimerRef.current) clearTimeout(prolongedTimerRef.current);

    setShowFloatingPill(false);
    setIsProlonged(false);
    setIsLoading(false);
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
      const isUserInitiated = now < userInteractionActiveUntilRef.current || manualLoadingCounterRef.current > 0;

      activeRequestsRef.current++;

      if (isUserInitiated) {
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

      // Detect button or clickable submit trigger
      const interactiveBtn = target.closest(
        'button, [role="button"], input[type="submit"], a[href]'
      ) as HTMLElement | null;

      if (!interactiveBtn) return;

      const now = Date.now();

      // Check if clicking internal navigation link
      if (interactiveBtn.tagName === 'A' && interactiveBtn.hasAttribute('href')) {
        const href = interactiveBtn.getAttribute('href') || '';
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          userInteractionActiveUntilRef.current = now + 4000;
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
      userInteractionActiveUntilRef.current = now + 4000;

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
    };

    // 3. Global Form Submit Guard
    const handleDocumentSubmit = (e: SubmitEvent) => {
      const now = Date.now();
      userInteractionActiveUntilRef.current = now + 4000;
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

      {/* 🛸 FUTURISTIC FLOATING ISLAND LOADER (Muncul otomatis saat respon melambat > 220ms) */}
      {showFloatingPill && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99998] pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="pointer-events-auto flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5 rounded-full bg-slate-950/90 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-500/40 shadow-2xl shadow-purple-500/25 text-white">
              
              {/* Dual-Ring Cybernetic Spinner */}
              <div className="relative w-5 h-5 flex items-center justify-center flex-shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
              </div>

              {/* Dynamic Action Text */}
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-100 tracking-wide line-clamp-1 max-w-[240px] sm:max-w-[340px]">
                  {loadingText}
                </span>
                <span className="text-[10px] text-purple-300/80 font-mono flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{isProlonged ? 'Menghubungkan ke server...' : 'Memproses secara aman...'}</span>
                </span>
              </div>

              {/* Subtle visual badge */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-bold text-purple-300 font-mono">
                <Zap size={10} className="text-amber-400" /> PROSES
              </span>
            </div>

            {/* Hint jika proses memakan waktu lebih dari 3 detik */}
            {isProlonged && (
              <div className="px-3.5 py-1 rounded-full bg-amber-950/90 backdrop-blur-md border border-amber-500/40 text-[10px] text-amber-200 font-medium shadow-lg animate-in fade-in slide-in-from-top-1">
                ⚡ Server sedang merespons, mohon tidak menekan tombol berulang kali.
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
