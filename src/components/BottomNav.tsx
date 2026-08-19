import React, { useEffect, useState } from 'react';
import { MainTab } from '../types';
import { Home, CalendarCheck, User, MessageSquare } from 'lucide-react';

export const LotusServiceIcon: React.FC<{ size?: number; strokeWidth?: number; className?: string }> = ({
  size = 19,
  strokeWidth = 2,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`flex-shrink-0 ${className}`}
    aria-hidden="true"
  >
    {/* Top center petal */}
    <path d="M 12 3.2 C 9.2 7 9.2 9.8 12 11.8 C 14.8 9.8 14.8 7 12 3.2 Z" />
    {/* Left bottom leaf */}
    <path d="M 12 20.5 C 5.5 20.5 2.5 15.5 3 11.5 C 7.5 11 11.5 15 12 20.5 Z" />
    {/* Right bottom leaf */}
    <path d="M 12 20.5 C 18.5 20.5 21.5 15.5 21 11.5 C 16.5 11 12.5 15 12 20.5 Z" />
  </svg>
);

interface BottomNavProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => {
      const open = window.innerHeight - vv.height > 120;
      setKeyboardOpen(open);
    };
    vv.addEventListener('resize', check);
    vv.addEventListener('scroll', check);
    check();
    return () => {
      vv.removeEventListener('resize', check);
      vv.removeEventListener('scroll', check);
    };
  }, []);

  if (activeTab === 'admin') return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8e5dc] shadow-[0_-4px_20px_-2px_rgba(27,28,25,0.06)] md:hidden transition-transform duration-300 ${
        keyboardOpen ? 'translate-y-full' : ''
      }`}
    >
      <div className="max-w-[430px] w-full mx-auto h-[78px] px-2 pb-2 pt-1.5 grid grid-cols-5 items-end justify-items-center relative box-border">
        {/* 1. HOME */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="w-full flex flex-col items-center justify-center gap-[4px] cursor-pointer group py-1"
        >
          <Home
            size={19}
            strokeWidth={2}
            className={`flex-shrink-0 transition-colors ${
              activeTab === 'home' ? 'text-[#52634F]' : 'text-[#8C9288] group-hover:text-[#52634F]'
            }`}
          />
          <span
            className={`text-[9px] leading-none tracking-wider uppercase whitespace-nowrap font-semibold transition-colors ${
              activeTab === 'home' ? 'text-[#52634F]' : 'text-[#8C9288]'
            }`}
          >
            HOME
          </span>
        </button>

        {/* 2. SERVICES */}
        <button
          type="button"
          onClick={() => setActiveTab('therapists')}
          className="w-full flex flex-col items-center justify-center gap-[4px] cursor-pointer group py-1"
        >
          <LotusServiceIcon
            size={19}
            strokeWidth={2}
            className={`transition-colors ${
              activeTab === 'therapists' ? 'text-[#52634F]' : 'text-[#8C9288] group-hover:text-[#52634F]'
            }`}
          />
          <span
            className={`text-[9px] leading-none tracking-wider uppercase whitespace-nowrap font-semibold transition-colors ${
              activeTab === 'therapists' ? 'text-[#52634F]' : 'text-[#8C9288]'
            }`}
          >
            SERVICES
          </span>
        </button>

        {/* 3. BOOK (Center Floating Circle) */}
        <button
          type="button"
          onClick={() => setActiveTab('booking')}
          className="w-full flex flex-col items-center justify-center -mt-6 cursor-pointer group"
        >
          <div
            className={`w-[54px] h-[54px] rounded-full bg-[#52634F] flex items-center justify-center shadow-lg group-hover:bg-[#3b4b38] transition-all transform group-hover:scale-105 active:scale-95 border-2 border-white ${
              activeTab === 'booking' ? 'ring-3 ring-[#c5a059] shadow-xl' : ''
            }`}
          >
            <CalendarCheck size={19} strokeWidth={2} className="text-white flex-shrink-0" />
          </div>
          <span
            className={`text-[9px] leading-none font-bold uppercase tracking-wider whitespace-nowrap mt-1.5 transition-colors ${
              activeTab === 'booking' ? 'text-[#52634F]' : 'text-[#8C9288]'
            }`}
          >
            BOOK
          </span>
        </button>

        {/* 4. ABOUT US */}
        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className="w-full flex flex-col items-center justify-center gap-[4px] cursor-pointer group py-1"
        >
          <User
            size={19}
            strokeWidth={2}
            className={`flex-shrink-0 transition-colors ${
              activeTab === 'about' ? 'text-[#52634F]' : 'text-[#8C9288] group-hover:text-[#52634F]'
            }`}
          />
          <span
            className={`text-[9px] leading-none tracking-wider uppercase whitespace-nowrap font-semibold transition-colors ${
              activeTab === 'about' ? 'text-[#52634F]' : 'text-[#8C9288]'
            }`}
          >
            ABOUT US
          </span>
        </button>

        {/* 5. MESSAGE */}
        <button
          type="button"
          onClick={() => setActiveTab('message')}
          className="w-full flex flex-col items-center justify-center gap-[4px] cursor-pointer group py-1"
        >
          <MessageSquare
            size={19}
            strokeWidth={2}
            className={`flex-shrink-0 transition-colors ${
              activeTab === 'message' ? 'text-[#52634F]' : 'text-[#8C9288] group-hover:text-[#52634F]'
            }`}
          />
          <span
            className={`text-[9px] leading-none tracking-wider uppercase whitespace-nowrap font-semibold transition-colors ${
              activeTab === 'message' ? 'text-[#52634F]' : 'text-[#8C9288]'
            }`}
          >
            MESSAGE
          </span>
        </button>
      </div>
    </nav>
  );
};


