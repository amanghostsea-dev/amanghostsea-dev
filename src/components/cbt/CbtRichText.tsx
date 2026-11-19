'use client';

import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { ZoomIn, X, RotateCcw } from 'lucide-react';

interface CbtRichTextProps {
  text: string;
  className?: string;
  displayMode?: boolean;
  disableTable?: boolean;
}

type TextSegment =
  | { type: 'text'; content: string }
  | { type: 'code-block'; content: string }
  | { type: 'quote'; content: string }
  | { type: 'hr' }
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

/**
 * Parsing blok: Rumus Matematika (KaTeX), Gambar, dan Kotak Pesan Error/Terminal Output
 */
function parseMathCodeAndImages(rawText: string): TextSegment[] {
  if (!rawText) return [];
  const segments: TextSegment[] = [];
  const regex = /(```[\s\S]*?```|\[box\][\s\S]*?\[\/box\]|\[terminal\][\s\S]*?\[\/terminal\]|\[quote\][\s\S]*?\[\/quote\]|\[hr\]|^\s*---+\s*$|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\s)[^$\n]+(?<!\s)\$|\\\([\s\S]*?\\\)|\!\[(.*?)\]\((.*?)\))/gm;
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
    if (matchedStr.startsWith('```')) {
      const inner = matchedStr.replace(/^```[a-zA-Z0-9_-]*\r?\n?/, '').replace(/\r?\n?```$/, '');
      segments.push({ type: 'code-block', content: inner });
    } else if (matchedStr.startsWith('[box]')) {
      const inner = matchedStr.slice(5, -6).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      segments.push({ type: 'code-block', content: inner });
    } else if (matchedStr.startsWith('[terminal]')) {
      const inner = matchedStr.slice(10, -11).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      segments.push({ type: 'code-block', content: inner });
    } else if (matchedStr.startsWith('[quote]')) {
      const inner = matchedStr.slice(7, -8).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      segments.push({ type: 'quote', content: inner });
    } else if (matchedStr === '[hr]' || /^\s*---+\s*$/.test(matchedStr)) {
      segments.push({ type: 'hr' });
    } else if (matchedStr.startsWith('![')) {
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
  if (disableTable) return parseMathCodeAndImages(rawText);

  const tableRegex = /(?:^|\n)([ \t]*\|[^\n]+\|[ \t]*\r?\n[ \t]*\|[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)+\|[ \t]*(?:\r?\n[ \t]*\|[^\n]+\|[ \t]*)*)/g;
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(rawText)) !== null) {
    const matchStart = match.index + match[0].indexOf(match[1]);
    const matchEnd = matchStart + match[1].length;

    if (matchStart > lastIndex) {
      const textChunk = rawText.slice(lastIndex, matchStart);
      segments.push(...parseMathCodeAndImages(textChunk));
    }

    const tableData = parseTableBlock(match[1]);
    if (tableData) {
      segments.push({ type: 'table', ...tableData });
    } else {
      segments.push(...parseMathCodeAndImages(match[1]));
    }

    lastIndex = matchEnd;
    tableRegex.lastIndex = matchEnd;
  }

  if (lastIndex < rawText.length) {
    const textChunk = rawText.slice(lastIndex);
    segments.push(...parseMathCodeAndImages(textChunk));
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
  } catch (err: unknown) {
    console.warn('KaTeX render error:', err);
    return `<span class="text-rose-500 font-mono text-xs">[Rumus: ${math}]</span>`;
  }
}

/**
 * 🎨 Recursive Inline Formatting Parser
 * Mendukung Font, Ukuran, Warna, Highlight, Bold, Italic, Underline, Kbd, Code, Subscript, Superscript, Rata Teks, Kutipan, dan Soal Rumpang
 */
