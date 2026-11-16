'use client';

import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { ZoomIn, X, RotateCcw, Maximize2 } from 'lucide-react';

interface CbtRichTextProps {
  text: string;
  className?: string;
  displayMode?: boolean;
  disableTable?: boolean;
}

type TextSegment =
  | { type: 'text'; content: string }
  | { type: 'inline-math'; math: string }
  | { type: 'block-math'; math: string }
  | { type: 'image'; alt: string; src: string }
  | {
      type: 'table';
      headers: string[];
      rows: string[][];
      alignments: ('left' | 'center' | 'right')[];
    };

function parseTableRow(line: string): string[] {
  let clean = line.trim();
  if (clean.startsWith('|')) clean = clean.slice(1);
  if (clean.endsWith('|')) clean = clean.slice(0, -1);
  return clean.split('|').map((c) => c.trim());
}

function parseTableAlignment(col: string): 'left' | 'center' | 'right' {
  const trimmed = col.trim();
  const starts = trimmed.startsWith(':');
  const ends = trimmed.endsWith(':');
  if (starts && ends) return 'center';
  if (ends) return 'right';
  return 'left';
}

function parseTableBlock(rawTable: string): {
  headers: string[];
  rows: string[][];
  alignments: ('left' | 'center' | 'right')[];
} | null {
  const lines = rawTable.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const headers = parseTableRow(lines[0]);
  const sepRow = parseTableRow(lines[1]);
  if (sepRow.length === 0 || !sepRow.some((c) => c.includes('-'))) return null;

  const alignments = sepRow.map(parseTableAlignment);
  const maxCols = Math.max(headers.length, sepRow.length);
  while (alignments.length < maxCols) alignments.push('left');
  while (headers.length < maxCols) headers.push('');

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const row = parseTableRow(lines[i]);
    while (row.length < maxCols) row.push('');
    rows.push(row.slice(0, maxCols));
  }

  return { headers: headers.slice(0, maxCols), rows, alignments: alignments.slice(0, maxCols) };
}

function parseMathAndImages(rawText: string): TextSegment[] {
  if (!rawText) return [];
  const segments: TextSegment[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\s)[^$\n]+(?<!\s)\$|\\\([\s\S]*?\\\)|\!\[(.*?)\]\((.*?)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: rawText.slice(lastIndex, match.index),
      });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('![')) {
      const alt = match[2] || 'Gambar Soal';
      const src = match[3] || '';
      segments.push({ type: 'image', alt, src });
    } else if ((matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) || (matchedStr.startsWith('\\[') && matchedStr.endsWith('\\]'))) {
      const math = matchedStr.slice(2, -2).trim();
      segments.push({ type: 'block-math', math });
    } else if ((matchedStr.startsWith('$') && matchedStr.endsWith('$')) || (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)'))) {
      const math = matchedStr.slice(1, -1).trim();
      segments.push({ type: 'inline-math', math });
    } else {
      segments.push({ type: 'text', content: matchedStr });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < rawText.length) {
    segments.push({
      type: 'text',
      content: rawText.slice(lastIndex),
    });
  }

  return segments;
}

function parseRichTextSegments(rawText: string, disableTable: boolean = false): TextSegment[] {
  if (!rawText) return [];
  if (disableTable) return parseMathAndImages(rawText);

  const tableRegex = /(?:^|\n)([ \t]*\|[^\n]+\|[ \t]*\r?\n[ \t]*\|[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)+\|[ \t]*(?:\r?\n[ \t]*\|[^\n]+\|[ \t]*)*)/g;
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(rawText)) !== null) {
    const matchStart = match.index + match[0].indexOf(match[1]);
    const matchEnd = matchStart + match[1].length;

    if (matchStart > lastIndex) {
      const textChunk = rawText.slice(lastIndex, matchStart);
      segments.push(...parseMathAndImages(textChunk));
    }

    const tableData = parseTableBlock(match[1]);
    if (tableData) {
      segments.push({ type: 'table', ...tableData });
    } else {
      segments.push(...parseMathAndImages(match[1]));
    }

    lastIndex = matchEnd;
    tableRegex.lastIndex = matchEnd;
  }

  if (lastIndex < rawText.length) {
    const textChunk = rawText.slice(lastIndex);
    segments.push(...parseMathAndImages(textChunk));
  }

  return segments;
}

