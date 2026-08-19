import React, { useState } from 'react';
import { MainTab, ContactSettings } from '../types';
import { ShieldCheck, X, Home, CalendarCheck, User, MessageSquare } from 'lucide-react';

const GoldenMonogramLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M37 18V92C37 99.732 43.268 106 51 106H63C82.882 106 99 90.882 99 71C99 51.118 82.882 35 63 35H37"
      stroke="#C5A059"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M58 38C74 34 89 42 95 57C101 73 94 89 81 96C66 104 46 98 36 84"
      stroke="#C5A059"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M36 18C38.5 31 47 38 56 41"
      stroke="#C5A059"
      strokeWidth="6"
      strokeLinecap="round"
    />
  </svg>
);

const LotusServiceIcon: React.FC<{ size?: number; strokeWidth?: number; className?: string }> = ({
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
    <path d="M 12 3.2 C 9.2 7 9.2 9.8 12 11.8 C 14.8 9.8 14.8 7 12 3.2 Z" />
    <path d="M 12 20.5 C 5.5 20.5 2.5 15.5 3 11.5 C 7.5 11 11.5 15 12 20.5 Z" />
    <path d="M 12 20.5 C 18.5 20.5 21.5 15.5 21 11.5 C 16.5 11 12.5 15 12 20.5 Z" />
  </svg>
);

interface HeaderProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  contactSettings?: ContactSettings;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  setIsAdmin,
  contactSettings = {
    whatsappNumber: '6260104019',
    callNumber: '6260104019',
    contactEmail: 'premiumspaindore@gmail.com',
    instagramUrl: 'https://instagram.com',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    brandName: 'Premium Spa',
    brandLogoUrl: 'https://placehold.co/300x180/F9F5EC/C5A059?text=LOGO',
    heroDesktopImageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80',
    heroLaptopImageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80',
    experienceHomeImageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80',
    experienceHotelImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    experienceTherapistImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
  },
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (tab: MainTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md w-full h-[80px] px-5 lg:px-8 flex flex-row items-center justify-between border-b border-[#e8e5dc]/80 transition-all duration-200"
      >
        {/* Left: Spa Logo & Brand Name */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleNavClick('home')}
            aria-label="Home"
            className="w-[33px] h-[40px] flex items-center justify-center cursor-pointer focus:outline-none hover:opacity-80 transition-opacity flex-shrink-0"
          >
            {contactSettings?.brandLogoUrl ? (
              <img
                src={contactSettings.brandLogoUrl}
                alt={contactSettings.brandName || 'Premium Spa logo'}
                className="w-full h-full object-contain"
              />
            ) : (
              <GoldenMonogramLogo size={33} className="w-full h-full" />
            )}
          </button>

          <button
            onClick={() => handleNavClick('home')}
            className="hidden md:flex items-center cursor-pointer focus:outline-none group"
          >
            <span className="font-[Manrope] text-[20px] font-normal text-[#52634F] uppercase group-hover:text-[#1b241a] transition-colors">
              {contactSettings?.brandName || 'Premium Spa'}
            </span>
          </button>
        </div>

        <div className="flex md:hidden items-center justify-center">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center justify-center cursor-pointer focus:outline-none group"
          >
            <span className="font-[Manrope] text-[20px] leading-[27px] font-normal text-[#52634F] uppercase group-hover:text-[#1b241a] transition-colors">
              {contactSettings?.brandName || 'Premium Spa'}
            </span>
          </button>
        </div>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-xs lg:text-sm font-semibold tracking-wider text-[#454843]">
          <button
            onClick={() => handleNavClick('home')}
            className={`transition-colors duration-200 hover:text-[#52634f] cursor-pointer relative py-1 ${
              activeTab === 'home'
                ? 'text-[#52634f] font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#52634f] after:rounded-full'
                : 'text-[#454843]'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('therapists')}
            className={`transition-colors duration-200 hover:text-[#52634f] cursor-pointer relative py-1 ${
              activeTab === 'therapists'
                ? 'text-[#52634f] font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#52634f] after:rounded-full'
                : 'text-[#454843]'
            }`}
          >
            Services
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className={`transition-colors duration-200 hover:text-[#52634f] cursor-pointer relative py-1 ${
              activeTab === 'about'
                ? 'text-[#52634f] font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#52634f] after:rounded-full'
                : 'text-[#454843]'
            }`}
          >
            About Us
          </button>
          <button
            onClick={() => handleNavClick('message')}
            className={`transition-colors duration-200 hover:text-[#52634f] cursor-pointer relative py-1 ${
              activeTab === 'message'
                ? 'text-[#52634f] font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#52634f] after:rounded-full'
                : 'text-[#454843]'
            }`}
          >
            Message
          </button>
        </nav>

        {/* Right Actions: Desktop Book Button & Drawer Trigger */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleNavClick('booking')}
            className="hidden md:inline-flex items-center justify-center bg-[#52634F] hover:bg-[#3d4b3a] text-white px-4 py-2 rounded-full font-sans font-bold text-xs uppercase tracking-widest transition-all duration-300 transform hover:scale-105 shadow-xs hover:shadow-md cursor-pointer"
          >
            Book Now
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Open Navigation Menu"
            className="w-[33px] h-[33.27px] flex flex-col items-center justify-center cursor-pointer focus:outline-none hover:opacity-80 transition-opacity md:hidden"
          >
            <div className="w-[17px] h-[11.27px] flex flex-col justify-between items-center">
              <span className="w-[17px] h-[2px] bg-[#8F918E] rounded-full block"></span>
              <span className="w-[17px] h-[2px] bg-[#8F918E] rounded-full block"></span>
              <span className="w-[17px] h-[2px] bg-[#8F918E] rounded-full block"></span>
            </div>
          </button>
        </div>
      </header>

      {/* Slide-out Menu Overlay Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="bg-[#fbf9f4] w-72 h-full shadow-2xl p-5 flex flex-col justify-between border-l border-[#e9e8e3]">
            {/* Drawer Header */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#e9e8e3] pb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 flex items-center justify-center rounded-full bg-[#f7f0dd] overflow-hidden">
                    {contactSettings?.brandLogoUrl ? (
                      <img src={contactSettings.brandLogoUrl} alt="Premium Spa logo" className="w-full h-full object-contain" />
                    ) : (
                      <GoldenMonogramLogo size={22} className="w-full h-full" />
                    )}
                  </div>
                  <span className="font-serif text-sm font-semibold tracking-wider text-[#52634f] uppercase">
                    PREMIUM SPA
                  </span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-full text-[#747871] hover:bg-[#efeee8] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1.5">
                {[
                  { id: 'home', label: 'Home Experience', icon: Home },
                  { id: 'therapists', label: 'Therapists & Services', icon: LotusServiceIcon },
                  { id: 'booking', label: 'Book Appointment', icon: CalendarCheck },
                  { id: 'about', label: 'About & Policies', icon: User },
                  { id: 'message', label: 'Spa Concierge Support', icon: MessageSquare },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id as MainTab)}
                      className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#52634f] text-white shadow-xs'
                          : 'text-[#444841] hover:bg-[#efeee8]'
                      }`}
                    >
                      <Icon size={19} strokeWidth={2} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-[#52634f]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Admin Console Switch */}
              <div className="pt-4 border-t border-[#e9e8e3]">
                <button
                  onClick={() => {
                    const nextAdmin = !isAdmin;
                    setIsAdmin(nextAdmin);
                    if (nextAdmin) handleNavClick('admin');
                    else if (activeTab === 'admin') handleNavClick('home');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isAdmin
                      ? 'bg-[#1b1c19] text-white border-[#1b1c19]'
                      : 'bg-[#efeee8] text-[#52634f] border-[#c4c8bf] hover:bg-[#e4e2dd]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#52634f]" />
                    <span>Management Console</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                    isAdmin ? 'bg-[#d5e8cf] text-[#3b4b38]' : 'bg-white text-[#747871]'
                  }`}>
                    {isAdmin ? 'ACTIVE' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-[#e9e8e3] pt-4 text-center space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-[#747871] block">
                Luxury Doorstep Wellness
              </span>
              <p className="text-[11px] text-[#52634f] font-serif">Support: {contactSettings.callNumber}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
