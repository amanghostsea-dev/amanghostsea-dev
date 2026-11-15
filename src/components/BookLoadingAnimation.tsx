'use client';

import React from 'react';

interface BookLoadingAnimationProps {
  actionText?: string;
  isProlonged?: boolean;
}

export function BookLoadingAnimation({ actionText = 'Memproses...', isProlonged = false }: BookLoadingAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8 max-w-sm w-full mx-auto select-none">
      <style jsx>{`
        @keyframes pageTurn1 {
          0% {
            transform: rotateY(0deg) skewY(0deg);
            opacity: 0.95;
          }
          40% {
            transform: rotateY(-75deg) skewY(-8deg) scaleY(1.04);
            opacity: 1;
          }
          85% {
            transform: rotateY(-165deg) skewY(-3deg) scaleY(0.98);
            opacity: 0.7;
          }
          100% {
            transform: rotateY(-180deg) skewY(0deg);
            opacity: 0;
          }
        }

        @keyframes pageTurn2 {
          0% {
            transform: rotateY(0deg) skewY(0deg);
            opacity: 0.9;
          }
          40% {
            transform: rotateY(-70deg) skewY(-7deg) scaleY(1.03);
            opacity: 1;
          }
          85% {
            transform: rotateY(-160deg) skewY(-2deg) scaleY(0.98);
            opacity: 0.6;
          }
          100% {
            transform: rotateY(-180deg) skewY(0deg);
            opacity: 0;
          }
        }

        @keyframes windFloat {
          0%, 100% {
            transform: translateY(0px) scale(0.96);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-4px) scale(1.05);
            opacity: 0.9;
          }
        }

        @keyframes dotPulse {
          0%, 100% {
            transform: scale(0.85);
            opacity: 0.45;
          }
          50% {
            transform: scale(1.35);
            opacity: 1;
            box-shadow: 0 0 10px rgba(202, 165, 93, 0.8);
          }
        }

        @keyframes shimmerText {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .page-flip-1 {
          transform-origin: 100px 75px;
          animation: pageTurn1 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .page-flip-2 {
          transform-origin: 100px 75px;
          animation: pageTurn2 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          animation-delay: 0.5s;
        }

        .wind-swoosh {
          animation: windFloat 1.6s ease-in-out infinite;
        }

        .loading-shimmer-text {
          background: linear-gradient(
            90deg,
            #5fa08d 0%,
            #8bb79e 25%,
            #f5d076 50%,
            #caa55d 75%,
            #5fa08d 100%
          );
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmerText 3s linear infinite;
        }
      `}</style>

      {/* 📖 ANIMATED SVG BOOK (Exact representation of uploaded design with Full Transparent Interior) */}
      <div className="relative w-48 h-32 sm:w-56 sm:h-36 flex items-center justify-center">
        <svg
          viewBox="0 0 200 130"
          className="w-full h-full overflow-visible"
          style={{ filter: 'drop-shadow(0px 3px 12px rgba(0,0,0,0.28))' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Main Aesthetic Book Gradient: Sage-Green (Left) to Warm Gold (Right) */}
            <linearGradient id="bookGradient" x1="20" y1="65" x2="180" y2="65" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5fa08d" />
              <stop offset="35%" stopColor="#75a695" />
              <stop offset="65%" stopColor="#b6a86e" />
              <stop offset="100%" stopColor="#caa55d" />
            </linearGradient>

            {/* Fluttering Page Gradient */}
            <linearGradient id="pageGradient" x1="100" y1="70" x2="160" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#75a695" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#e8cf8d" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#caa55d" />
            </linearGradient>

            {/* Soft inner page fill */}
            <linearGradient id="pageFillGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#faf7ed" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* 🍃 Wind Flutter Arcs Above Page (Swooshes from image) */}
          <g className="wind-swoosh stroke-[#caa55d]" strokeWidth="2.2" strokeLinecap="round">
            <path d="M 122 30 C 127 22, 137 19, 145 23" opacity="0.65" />
            <path d="M 134 38 C 141 33, 149 32, 155 36" opacity="0.8" />
          </g>

          {/* 📘 1. Book Outer Base & Cover Contour (Full Transparent Fill) */}
          <path
            d="M 22 46 
               C 22 41, 26 38, 32 38 
               C 52 38, 76 43, 97 49 
               L 97 101 
               C 78 95, 54 90, 32 90 
               C 26 90, 22 93, 22 99 
               Z"
            stroke="url(#bookGradient)"
            strokeWidth="3.6"
            strokeLinejoin="round"
            fill="none"
          />

          <path
            d="M 178 46 
               C 178 41, 174 38, 168 38 
               C 148 38, 124 43, 103 49 
               L 103 101 
               C 122 95, 146 90, 168 90 
               C 174 90, 178 93, 178 99 
               Z"
            stroke="url(#bookGradient)"
            strokeWidth="3.6"
            strokeLinejoin="round"
            fill="none"
          />

          {/* 📖 2. Bottom Book Spine & Center Notch */}
          <path
            d="M 22 99 
               C 22 105, 30 109, 42 109 
               C 62 109, 82 103, 94 99 
               C 97 105, 103 105, 106 99 
               C 118 103, 138 109, 158 109 
               C 170 109, 178 105, 178 99"
            stroke="url(#bookGradient)"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Spine Center Bottom Notch */}
          <path
            d="M 94 99 C 94 105, 106 105, 106 99"
            stroke="url(#bookGradient)"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"
          />

          {/* 📄 3. Left Static Page (Full Transparent) */}
          <path
            d="M 30 45 
               C 50 45, 72 49, 96 54 
               L 96 95 
               C 74 90, 50 86, 30 86 
               Z"
            stroke="url(#bookGradient)"
            strokeWidth="2.8"
            strokeLinejoin="round"
            fill="none"
          />

          {/* 📄 4. Animated Turning Page Leaves (Full Transparent) */}
          {/* Back Leaf 2 (Slight delay for layered book physics) */}
          <g className="page-flip-2" style={{ transformStyle: 'preserve-3d' }}>
            <path
              d="M 100 52 
                 C 115 42, 138 34, 152 28 
                 C 158 36, 158 54, 146 72 
                 C 134 86, 118 92, 100 97 
                 Z"
              stroke="url(#pageGradient)"
              strokeWidth="2.8"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* Front Leaf 1 (Main fluttering page matching illustration) */}
          <g className="page-flip-1" style={{ transformStyle: 'preserve-3d' }}>
            <path
              d="M 100 52 
                 C 118 40, 142 30, 156 24 
                 C 162 34, 160 56, 146 76 
                 C 132 90, 116 95, 100 98 
                 Z"
              stroke="url(#pageGradient)"
              strokeWidth="3.2"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* 📖 5. Right Book Page Edge Contour */}
          <path
            d="M 170 45 
               C 152 45, 130 49, 104 54 
               L 104 95 
               C 128 90, 150 86, 170 86 
               Z"
            stroke="url(#bookGradient)"
            strokeWidth="2.6"
            strokeLinejoin="round"
            opacity="0.4"
            fill="none"
          />
        </svg>
      </div>

      {/* 🖋️ "LOADING" TYPOGRAPHY (Matching Exact Serif Styling in Image) */}
      <div className="mt-1 flex flex-col items-center">
        <h2 className="loading-shimmer-text font-serif text-2xl sm:text-3xl font-extrabold tracking-[0.28em] uppercase drop-shadow-xs">
          LOADING
        </h2>

        {/* 🟡 6 PULSING GRADIENT INDICATOR DOTS */}
        <div className="flex items-center justify-center gap-2.5 mt-3">
          {[
            { color: '#5fa08d', delay: '0s' },
            { color: '#6fa695', delay: '0.2s' },
            { color: '#8bb79e', delay: '0.4s' },
            { color: '#b2ab75', delay: '0.6s' },
            { color: '#c2a55f', delay: '0.8s' },
            { color: '#caa55d', delay: '1.0s' },
          ].map((dot, idx) => (
            <span
              key={idx}
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{
                backgroundColor: dot.color,
                animation: `dotPulse 1.4s ease-in-out infinite`,
                animationDelay: dot.delay,
              }}
            />
          ))}
        </div>
      </div>

      {/* 💬 DYNAMIC ACTION SUBTEXT & DETAILS */}
      <div className="mt-4 text-center space-y-1.5 flex flex-col items-center">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-950/70 dark:bg-black/70 backdrop-blur-md border border-white/10 text-white shadow-lg">
          <p className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-1 max-w-[280px]">
            {actionText}
          </p>
        </div>
        <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium drop-shadow-sm">
          {isProlonged 
            ? '⚡ Menghubungkan ke server, mohon tunggu sebentar...' 
            : 'Sistem sedang memproses data di server'}
        </p>
      </div>
    </div>
  );
}

export default BookLoadingAnimation;