function renderKaTeX(math: string, displayMode: boolean): string {
  try {
    return katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch (err: any) {
    console.warn('KaTeX render error:', err);
    return `<span class="text-rose-500 font-mono text-xs">[Rumus: ${math}]</span>`;
  }
}

export default function CbtRichText({
  text,
  className = '',
  displayMode = false,
  disableTable = false,
}: CbtRichTextProps) {
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const segments = useMemo(() => parseRichTextSegments(text, disableTable), [text, disableTable]);

  const handleOpenZoom = (src: string) => {
    setActiveZoomImage(src);
    setZoomScale(1);
  };

  const handleCloseZoom = () => {
    setActiveZoomImage(null);
    setZoomScale(1);
  };

  return (
    <>
      <span className={`inline leading-relaxed ${className}`}>
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            return (
              <span key={idx} className="whitespace-pre-wrap">
                {seg.content}
              </span>
            );
          }

          if (seg.type === 'inline-math') {
            const html = renderKaTeX(seg.math, false);
            return (
              <span
                key={idx}
                className="inline-block px-1 align-baseline select-text"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }

          if (seg.type === 'block-math') {
            const html = renderKaTeX(seg.math, true);
            return (
              <span
                key={idx}
                className="block my-3 overflow-x-auto py-2 px-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-center select-text"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }

          if (seg.type === 'table') {
            return (
              <div
                key={idx}
                className="my-3.5 w-full overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs bg-white dark:bg-slate-900"
              >
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  {seg.headers.length > 0 && (
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b-2 border-slate-300 dark:border-slate-700 font-bold">
                      <tr>
                        {seg.headers.map((h, colIdx) => {
                          const align = seg.alignments[colIdx] || 'left';
                          const alignClass =
                            align === 'center'
                              ? 'text-center'
                              : align === 'right'
                              ? 'text-right'
                              : 'text-left';
                          return (
                            <th
                              key={colIdx}
                              className={`px-3.5 py-2.5 sm:px-4 sm:py-3 border-r border-slate-200 dark:border-slate-700/80 last:border-r-0 select-text ${alignClass}`}
                            >
                              <CbtRichText text={h} disableTable={true} />
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {seg.rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={`transition-colors hover:bg-purple-50/50 dark:hover:bg-purple-950/20 ${
                          rowIdx % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50/70 dark:bg-slate-800/40'
                        }`}
                      >
                        {row.map((cell, colIdx) => {
                          const align = seg.alignments[colIdx] || 'left';
                          const alignClass =
                            align === 'center'
                              ? 'text-center'
                              : align === 'right'
                              ? 'text-right'
                              : 'text-left';
                          return (
                            <td
                              key={colIdx}
                              className={`px-3.5 py-2 sm:px-4 sm:py-2.5 text-slate-800 dark:text-slate-200 border-r border-slate-200/80 dark:border-slate-800 last:border-r-0 select-text leading-relaxed ${alignClass}`}
                            >
                              <CbtRichText text={cell} disableTable={true} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          if (seg.type === 'image') {
            return (
              <span key={idx} className="block my-2">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenZoom(seg.src);
                  }}
                  className="relative group inline-block max-w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm cursor-zoom-in bg-slate-100 dark:bg-slate-900 transition-all hover:ring-2 hover:ring-purple-500/40"
                  title="Klik untuk memperbesar gambar (Lightbox Zoom)"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={seg.src}
                    alt={seg.alt}
                    className="max-h-56 w-auto object-contain mx-auto transition-transform group-hover:scale-[1.01]"
                    loading="lazy"
                  />
                  <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn size={12} /> Perbesar
                  </span>
                </span>
              </span>
            );
          }

          return null;
        })}
      </span>

      {/* 🔍 Lightbox Zoom Modal for Inline Images */}
      {activeZoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
          onClick={handleCloseZoom}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.min(prev + 0.25, 3))}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition cursor-pointer"
                title="Perbesar"
              >
                + Zoom In
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.max(prev - 0.25, 0.5))}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition cursor-pointer"
                title="Perkecil"
              >
                - Zoom Out
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={handleCloseZoom}
                className="p-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image Container */}
            <div className="overflow-auto max-h-[85vh] max-w-full p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeZoomImage}
                alt="Zoom Visualisasi Soal"
                style={{ transform: `scale(${zoomScale})` }}
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-200"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