function renderInlineRichFormatting(text: string, keyPrefix: string = 'inline'): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  const pattern = /(?:`[^`\n]+`|<kbd>[\s\S]*?<\/kbd>|\[\[[\s\S]*?\]\]|\*\*[\s\S]*?\*\*|<b>[\s\S]*?<\/b>|<strong>[\s\S]*?<\/strong>|~~[\s\S]*?~~|<s>[\s\S]*?<\/s>|<del>[\s\S]*?<\/del>|<u>[\s\S]*?<\/u>|__[\s\S]*?__|==[\s\S]*?==|\[bg:[a-zA-Z0-9#]+\][\s\S]*?\[\/bg\]|\[font:[a-zA-Z0-9-]+\][\s\S]*?\[\/font\]|\[(?:serif|mono|sans)\][\s\S]*?\[\/(?:serif|mono|sans)\]|\[size:[a-zA-Z0-9-]+\][\s\S]*?\[\/size\]|\[color:[a-zA-Z0-9#-]+\][\s\S]*?\[\/color\]|\[(?:red|blue|green|yellow|amber|purple|gray)\][\s\S]*?\[\/(?:red|blue|green|yellow|amber|purple|gray)\]|<sub>[\s\S]*?<\/sub>|\[sub\][\s\S]*?\[\/sub\]|~[^~\s\n]+~|<sup>[\s\S]*?<\/sup>|\[sup\][\s\S]*?\[\/sup\]|\^[^\^\s\n]+\^|\[(?:center|right|justify|left)\][\s\S]*?\[\/(?:center|right|justify|left)\]|\[quote\][\s\S]*?\[\/quote\]|\[blank(?::\d+)?\]|\.{5,}|\*[^\*\n]+\*|_[^\_\n]+_|<i>[\s\S]*?<\/i>|<em>[\s\S]*?<\/em>)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const key = `${keyPrefix}-${counter++}`;
    const fullMatch = match[0];

    // 1. Inline code: `...`
    if (fullMatch.startsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded-md font-mono text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold mx-0.5 select-text"
        >
          {fullMatch.slice(1, -1)}
        </code>
      );
    }
    // 2. Kbd: <kbd>...</kbd> or [[...]]
    else if (fullMatch.startsWith('<kbd>') || fullMatch.startsWith('[[')) {
      const content = fullMatch.startsWith('<kbd>') ? fullMatch.slice(5, -6) : fullMatch.slice(2, -2);
      nodes.push(
        <kbd
          key={key}
          className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-md font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs text-slate-800 dark:text-slate-200 align-baseline select-text"
        >
          {renderInlineRichFormatting(content, `${key}-k`)}
        </kbd>
      );
    }
    // 3. Subscript: <sub>...</sub> or [sub]...[/sub] or ~...~
    else if (fullMatch.startsWith('<sub>') || fullMatch.startsWith('[sub]') || (fullMatch.startsWith('~') && !fullMatch.startsWith('~~'))) {
      const content = fullMatch.startsWith('<sub>')
        ? fullMatch.slice(5, -6)
        : fullMatch.startsWith('[sub]')
        ? fullMatch.slice(5, -6)
        : fullMatch.slice(1, -1);
      nodes.push(
        <sub key={key} className="align-baseline text-[0.75em] relative -bottom-[0.25em] font-medium select-text">
          {renderInlineRichFormatting(content, `${key}-sub`)}
        </sub>
      );
    }
    // 4. Superscript: <sup>...</sup> or [sup]...[/sup] or ^...^
    else if (fullMatch.startsWith('<sup>') || fullMatch.startsWith('[sup]') || fullMatch.startsWith('^')) {
      const content = fullMatch.startsWith('<sup>')
        ? fullMatch.slice(5, -6)
        : fullMatch.startsWith('[sup]')
        ? fullMatch.slice(5, -6)
        : fullMatch.slice(1, -1);
      nodes.push(
        <sup key={key} className="align-baseline text-[0.75em] relative -top-[0.45em] font-medium select-text">
          {renderInlineRichFormatting(content, `${key}-sup`)}
        </sup>
      );
    }
    // 5. Perataan Teks (Alignment): [center], [right], [justify], [left]
    else if (
      fullMatch.startsWith('[center]') ||
      fullMatch.startsWith('[right]') ||
      fullMatch.startsWith('[justify]') ||
      fullMatch.startsWith('[left]')
    ) {
      let alignClass = 'text-left';
      let content = '';
      if (fullMatch.startsWith('[center]')) {
        alignClass = 'text-center';
        content = fullMatch.slice(8, -9);
      } else if (fullMatch.startsWith('[right]')) {
        alignClass = 'text-right';
        content = fullMatch.slice(7, -8);
      } else if (fullMatch.startsWith('[justify]')) {
        alignClass = 'text-justify';
        content = fullMatch.slice(9, -10);
      } else {
        alignClass = 'text-left';
        content = fullMatch.slice(6, -7);
      }

      nodes.push(
        <span key={key} className={`block ${alignClass} my-1 leading-relaxed select-text`}>
          {renderInlineRichFormatting(content, `${key}-align`)}
        </span>
      );
    }
    // 6. Kutipan / Blok Quote inline: [quote]...[/quote]
    else if (fullMatch.startsWith('[quote]')) {
      const content = fullMatch.slice(7, -8).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      nodes.push(
        <blockquote
          key={key}
          className="my-2.5 p-3 sm:p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border-l-4 border-l-purple-500 dark:border-l-purple-400 text-slate-800 dark:text-slate-200 italic shadow-xs block select-text leading-relaxed"
        >
          {renderInlineRichFormatting(content, `${key}-qt`)}
        </blockquote>
      );
    }
    // 7. Soal Rumpang / Fill-in-the-blank: [blank] or ...........
    else if (fullMatch.startsWith('[blank') || /^\.{5,}$/.test(fullMatch)) {
      nodes.push(
        <span
          key={key}
          className="inline-block border-b-2 border-slate-400 dark:border-slate-500 min-w-[70px] mx-1 text-transparent select-none align-baseline"
          title="Soal rumpang (isilah bagian yang kosong)"
        >
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </span>
      );
    }
    // 8. Bold: **...**, <b>...</b>, <strong>...</strong>
    else if (fullMatch.startsWith('**') || fullMatch.startsWith('<b>') || fullMatch.startsWith('<strong>')) {
      const content = fullMatch.startsWith('**')
        ? fullMatch.slice(2, -2)
        : fullMatch.startsWith('<b>')
        ? fullMatch.slice(3, -4)
        : fullMatch.slice(8, -9);
      nodes.push(
        <strong key={key} className="font-bold text-slate-950 dark:text-white">
          {renderInlineRichFormatting(content, `${key}-b`)}
        </strong>
      );
    }
    // 9. Strikethrough: ~~...~~, <s>...</s>, <del>...</del>
    else if (fullMatch.startsWith('~~') || fullMatch.startsWith('<s>') || fullMatch.startsWith('<del>')) {
      const content = fullMatch.startsWith('~~')
        ? fullMatch.slice(2, -2)
        : fullMatch.startsWith('<s>')
        ? fullMatch.slice(3, -4)
        : fullMatch.slice(5, -6);
      nodes.push(
        <del key={key} className="line-through opacity-75">
          {renderInlineRichFormatting(content, `${key}-s`)}
        </del>
      );
    }
    // 10. Underline: <u>...</u>, __...__
    else if (fullMatch.startsWith('<u>') || fullMatch.startsWith('__')) {
      const content = fullMatch.startsWith('<u>') ? fullMatch.slice(3, -4) : fullMatch.slice(2, -2);
      nodes.push(
        <span key={key} className="underline decoration-current underline-offset-2 decoration-1.5">
          {renderInlineRichFormatting(content, `${key}-u`)}
        </span>
      );
    }
    // 11. Highlight: ==...==
    else if (fullMatch.startsWith('==')) {
      const content = fullMatch.slice(2, -2);
      nodes.push(
        <mark
          key={key}
          className="bg-amber-200/90 dark:bg-amber-900/60 text-slate-900 dark:text-amber-100 px-1 py-0.5 rounded-sm font-medium"
        >
          {renderInlineRichFormatting(content, `${key}-hl`)}
        </mark>
      );
    }
    // 12. Highlight by color: [bg:COLOR]...[/bg]
    else if (fullMatch.startsWith('[bg:')) {
      const colorMatch = fullMatch.match(/^\[bg:([a-zA-Z0-9#]+)\]([\s\S]*?)\[\/bg\]$/i);
      const colorParam = colorMatch?.[1]?.toLowerCase() || 'yellow';
      const content = colorMatch?.[2] || '';

      let bgClass = 'bg-amber-200/90 dark:bg-amber-900/60 text-slate-900 dark:text-amber-100';
      let customStyle: React.CSSProperties | undefined;

      if (colorParam === 'green') bgClass = 'bg-emerald-200/90 dark:bg-emerald-900/60 text-slate-900 dark:text-emerald-100';
      else if (colorParam === 'blue') bgClass = 'bg-sky-200/90 dark:bg-sky-900/60 text-slate-900 dark:text-sky-100';
      else if (colorParam === 'purple') bgClass = 'bg-purple-200/90 dark:bg-purple-900/60 text-slate-900 dark:text-purple-100';
      else if (colorParam === 'red' || colorParam === 'rose') bgClass = 'bg-rose-200/90 dark:bg-rose-900/60 text-slate-900 dark:text-rose-100';
      else if (colorParam.startsWith('#')) customStyle = { backgroundColor: colorParam };

      nodes.push(
        <mark
          key={key}
          style={customStyle}
          className={`${bgClass} px-1 py-0.5 rounded-sm font-medium`}
        >
          {renderInlineRichFormatting(content, `${key}-bg`)}
        </mark>
      );
    }
    // 13. Font family: [font:NAME]...[/font] or [serif]...[/serif], [mono]...[/mono], [sans]...[/sans]
    else if (fullMatch.startsWith('[font:') || fullMatch.startsWith('[serif]') || fullMatch.startsWith('[mono]') || fullMatch.startsWith('[sans]')) {
      let fontClass = 'font-sans';
      let content = '';
      if (fullMatch.startsWith('[font:')) {
        const fMatch = fullMatch.match(/^\[font:([a-zA-Z0-9-]+)\]([\s\S]*?)\[\/font\]$/i);
        const fontName = fMatch?.[1]?.toLowerCase() || 'sans';
        content = fMatch?.[2] || '';
        if (fontName.includes('serif')) fontClass = 'font-serif';
        else if (fontName.includes('mono')) fontClass = 'font-mono tracking-tight';
      } else if (fullMatch.startsWith('[serif]')) {
        fontClass = 'font-serif';
        content = fullMatch.slice(7, -8);
      } else if (fullMatch.startsWith('[mono]')) {
        fontClass = 'font-mono tracking-tight';
        content = fullMatch.slice(6, -7);
      } else {
        fontClass = 'font-sans';
        content = fullMatch.slice(6, -7);
      }

      nodes.push(
        <span key={key} className={fontClass}>
          {renderInlineRichFormatting(content, `${key}-f`)}
        </span>
      );
    }
    // 14. Font size: [size:SIZE]...[/size]
    else if (fullMatch.startsWith('[size:')) {
      const sMatch = fullMatch.match(/^\[size:([a-zA-Z0-9-]+)\]([\s\S]*?)\[\/size\]$/i);
      const sizeParam = sMatch?.[1]?.toLowerCase() || 'base';
      const content = sMatch?.[2] || '';

      let sizeClass = 'text-base';
      if (sizeParam === 'xs' || sizeParam === '12') sizeClass = 'text-xs leading-normal';
      else if (sizeParam === 'sm' || sizeParam === '14') sizeClass = 'text-sm leading-normal';
      else if (sizeParam === 'base' || sizeParam === 'md' || sizeParam === '16') sizeClass = 'text-base leading-relaxed';
      else if (sizeParam === 'lg' || sizeParam === '18') sizeClass = 'text-lg font-medium leading-relaxed';
      else if (sizeParam === 'xl' || sizeParam === '20' || sizeParam === '22') sizeClass = 'text-xl font-bold leading-snug';
      else if (sizeParam === '2xl' || sizeParam === '24') sizeClass = 'text-2xl font-black leading-tight';

      nodes.push(
        <span key={key} className={sizeClass}>
          {renderInlineRichFormatting(content, `${key}-sz`)}
        </span>
      );
    }
    // 15. Font color: [color:COLOR]...[/color] or [red]...[/red], etc.
    else if (fullMatch.startsWith('[color:') || /^\[(red|blue|green|yellow|amber|purple|gray)\]/i.test(fullMatch)) {
      let colorClass = 'text-slate-900 dark:text-white';
      let customStyle: React.CSSProperties | undefined;
      let content = '';

      if (fullMatch.startsWith('[color:')) {
        const cMatch = fullMatch.match(/^\[color:([a-zA-Z0-9#-]+)\]([\s\S]*?)\[\/color\]$/i);
        const colorParam = cMatch?.[1]?.toLowerCase() || 'inherit';
        content = cMatch?.[2] || '';

        if (colorParam === 'red' || colorParam === 'rose') colorClass = 'text-rose-600 dark:text-rose-400 font-medium';
        else if (colorParam === 'blue' || colorParam === 'sky') colorClass = 'text-sky-600 dark:text-sky-400 font-medium';
        else if (colorParam === 'green' || colorParam === 'emerald') colorClass = 'text-emerald-600 dark:text-emerald-400 font-medium';
        else if (colorParam === 'yellow' || colorParam === 'amber' || colorParam === 'gold') colorClass = 'text-amber-600 dark:text-amber-400 font-medium';
        else if (colorParam === 'purple' || colorParam === 'violet') colorClass = 'text-purple-600 dark:text-purple-400 font-medium';
        else if (colorParam === 'gray' || colorParam === 'slate') colorClass = 'text-slate-500 dark:text-slate-400';
        else if (colorParam.startsWith('#')) customStyle = { color: colorParam };
      } else {
        const cMatch = fullMatch.match(/^\[(red|blue|green|yellow|amber|purple|gray)\]([\s\S]*?)\[\/\1\]$/i);
        const colorParam = cMatch?.[1]?.toLowerCase() || 'inherit';
        content = cMatch?.[2] || '';

        if (colorParam === 'red') colorClass = 'text-rose-600 dark:text-rose-400 font-medium';
        else if (colorParam === 'blue') colorClass = 'text-sky-600 dark:text-sky-400 font-medium';
        else if (colorParam === 'green') colorClass = 'text-emerald-600 dark:text-emerald-400 font-medium';
        else if (colorParam === 'yellow' || colorParam === 'amber') colorClass = 'text-amber-600 dark:text-amber-400 font-medium';
        else if (colorParam === 'purple') colorClass = 'text-purple-600 dark:text-purple-400 font-medium';
        else if (colorParam === 'gray') colorClass = 'text-slate-500 dark:text-slate-400';
      }

      nodes.push(
        <span key={key} style={customStyle} className={colorClass}>
          {renderInlineRichFormatting(content, `${key}-c`)}
        </span>
      );
    }
    // 16. Italic: *...*, _..._, <i>...</i>, <em>...</em>
    else if (fullMatch.startsWith('*') || fullMatch.startsWith('_') || fullMatch.startsWith('<i>') || fullMatch.startsWith('<em>')) {
      const content = fullMatch.startsWith('*') || fullMatch.startsWith('_')
        ? fullMatch.slice(1, -1)
        : fullMatch.startsWith('<i>')
        ? fullMatch.slice(3, -4)
        : fullMatch.slice(4, -5);
      nodes.push(
        <em key={key} className="italic">
          {renderInlineRichFormatting(content, `${key}-i`)}
        </em>
      );
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
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
                {renderInlineRichFormatting(seg.content, `txt-${idx}`)}
              </span>
            );
          }

          if (seg.type === 'hr') {
            return <hr key={idx} className="my-4 border-t border-slate-300 dark:border-slate-700" />;
          }

          if (seg.type === 'quote') {
            return (
              <blockquote
                key={idx}
                className="my-3 p-3.5 sm:p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border-l-4 border-l-purple-500 dark:border-l-purple-400 text-slate-800 dark:text-slate-200 italic leading-relaxed shadow-xs select-text block"
              >
                {renderInlineRichFormatting(seg.content, `qt-${idx}`)}
              </blockquote>
            );
          }

          if (seg.type === 'code-block') {
            return (
              <span
                key={idx}
                className="inline-block align-middle my-0.5 mx-1 sm:mx-1.5 w-fit max-w-full p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 border-l-4 border-l-cyan-600 dark:border-l-cyan-400 font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-100 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed shadow-2xs select-text text-left"
              >
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
