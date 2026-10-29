'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  X, 
  ExternalLink, 
  MessageSquare, 
  Copy, 
  Check, 
  CreditCard, 
  GraduationCap, 
  Search, 
  FileText, 
  PhoneCall,
  Info,
  Briefcase,
  BookOpen
} from 'lucide-react';

interface ChatActionLink {
  label: string;
  url: string;
  icon?: 'form' | 'search' | 'info' | 'whatsapp' | 'book' | 'briefcase';
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  suggestions?: string[];
  actionLinks?: ChatActionLink[];
}

const INITIAL_SUGGESTIONS = [
  'Cara daftar PPDB online',
  'Berapa biaya PPDB & bayar QRIS?',
  'Apa saja jurusan yang ada?',
  'Syarat beasiswa KIP / Afirmasi',
  'Cara cek status pendaftaran',
  'Hubungi WhatsApp panitia'
];

export default function Chatbot() {
  const pathname = usePathname();
  // Hanya tampil di halaman beranda depan web ('/'), tidak tampil di halaman user/portal/admin
  const isHomePage = pathname === '/';

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Stop speaking if navigated away from home
  useEffect(() => {
    if (!isHomePage && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isHomePage]);

  // Initialize Speech Recognition & Sound & Local Storage
  useEffect(() => {
    if (!isHomePage) return;

    // Load chat history from localStorage
    try {
      const saved = localStorage.getItem('smk_ai_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          setInitialGreeting();
        }
      } else {
        setInitialGreeting();
      }
    } catch {
      setInitialGreeting();
    }

    // Show tooltip bubble after 3.5s if not already opened
    const tooltipTimer = setTimeout(() => {
      setShowTooltip(true);
    }, 3500);

    return () => clearTimeout(tooltipTimer);
  }, [isHomePage]);

  const setInitialGreeting = () => {
    const greetingMsg: Message = {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Halo! Selamat datang di **SMK Garuda Mahadhika** 🌟\n\nSaya adalah **SMK Asisten AI**, siap membantu Anda 24/7 dengan informasi lengkap seputar:\n• 📝 **Pendaftaran PPDB Online & Persyaratan**\n• 💳 **Biaya Formulir & Pembayaran QRIS / Transfer / Tunai**\n• 💻 **Program Keahlian (TJKT, DKV, MPLB)**\n• 📑 **Jalur Beasiswa KIP / Afirmasi & Prestasi**\n• 🔎 **Cek Status Seleksi & Verifikasi Berkas**\n\nAda yang bisa saya bantu untuk Anda hari ini?',
      time: getCurrentTime(),
      suggestions: INITIAL_SUGGESTIONS,
      actionLinks: [
        { label: 'Daftar PPDB Online', url: '/ppdb', icon: 'form' },
        { label: 'Cek Status Pendaftaran', url: '/ppdb/status', icon: 'search' }
      ]
    };
    setMessages([greetingMsg]);
  };

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('smk_ai_chat_history', JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      // Stop speech if closed
      stopSpeaking();
    }
  }, [isOpen]);

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // Play subtle synth audio feedback (No external audio files needed)
  const playAudioChime = (type: 'send' | 'receive') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'send') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.06);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch {}
  };

  // Text to Speech (TTS)
  const speakText = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking === msgId) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    // Clean markdown symbols for cleaner voice speech
    const cleanSpeech = text
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/•/g, ', ');

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = 'id-ID';
    utterance.rate = 1.05;

    // Pick Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    if (idVoice) utterance.voice = idVoice;

    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    setIsSpeaking(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
    }
  };

  // Voice Input (Speech to Text)
  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung input suara. Silakan gunakan Google Chrome atau Microsoft Edge terbaru.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Copy text to clipboard
  const handleCopy = (text: string, msgId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const clean = text.replace(/[#*`_~]/g, '');
      navigator.clipboard.writeText(clean);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Reset conversation
  const handleReset = () => {
    if (window.confirm('Hapus riwayat obrolan dan mulai percakapan baru?')) {
      stopSpeaking();
      try {
        localStorage.removeItem('smk_ai_chat_history');
      } catch {}
      setInitialGreeting();
    }
  };

  // Send message
  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    stopSpeaking();
    playAudioChime('send');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: getCurrentTime()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const historyContext = updatedMessages.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: historyContext })
      });

      if (!res.ok) throw new Error('Network error');

      const data = await res.json();
      playAudioChime('receive');

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'Mohon maaf, saya belum memahami pertanyaan tersebut. Silakan pilih salah satu opsi bantuan di bawah.',
        time: getCurrentTime(),
        suggestions: data.suggestions || [],
        actionLinks: data.actionLinks || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      playAudioChime('receive');
      const fallbackMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: 'Maaf, terjadi gangguan jaringan saat menghubungi server AI. Anda tetap dapat langsung mengakses portal pendaftaran atau mengecek status di link berikut:',
        time: getCurrentTime(),
        suggestions: ['Cara daftar PPDB online', 'Berapa biaya PPDB?'],
        actionLinks: [
          { label: 'Buka Halaman PPDB', url: '/ppdb', icon: 'form' },
          { label: 'Cek Status PPDB', url: '/ppdb/status', icon: 'search' }
        ]
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Render markdown text neatly (bold, bullets, line breaks, code)
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={i} className="font-extrabold text-slate-900 dark:text-white text-[13px] sm:text-sm mt-2 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-blue-600 rounded-full inline-block"></span>
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('• ') || line.startsWith('- ')) {
        const content = line.substring(2);
        return (
          <div key={i} className="flex items-start gap-2 my-1 pl-1 text-[12.5px] sm:text-[13px] leading-relaxed">
            <span className="text-blue-600 font-black mt-0.5">•</span>
            <span>{parseInlineStyles(content)}</span>
          </div>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={i} className="flex items-start gap-2 my-1 pl-1 text-[12.5px] sm:text-[13px] leading-relaxed font-normal">
            <span className="font-bold text-blue-600 font-mono text-xs mt-0.5">{line.match(/^\d+\./)?.[0]}</span>
            <span>{parseInlineStyles(line.replace(/^\d+\.\s/, ''))}</span>
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={i} className="h-1.5" />;
      }
      return (
        <p key={i} className="my-1 text-[12.5px] sm:text-[13px] leading-relaxed text-slate-800 dark:text-slate-100">
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-slate-950 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="px-1.5 py-0.5 mx-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded font-mono text-[11px] border border-blue-200 dark:border-blue-800">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const renderActionIcon = (icon?: string) => {
    switch (icon) {
      case 'form': return <GraduationCap size={13} className="text-blue-600 dark:text-blue-400" />;
      case 'search': return <Search size={13} className="text-emerald-600 dark:text-emerald-400" />;
      case 'whatsapp': return <PhoneCall size={13} className="text-green-600 dark:text-green-400" />;
      case 'briefcase': return <Briefcase size={13} className="text-indigo-600 dark:text-indigo-400" />;
      case 'book': return <BookOpen size={13} className="text-violet-600 dark:text-violet-400" />;
      default: return <ExternalLink size={13} className="text-blue-600 dark:text-blue-400" />;
    }
  };

  if (!isHomePage) {
    return null;
  }

  return (
    <>
      {/* Smart Greeting Tooltip Bubble */}
      {showTooltip && !isOpen && (
        <div className="fixed bottom-24 right-6 z-50 max-w-[280px] bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-900/50 p-3.5 rounded-2xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.25)] animate-in slide-in-from-bottom-3 duration-300 flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
            <Bot size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                SMK Asisten AI
              </span>
              <button 
                onClick={() => setShowTooltip(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-0.5"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 leading-snug">
              Ada pertanyaan seputar <strong>PPDB, Jurusan</strong> atau <strong>Bayar QRIS</strong>? Yuk tanyakan!
            </p>
            <button 
              onClick={() => {
                setShowTooltip(false);
                setIsOpen(true);
              }}
              className="mt-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Mulai Chat Sekarang &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Floating Modern Circular Trigger Button */}
      <div className={`fixed bottom-6 right-6 z-50 ${isOpen ? 'hidden' : 'block'}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative group p-4 sm:p-4.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white rounded-full shadow-[0_10px_35px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_15px_40px_-5px_rgba(79,70,229,0.7)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center border-2 border-white/30"
          title="Tanya SMK Asisten AI"
          aria-label="Buka Chat AI"
        >
          {/* Pulsing Aura Ring */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 opacity-60 blur-md group-hover:opacity-90 animate-pulse transition-opacity"></span>

          {/* Online green indicator badge */}
          <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
          </span>

          <div className="relative flex items-center gap-2">
            <Bot size={26} className="text-white drop-shadow-sm transition-transform group-hover:rotate-6" />
            <Sparkles size={14} className="absolute -top-1 -right-1 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </button>
      </div>

      {/* Futuristic AI Chat Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_25px_80px_-15px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-gray-800 flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-5 ${
            isExpanded
              ? 'inset-3 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[650px] sm:h-[82vh] sm:max-h-[740px]'
              : 'bottom-4 right-3 sm:bottom-6 sm:right-6 w-[calc(100vw-24px)] sm:w-[410px] h-[580px] max-h-[88vh]'
          }`}
        >
          {/* Top High-Tech Header */}
          <div className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 text-white flex justify-between items-center border-b border-white/10 flex-shrink-0 select-none">
            {/* Background cyber accent */}
            <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>

            <div className="relative flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg border border-white/20">
                <Bot size={22} />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">SMK Asisten AI</h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                    24/7
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] text-slate-300">Garuda Mahadhika Virtual Advisor</span>
                </div>
              </div>
            </div>

            {/* Header Control Actions */}
            <div className="relative flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  soundEnabled ? 'text-blue-300 hover:bg-white/10' : 'text-slate-500 hover:bg-white/10'
                }`}
                title={soundEnabled ? 'Matikan Suara Chime' : 'Aktifkan Suara Chime'}
              >
                {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>

              {/* Reset Chat */}
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Reset Percakapan"
              >
                <RotateCcw size={16} />
              </button>

              {/* Expand / Minimize Window */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title={isExpanded ? 'Kecilkan Jendela' : 'Perbesar Jendela'}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Close Window */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Tutup Chat"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          {/* Conversation Feed */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto bg-slate-50/70 dark:bg-gray-950/70 flex flex-col gap-3.5 custom-scrollbar">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
              >
                {/* Bubble Container */}
                <div 
                  className={`relative max-w-[88%] sm:max-w-[82%] p-3.5 rounded-2xl shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-gray-800 border border-slate-200/90 dark:border-gray-700 text-slate-900 dark:text-slate-100 rounded-tl-none'
                  }`}
                >
                  {/* Sender Header for Bot */}
                  {msg.sender === 'bot' && (
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-gray-700/80">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={12} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Asisten Pintar SMK
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{msg.time}</span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="break-words">
                    {msg.sender === 'user' ? (
                      <p className="text-[13px] leading-relaxed font-medium">{msg.text}</p>
                    ) : (
                      <div>{renderFormattedText(msg.text)}</div>
                    )}
                  </div>

                  {/* Action Links (Rich interactive buttons inside bot response) */}
                  {msg.actionLinks && msg.actionLinks.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-gray-700/80 flex flex-wrap gap-2">
                      {msg.actionLinks.map((action, idx) => (
                        action.url.startsWith('http') ? (
                          <a
                            key={idx}
                            href={action.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 transition-all active:scale-95 shadow-xs"
                          >
                            {renderActionIcon(action.icon)}
                            <span>{action.label}</span>
                          </a>
                        ) : (
                          <Link
                            key={idx}
                            href={action.url}
                            onClick={() => {
                              // On mobile, close to allow user to view the destination page
                              if (window.innerWidth < 640) setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 transition-all active:scale-95 shadow-xs"
                          >
                            {renderActionIcon(action.icon)}
                            <span>{action.label}</span>
                          </Link>
                        )
                      ))}
                    </div>
                  )}

                  {/* Bot Message Toolbar (Voice TTS & Copy) */}
                  {msg.sender === 'bot' && (
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-gray-700/60 text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        {/* Listen via TTS */}
                        <button
                          type="button"
                          onClick={() => speakText(msg.text, msg.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                            isSpeaking === msg.id 
                              ? 'bg-blue-600 text-white' 
                              : 'hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-slate-300'
                          }`}
                          title="Dengarkan Suara"
                        >
                          <Volume2 size={12} className={isSpeaking === msg.id ? 'animate-bounce' : ''} />
                          <span>{isSpeaking === msg.id ? 'Berhenti' : 'Dengarkan'}</span>
                        </button>

                        {/* Copy text */}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.text, msg.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-slate-300 text-[10px] font-semibold transition-colors cursor-pointer"
                          title="Salin Pesan"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          <span>{copiedId === msg.id ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </div>

                      <span className="text-[9px] text-slate-400">SMK GaMa AI</span>
                    </div>
                  )}

                  {/* User message timestamp */}
                  {msg.sender === 'user' && (
                    <div className="text-right mt-1">
                      <span className="text-[9px] text-blue-200 font-mono">{msg.time}</span>
                    </div>
                  )}
                </div>

                {/* Suggestions Pills attached to this message if it is the latest bot message */}
                {msg.sender === 'bot' && msg.suggestions && msg.suggestions.length > 0 && messages[messages.length - 1]?.id === msg.id && (
                  <div className="mt-2.5 max-w-full">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5 uppercase tracking-wider pl-1">
                      💡 Saran Topik Cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => sendMessage(sug)}
                          disabled={isLoading}
                          className="px-2.5 py-1 text-xs bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-700 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-gray-700 transition-all active:scale-95 shadow-2xs text-left cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2 animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={16} />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    SMK AI sedang merespons
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Input Active Toast */}
          {isListening && (
            <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 animate-pulse">
              <div className="flex items-center gap-2 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                <span>Mendengarkan suara Anda... Silakan berbicara.</span>
              </div>
              <button 
                type="button" 
                onClick={toggleVoiceInput}
                className="text-xs font-bold underline cursor-pointer"
              >
                Selesai
              </button>
            </div>
          )}

          {/* Bottom Chat Input Bar */}
          <div className="p-3 bg-white dark:bg-gray-900 border-t border-slate-200/90 dark:border-gray-800 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              {/* Voice Input Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-slate-300'
                }`}
                title={isListening ? 'Hentikan Input Suara' : 'Bicara lewat Mikrofon'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Text Input Field */}
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pertanyaan (PPDB, Jurusan, Biaya, QRIS)..."
                  className="w-full pl-3.5 pr-8 py-2.5 bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 border border-transparent focus:border-blue-400 transition-all"
                  disabled={isLoading}
                />
                {input && (
                  <button
                    type="button"
                    onClick={() => setInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Send Submit Button */}
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-md shadow-blue-500/25 transition-all duration-150 active:scale-95 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                title="Kirim Pertanyaan"
              >
                <Send size={18} />
              </button>
            </form>

            {/* Micro Footer Notice */}
            <div className="mt-2 text-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Ditenagai AI SMK Garuda Mahadhika • Jawaban Cepat & Terpercaya
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
