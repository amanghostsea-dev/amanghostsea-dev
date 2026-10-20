'use client';

import { useState } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Halo! Saya Asisten Virtual SMK. Ada yang bisa saya bantu terkait informasi sekolah atau PPDB?', sender: 'bot' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Tambah pesan user
    const newMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages([...messages, newMsg]);
    setInput('');

    // Simulasi balasan AI
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Ini adalah fitur demo. Nantinya saya akan dihubungkan ke sistem AI (seperti Gemini/OpenAI) untuk menjawab pertanyaan Anda secara spesifik!',
        sender: 'bot'
      }]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all duration-150 active:scale-95 cursor-pointer z-50 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Bot size={24} />
              <div>
                <h3 className="font-bold text-sm">SMK Asisten AI</h3>
                <p className="text-xs text-blue-200">Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
              <X size={20} />
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ketik pertanyaan..." 
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
