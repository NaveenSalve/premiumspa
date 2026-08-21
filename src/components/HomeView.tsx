import React, { useState } from 'react';
import { SpaService, MainTab, ClientReview, Therapist, ContactSettings } from '../types';
import { CLIENT_REVIEWS } from '../data/mockData';
import { Phone, MessageCircle, Instagram, ArrowRight, ShieldCheck, Heart, Sparkles, Star, UserCheck, Mail, Lock, ExternalLink, X } from 'lucide-react';
import heroSpaImage from '../assets/images/golden_spa_hero_1786213897469.jpg';
import tile1Img from '../assets/images/tile_oil_candles_1786019003018.jpg';
import tile2Img from '../assets/images/tile_back_massage_1786019026262.jpg';
import tile3Img from '../assets/images/tile_herbal_compress_1786019046167.jpg';
import tile4Img from '../assets/images/tile_foot_bath_1786019068814.jpg';
import { HeroImage, CardImage, ResponsiveImage, ThumbnailImage, generatePreloadLinks } from './ResponsiveImage';

interface HomeViewProps {
  services: SpaService[];
  therapists?: Therapist[];
  contactSettings?: ContactSettings;
  setActiveTab: (tab: MainTab) => void;
  onSelectService: (service: SpaService) => void;
  onSelectTherapist?: (therapist: Therapist) => void;
}

const FAVORITES_STORAGE_KEY = 'premium_spa_favorites';

const readStoredFavorites = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const HomeView: React.FC<HomeViewProps> = ({
  services,
  therapists = [],
  contactSettings = {
    whatsappNumber: '6260104019',
    callNumber: '6260104019',
    contactEmail: 'premiumspaindore@gmail.com',
    instagramUrl: 'https://instagram.com',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    brandName: 'Premium Spa',
    brandLogoUrl: 'https://placehold.co/300x180/F9F5EC/C5A059?text=LOGO',
    heroDesktopImageUrl: heroSpaImage,
    heroLaptopImageUrl: heroSpaImage,
    experienceHomeImageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80',
    experienceHotelImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    experienceTherapistImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
  },
  setActiveTab,
  onSelectService,
  onSelectTherapist,
}) => {
  const [reviews, setReviews] = useState<ClientReview[]>(CLIENT_REVIEWS);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<SpaService | null>(null);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewQuote, setNewReviewQuote] = useState('');
  const [homeFavorites, setHomeFavorites] = useState<Record<string, boolean>>(() => readStoredFavorites());
  const visibleServices = services.filter((s) => s.visible !== false);
  const heroImageDesktop = contactSettings?.heroDesktopImageUrl || heroSpaImage;

  React.useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(homeFavorites));
  }, [homeFavorites]);

  const toggleHomeFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHomeFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedHomeTherapists = [...therapists].sort((a, b) => {
    const aFav = homeFavorites[a.id] ? 1 : 0;
    const bFav = homeFavorites[b.id] ? 1 : 0;
    return bFav - aFav;
  });

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewQuote.trim()) return;
    const newRev: ClientReview = {
      id: `rev-${Date.now()}`,
      clientName: newReviewName,
      isTrusted: true,
      rating: 5,
      quote: newReviewQuote,
      date: 'Just now',
    };
    setReviews([newRev, ...reviews]);
    setNewReviewName('');
    setNewReviewQuote('');
    setShowReviewModal(false);
  };

  return (
    <>
      {/* Preload critical hero images */}
      {generatePreloadLinks([
        { src: heroImageDesktop, as: 'image' },
        { src: contactSettings?.brandLogoUrl || '', as: 'image' },
      ])}
      
      <div className="pb-28 space-y-10 animate-fade-in">
        {/* HERO SECTION */}
        <section className="relative min-h-[500px] md:min-h-[560px] lg:min-h-[620px] rounded-b-[36px] overflow-hidden shadow-md flex flex-col justify-end p-6 md:p-12 lg:p-16 text-center text-white">
          <HeroImage
            src={heroImageDesktop}
            alt="World-Class Spa Delivered"
            className="absolute inset-0 w-full h-full object-cover brightness-[0.82] contrast-[1.05] transition-transform duration-1000 hover:scale-105"
            placeholder={heroSpaImage}
          />
          {/* Warm Dark Gradient Overlay for Maximum Readability & Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121812] via-[#121812]/55 to-[#121812]/20 md:bg-gradient-to-t md:from-[#121812]/90 md:via-[#121812]/45 md:to-transparent" />

        <div className="relative z-10 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto flex flex-col items-center justify-center space-y-4 pb-2 text-center">
          {/* AT YOUR DOORSTEP */}
          <span className="font-sans font-semibold text-[12px] leading-[16px] tracking-[2.4px] uppercase text-[#D5E8CF] md:text-[#e2f0dc] drop-shadow-xs">
            AT YOUR DOORSTEP
          </span>

          {/* HOME SPA - Luxury Serif Typography with Uppercase Letter Spacing */}
          <h1 className="font-serif font-normal text-[32px] sm:text-[40px] md:text-[54px] lg:text-[64px] leading-[40px] md:leading-[64px] text-[#fbf9f4] tracking-[0.1em] md:tracking-[0.18em] uppercase text-center drop-shadow-md">
            HOME SPA
          </h1>

          {/* Premium wellness treatments delivered to your home by certified therapists. */}
          <p className="font-sans font-normal text-[10px] sm:text-[12px] md:text-[14px] leading-[14px] sm:leading-[18px] md:leading-[22px] text-[#E4E2DD] max-w-[370px] sm:max-w-md md:max-w-xl mx-auto text-center font-light">
            Premium wellness treatments delivered to your home by certified therapists.
          </p>

          {/* EXPLORE SERVICES Button with Desktop Scale/Glow Hover Effect */}
          <div className="pt-3">
            <button
              onClick={() => {
                const servicesElem = document.getElementById('wellness-services');
                if (servicesElem) {
                  servicesElem.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setActiveTab('booking');
                }
              }}
              className="w-[160px] sm:w-[170px] md:w-[210px] h-[36px] sm:h-[40px] md:h-[46px] bg-[#52634F] hover:bg-[#3d4b3a] text-white rounded-full font-sans font-semibold text-[12px] md:text-[13px] leading-[16px] tracking-[1.2px] md:tracking-[2px] uppercase flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md hover:shadow-[0_0_24px_rgba(197,160,89,0.45)] hover:scale-105 active:scale-95"
            >
              EXPLORE SERVICES
            </button>
          </div>
        </div>
      </section>

      {/* OUR OFFERINGS SECTION (Glassmorphism Cards / Figma Frame 577 Layout) */}
      <section className="px-4 max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto space-y-6 md:space-y-10">
        <div className="text-center space-y-1 md:space-y-2">
          <span className="text-[10px] md:text-xs font-bold tracking-[0.22em] text-[#747871] uppercase">
            OUR OFFERINGS
          </span>
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl xl:text-5xl text-[#1b1c19] font-normal">
            Choose Your Experience
          </h2>
          <p className="text-xs md:text-sm lg:text-base text-[#747871] leading-relaxed max-w-xs md:max-w-lg lg:max-w-xl mx-auto">
            Select your preferred location — our certified therapist arrives with all specialized equipment.
          </p>
        </div>

        {/* Mobile View: Frame 577 - Horizontally Scrollable (< md) (Unchanged) */}
        <div className="flex md:hidden flex-row items-center justify-start gap-[10px] sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar">
          {/* Card 1: Home Service */}
          <div className="w-[180px] h-[291px] flex-shrink-0 bg-white border border-[#ABABAB] rounded-[15px] p-[20px] flex flex-col justify-center items-center gap-[13px] shadow-2xs hover:border-[#52634F] hover:shadow-md transition-all duration-300">
            <div className="w-[136px] h-[116px] rounded-lg overflow-hidden bg-[#efeee8] flex-shrink-0">
              <CardImage
                src={contactSettings.experienceHomeImageUrl || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80'}
                alt="Home Service"
                className="w-full h-full"
                aspectRatio="landscape"
              />
            </div>
            <div className="w-[136px] h-[122px] flex flex-col justify-between items-center text-center">
              <div className="space-y-1 w-full">
                <h3 className="font-sans font-semibold text-[12px] leading-[16px] text-[#1B1C19] text-center">
                  Home Service
                </h3>
                <p className="font-sans font-normal text-[10px] leading-[14px] text-[#454843] text-center line-clamp-3">
                  Our certified therapist arrive at your door step and provide our services.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('therapists')}
                className="w-[136px] h-[35px] bg-[#52634F] hover:bg-[#3d4b3a] text-white rounded-full flex items-center justify-center gap-[5px] transition-colors cursor-pointer"
              >
                <span className="font-sans font-medium text-[12px] leading-[16px] tracking-[1.2px] uppercase text-white">
                  BOOK
                </span>
                <ArrowRight className="w-[10px] h-[10px] text-white" />
              </button>
            </div>
          </div>

          {/* Card 2: Hotel Service */}
          <div className="w-[180px] h-[291px] flex-shrink-0 bg-white border border-[#ABABAB] rounded-[15px] p-[20px] flex flex-col justify-center items-center gap-[13px] shadow-2xs hover:border-[#52634F] hover:shadow-md transition-all duration-300">
            <div className="w-[136px] h-[116px] rounded-lg overflow-hidden bg-[#efeee8] flex-shrink-0">
              <CardImage
                src={contactSettings.experienceHotelImageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'}
                alt="Hotel Service"
                className="w-full h-full"
                aspectRatio="landscape"
              />
            </div>
            <div className="w-[136px] h-[122px] flex flex-col justify-between items-center text-center">
              <div className="space-y-1 w-full">
                <h3 className="font-sans font-semibold text-[12px] leading-[16px] text-[#1B1C19] text-center">
                  Hotel Service
                </h3>
                <p className="font-sans font-normal text-[10px] leading-[14px] text-[#454843] text-center line-clamp-3">
                  We come to your booking hotel and turned your room into a wellness sanctuary.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('therapists')}
                className="w-[136px] h-[35px] bg-[#52634F] hover:bg-[#3d4b3a] text-white rounded-full flex items-center justify-center gap-[5px] transition-colors cursor-pointer"
              >
                <span className="font-sans font-medium text-[12px] leading-[16px] tracking-[1.2px] uppercase text-white">
                  BOOK
                </span>
                <ArrowRight className="w-[10px] h-[10px] text-white" />
              </button>
            </div>
          </div>

          {/* Card 3: Book Therapist */}
          <div className="w-[180px] h-[291px] flex-shrink-0 bg-white border border-[#ABABAB] rounded-[15px] p-[20px] flex flex-col justify-center items-center gap-[13px] shadow-2xs hover:border-[#52634F] hover:shadow-md transition-all duration-300">
            <div className="w-[136px] h-[116px] rounded-lg overflow-hidden bg-[#efeee8] flex-shrink-0">
              <CardImage
                src={contactSettings.experienceTherapistImageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80'}
                alt="Book Therapist"
                className="w-full h-full"
                aspectRatio="landscape"
              />
            </div>
            <div className="w-[136px] h-[122px] flex flex-col justify-between items-center text-center">
              <div className="space-y-1 w-full">
                <h3 className="font-sans font-semibold text-[12px] leading-[16px] text-[#1B1C19] text-center">
                  Book Therapist
                </h3>
                <p className="font-sans font-normal text-[10px] leading-[14px] text-[#454843] text-center line-clamp-3">
                  Choose your therapist compare ratings and reviews and book the right one.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('therapists')}
                className="w-[136px] h-[35px] bg-[#52634F] hover:bg-[#3d4b3a] text-white rounded-full flex items-center justify-center gap-[5px] transition-colors cursor-pointer"
              >
                <span className="font-sans font-medium text-[12px] leading-[16px] tracking-[1.2px] uppercase text-white">
                  BOOK
                </span>
                <ArrowRight className="w-[10px] h-[10px] text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop View: Wide Grid with Vertical Cards (>= md) */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8 pt-2">
          {/* Card 1: Home Service */}
          <div
            onClick={() => setActiveTab('therapists')}
            className="bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between w-full"
          >
            {/* Image Block */}
            <div className="w-full h-52 overflow-hidden bg-stone-100 relative flex-shrink-0">
              <CardImage
                src={contactSettings.experienceHomeImageUrl || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80'}
                alt="Home Service"
                className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                aspectRatio="landscape"
              />
              <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors duration-300" />
            </div>

            {/* Content Block */}
            <div className="p-6 flex flex-col justify-between flex-1 space-y-4 text-left bg-white">
              <div className="space-y-2">
                <h3 className="font-serif text-xl text-stone-800 group-hover:text-[#4A604A] transition-colors font-medium">
                  Home Service
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Our certified therapist arrive at your door step and provide our services.
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('therapists');
                }}
                className="bg-[#4A604A] hover:bg-[#384a38] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all duration-300 cursor-pointer self-start flex items-center gap-2"
              >
                <span>BOOK</span>
                <ArrowRight className="w-3.5 h-3.5 text-white transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Card 2: Hotel Service */}
          <div
            onClick={() => setActiveTab('therapists')}
            className="bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between w-full"
          >
            {/* Image Block */}
            <div className="w-full h-52 overflow-hidden bg-stone-100 relative flex-shrink-0">
              <CardImage
                src={contactSettings.experienceHotelImageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'}
                alt="Hotel Service"
                className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                aspectRatio="landscape"
              />
              <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors duration-300" />
            </div>

            {/* Content Block */}
            <div className="p-6 flex flex-col justify-between flex-1 space-y-4 text-left bg-white">
              <div className="space-y-2">
                <h3 className="font-serif text-xl text-stone-800 group-hover:text-[#4A604A] transition-colors font-medium">
                  Hotel Service
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  We come to your booking hotel and turned your room into a wellness sanctuary.
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('therapists');
                }}
                className="bg-[#4A604A] hover:bg-[#384a38] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all duration-300 cursor-pointer self-start flex items-center gap-2"
              >
                <span>BOOK</span>
                <ArrowRight className="w-3.5 h-3.5 text-white transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Card 3: Book Therapist */}
          <div
            onClick={() => setActiveTab('therapists')}
            className="bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col justify-between w-full"
          >
            {/* Image Block */}
            <div className="w-full h-52 overflow-hidden bg-stone-100 relative flex-shrink-0">
              <CardImage
                src={contactSettings.experienceTherapistImageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80'}
                alt="Book Therapist"
                className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                aspectRatio="landscape"
              />
              <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors duration-300" />
            </div>

            {/* Content Block */}
            <div className="p-6 flex flex-col justify-between flex-1 space-y-4 text-left bg-white">
              <div className="space-y-2">
                <h3 className="font-serif text-xl text-stone-800 group-hover:text-[#4A604A] transition-colors font-medium">
                  Book Therapist
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Choose your therapist compare ratings and reviews and book the right one.
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('therapists');
                }}
                className="bg-[#4A604A] hover:bg-[#384a38] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all duration-300 cursor-pointer self-start flex items-center gap-2"
              >
                <span>BOOK</span>
                <ArrowRight className="w-3.5 h-3.5 text-white transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK CONTACT PILL BAR */}
      <section className="px-4 max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto my-4 md:my-8">
        <div className="bg-white border border-stone-200/80 shadow-sm md:shadow-md rounded-2xl md:rounded-2xl py-3 px-4 md:py-5 md:px-10 w-full flex items-center justify-between md:justify-around gap-2 md:gap-6 overflow-hidden">
          {/* WhatsApp */}
          <a
            href={`https://wa.me/${contactSettings.whatsappNumber.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-row items-center justify-center gap-2 sm:gap-3.5 py-1 hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <svg className="w-5 h-5 md:w-6 md:h-6 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662a11.87 11.87 0 005.708 1.454h.005c6.554 0 11.89-5.335 11.894-11.893a11.82 11.82 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="flex flex-col justify-center items-start text-left">
              <span className="font-sans font-semibold text-xs md:text-sm text-stone-800 whitespace-nowrap">
                WhatsApp
              </span>
              <span className="font-sans font-normal text-[10px] md:text-xs text-stone-500 whitespace-nowrap">
                Chat with us
              </span>
            </div>
          </a>

          <div className="h-8 md:h-10 w-px bg-stone-200/80 hidden md:block" />

          {/* Call Now */}
          <a
            href={`tel:${contactSettings.callNumber.replace(/\s+/g, '')}`}
            className="flex-1 flex flex-row items-center justify-center gap-2 sm:gap-3.5 py-1 hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#22C55E] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Phone className="w-5 h-5 md:w-5 md:h-5 text-white fill-current" />
            </div>
            <div className="flex flex-col justify-center items-start text-left">
              <span className="font-sans font-semibold text-xs md:text-sm text-stone-800 whitespace-nowrap">
                Call Now
              </span>
              <span className="font-sans font-normal text-[10px] md:text-xs text-stone-500 whitespace-nowrap">
                Direct Call
              </span>
            </div>
          </a>

          <div className="h-8 md:h-10 w-px bg-stone-200/80 hidden md:block" />

          {/* Instagram */}
          <a
            href={contactSettings.instagramUrl.startsWith('http') ? contactSettings.instagramUrl : `https://instagram.com/${contactSettings.instagramUrl.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-row items-center justify-center gap-2 sm:gap-3.5 py-1 hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Instagram className="w-5 h-5 md:w-5 md:h-5 text-white" />
            </div>
            <div className="flex flex-col justify-center items-start text-left">
              <span className="font-sans font-semibold text-xs md:text-sm text-stone-800 whitespace-nowrap">
                Instagram
              </span>
              <span className="font-sans font-normal text-[10px] md:text-xs text-stone-500 whitespace-nowrap">
                Social media
              </span>
            </div>
          </a>
        </div>
      </section>

      {/* AFFORDABLE SPA SERVICE / COMPLETE WELLNESS SECTION (FIGMA MATCHING FRAME 5 / FRAME 1 & FRAME 4 CARDS) */}
      <section id="wellness-services" className="px-4 max-w-md md:max-w-7xl mx-auto space-y-6 md:space-y-8 pt-[30px] pb-[20px] scroll-mt-24">
        {/* Section Header (Frame 1) */}
        <div className="text-center space-y-2 flex flex-col items-center justify-center pt-[10px] pb-[10px]">
          <span className="font-sans font-semibold text-[12px] leading-[16px] tracking-[2.4px] uppercase text-[#52634F] text-center">
            AFFORDABLE SPA SERVICE
          </span>
          <h2 className="font-serif font-normal text-[28px] sm:text-[32px] md:text-[38px] leading-[36px] sm:leading-[40px] md:leading-[46px] text-[#1B1C19] text-center">
            Complete Wellness
          </h2>
          <p className="font-sans font-normal text-[14px] sm:text-[16px] leading-[22px] sm:leading-[26px] text-[#454843] text-center max-w-[384px] md:max-w-xl mx-auto pt-1">
            Elevate your state of being with our curated selection of restorative treatments designed for deep healing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-6">
          {/* Treatment 1: Swedish Full Body Massage */}
          <div
            onClick={() => {
              onSelectService(visibleServices.find(s => s.name.includes('Swedish')) || services[0]);
              setActiveTab('booking');
            }}
            className="bg-white border border-[#ABABAB] md:border-stone-200/80 rounded-[15px] md:rounded-2xl p-4 sm:p-5 md:p-0 flex flex-col justify-between items-center text-center space-y-3 sm:space-y-4 md:space-y-0 hover:border-[#52634F] md:hover:border-stone-200/80 hover:shadow-lg md:shadow-sm md:hover:shadow-xl md:hover:-translate-y-1 transition-all duration-300 cursor-pointer group md:bg-white md:overflow-hidden md:h-full w-full"
          >
            <div className="space-y-3 w-full flex flex-col items-center md:space-y-0">
              {/* Border & Image Container */}
              <div className="w-full h-[160px] sm:h-[190px] md:h-48 border border-[#C5C7C1]/30 md:border-none rounded-xl md:rounded-none overflow-hidden bg-[#efeee8] md:bg-stone-100 relative flex-shrink-0">
                <CardImage
                  src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80"
                  alt="Swedish Full Body Massage"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  aspectRatio="landscape"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHomeFavorite('service-swedish', e);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center shadow-xs hover:bg-white hover:scale-110 transition-all z-10 cursor-pointer"
                  aria-label="Favorite service"
                >
                  <Heart className={`w-4 h-4 ${homeFavorites['service-swedish'] ? 'fill-[#e11d48] text-[#e11d48]' : 'text-[#52634F]'}`} />
                </button>
              </div>

              {/* Title & Paragraph */}
              <div className="space-y-1.5 sm:space-y-2 text-center w-full md:p-4 md:pb-2 md:flex md:flex-col md:items-center md:justify-start md:flex-1">
                <h3 className="font-sans font-medium text-[18px] sm:text-[20px] leading-[24px] sm:leading-[27px] text-[#1B1C19] group-hover:text-[#52634F] transition-colors md:font-serif md:text-xl md:font-medium md:text-stone-800 md:text-center">
                  Swedish Full Body
                </h3>
                <p className="font-sans font-normal text-[14px] sm:text-[15px] leading-[20px] sm:leading-[22px] text-[#454843] md:text-stone-600 md:text-sm md:leading-relaxed md:text-center md:px-4 md:line-clamp-2">
                  Classic gentle glides and kneading strokes to release tension.
                </p>
                {/* Desktop Duration Badge */}
                <div className="hidden md:inline-flex bg-[#D5E8CF]/60 text-[#52634F] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mx-auto my-3 items-center justify-center">
                  Duration : 1h
                </div>
              </div>
            </div>

            {/* Desktop CTA Button */}
            <div className="hidden md:block w-full px-4 pb-4 pt-1">
              <button className="w-full py-2.5 bg-[#4A604A] hover:bg-[#394d39] text-white text-xs font-medium uppercase tracking-widest rounded-xl transition-all cursor-pointer">
                Book Session
              </button>
            </div>

            {/* Mobile Duration Badge */}
            <div className="w-full flex items-center justify-center pt-2 border-t border-[#e8e5dc] md:hidden">
              <div className="bg-[#D5E8CF] px-3.5 py-1.5 rounded-md inline-flex items-center justify-center">
                <span className="font-sans font-semibold text-[12px] leading-[16px] tracking-[1.2px] text-[#52634F] uppercase">
                  Duration : 1h
                </span>
              </div>
            </div>
          </div>

          {/* Treatment 2: Deep Tissue Massage */}
          <div
            onClick={() => {
              onSelectService(visibleServices.find(s => s.name.includes('Deep')) || services[0]);
              setActiveTab('booking');
            }}
            className="bg-white border border-[#ABABAB] md:border-stone-200/80 rounded-[15px] md:rounded-2xl p-4 sm:p-5 md:p-0 flex flex-col justify-between items-center text-center space-y-3 sm:space-y-4 md:space-y-0 hover:border-[#52634F] md:hover:border-stone-200/80 hover:shadow-lg md:shadow-sm md:hover:shadow-xl md:hover:-translate-y-1 transition-all duration-300 cursor-pointer group md:bg-white md:overflow-hidden md:h-full w-full"
          >
            <div className="space-y-3 w-full flex flex-col items-center md:space-y-0">
              <div className="w-full h-[160px] sm:h-[190px] md:h-48 border border-[#C5C7C1]/30 md:border-none rounded-xl md:rounded-none overflow-hidden bg-[#efeee8] md:bg-stone-100 relative flex-shrink-0">
                <CardImage
                  src={tile2Img}
                  alt="Deep Tissue Massage"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  aspectRatio="landscape"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHomeFavorite('service-deeptissue', e);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center shadow-xs hover:bg-white hover:scale-110 transition-all z-10 cursor-pointer"
                  aria-label="Favorite service"
                >
                  <Heart className={`w-4 h-4 ${homeFavorites['service-deeptissue'] ? 'fill-[#e11d48] text-[#e11d48]' : 'text-[#52634F]'}`} />
                </button>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-center w-full md:p-4 md:pb-2 md:flex md:flex-col md:items-center md:justify-start md:flex-1">
                <h3 className="font-sans font-medium text-[18px] sm:text-[20px] leading-[24px] sm:leading-[27px] text-[#1B1C19] group-hover:text-[#52634F] transition-colors md:font-serif md:text-xl md:font-medium md:text-stone-800 md:text-center">
                  Deep Tissue
                </h3>
                <p className="font-sans font-normal text-[14px] sm:text-[15px] leading-[20px] sm:leading-[22px] text-[#454843] md:text-stone-600 md:text-sm md:leading-relaxed md:text-center md:px-4 md:line-clamp-2">
                  Intense targeted muscle pressure to alleviate chronic stiffness.
                </p>
                {/* Desktop Duration Badge */}
                <div className="hidden md:inline-flex bg-[#D5E8CF]/60 text-[#52634F] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mx-auto my-3 items-center justify-center">
                  Duration : 1h 15m
                </div>
              </div>
            </div>

            {/* Desktop CTA Button */}
            <div className="hidden md:block w-full px-4 pb-4 pt-1">
              <button className="w-full py-2.5 bg-[#4A604A] hover:bg-[#394d39] text-white text-xs font-medium uppercase tracking-widest rounded-xl transition-all cursor-pointer">
                Book Session
              </button>
            </div>

            {/* Mobile Duration Badge */}
            <div className="w-full flex items-center justify-center pt-2 border-t border-[#e8e5dc] md:hidden">
              <div className="bg-[#D5E8CF] px-3.5 py-1.5 rounded-md inline-flex items-center justify-center">
                <span className="font-sans font-semibold text-[12px] leading-[16px] tracking-[1.2px] text-[#52634F] uppercase">
                  Duration : 1h 15m
                </span>
              </div>
            </div>
          </div>

          {/* Treatment 3: Aromatherapy Massage */}
          <div
            onClick={() => {
              onSelectService(visibleServices.find(s => s.name.includes('Aroma')) || services[0]);
              setActiveTab('booking');
            }}
            className="bg-white border border-[#ABABAB] md:border-stone-200/80 rounded-[15px] md:rounded-2xl p-4 sm:p-5 md:p-0 flex flex-col justify-between items-center text-center space-y-3 sm:space-y-4 md:space-y-0 hover:border-[#52634F] md:hover:border-stone-200/80 hover:shadow-lg md:shadow-sm md:hover:shadow-xl md:hover:-translate-y-1 transition-all duration-300 cursor-pointer group md:bg-white md:overflow-hidden md:h-full w-full"
          >
            <div className="space-y-3 w-full flex flex-col items-center md:space-y-0">
              <div className="w-full h-[160px] sm:h-[190px] md:h-48 border border-[#C5C7C1]/30 md:border-none rounded-xl md:rounded-none overflow-hidden bg-[#efeee8] md:bg-stone-100 relative flex-shrink-0">
                <CardImage
                  src={tile1Img}
                  alt="Aromatherapy Massage"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  aspectRatio="landscape"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHomeFavorite('service-aroma', e);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center shadow-xs hover:bg-white hover:scale-110 transition-all z-10 cursor-pointer"
                  aria-label="Favorite service"
                >
                  <Heart className={`w-4 h-4 ${homeFavorites['service-aroma'] ? 'fill-[#e11d48] text-[#e11d48]' : 'text-[#52634F]'}`} />
                </button>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-center w-full md:p-4 md:pb-2 md:flex md:flex-col md:items-center md:justify-start md:flex-1">
                <h3 className="font-sans font-medium text-[18px] sm:text-[20px] leading-[24px] sm:leading-[27px] text-[#1B1C19] group-hover:text-[#52634F] transition-colors md:font-serif md:text-xl md:font-medium md:text-stone-800 md:text-center">
                  Aromatherapy
                </h3>
                <p className="font-sans font-normal text-[14px] sm:text-[15px] leading-[20px] sm:leading-[22px] text-[#454843] md:text-stone-600 md:text-sm md:leading-relaxed md:text-center md:px-4 md:line-clamp-2">
                  Infused organic essential oils for deep mental and emotional balance.
                </p>
                {/* Desktop Duration Badge */}
                <div className="hidden md:inline-flex bg-[#D5E8CF]/60 text-[#52634F] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mx-auto my-3 items-center justify-center">
                  Duration : 1h
                </div>
              </div>
            </div>

            {/* Desktop CTA Button */}
            <div className="hidden md:block w-full px-4 pb-4 pt-1">
              <button className="w-full py-2.5 bg-[#4A604A] hover:bg-[#394d39] text-white text-xs font-medium uppercase tracking-widest rounded-xl transition-all cursor-pointer">
                Book Session
              </button>
            </div>

            {/* Mobile Duration Badge */}
            <div className="w-full flex items-center justify-center pt-2 border-t border-[#e8e5dc] md:hidden">
              <div className="bg-[#D5E8CF] px-3.5 py-1.5 rounded-md inline-flex items-center justify-center">
                <span className="font-sans font-semibold text-[12px] leading-[16px] tracking-[1.2px] text-[#52634F] uppercase">
                  Duration : 1h
                </span>
              </div>
            </div>
          </div>

          {/* Treatment 4: Head, Neck & Shoulder */}
          <div
            onClick={() => {
              onSelectService(visibleServices.find(s => s.name.includes('Neck')) || services[0]);
              setActiveTab('booking');
            }}
            className="bg-white border border-[#ABABAB] md:border-stone-200/80 rounded-[15px] md:rounded-2xl p-4 sm:p-5 md:p-0 flex flex-col justify-between items-center text-center space-y-3 sm:space-y-4 md:space-y-0 hover:border-[#52634F] md:hover:border-stone-200/80 hover:shadow-lg md:shadow-sm md:hover:shadow-xl md:hover:-translate-y-1 transition-all duration-300 cursor-pointer group md:bg-white md:overflow-hidden md:h-full w-full"
          >
            <div className="space-y-3 w-full flex flex-col items-center md:space-y-0">
              <div className="w-full h-[160px] sm:h-[190px] md:h-48 border border-[#C5C7C1]/30 md:border-none rounded-xl md:rounded-none overflow-hidden bg-[#efeee8] md:bg-stone-100 relative flex-shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80"
                  alt="Head, Neck & Shoulder"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHomeFavorite('service-headneck', e);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center shadow-xs hover:bg-white hover:scale-110 transition-all z-10 cursor-pointer"
                  aria-label="Favorite service"
                >
                  <Heart className={`w-4 h-4 ${homeFavorites['service-headneck'] ? 'fill-[#e11d48] text-[#e11d48]' : 'text-[#52634F]'}`} />
                </button>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-center w-full md:p-4 md:pb-2 md:flex md:flex-col md:items-center md:justify-start md:flex-1">
                <h3 className="font-sans font-medium text-[18px] sm:text-[20px] leading-[24px] sm:leading-[27px] text-[#1B1C19] group-hover:text-[#52634F] transition-colors md:font-serif md:text-xl md:font-medium md:text-stone-800 md:text-center">
                  Head, Neck & Shoulder
                </h3>
                <p className="font-sans font-normal text-[14px] sm:text-[15px] leading-[20px] sm:leading-[22px] text-[#454843] md:text-stone-600 md:text-sm md:leading-relaxed md:text-center md:px-4 md:line-clamp-2">
                  Targeted relief for upper body tightness and desk posture fatigue.
                </p>
                {/* Desktop Duration Badge */}
                <div className="hidden md:inline-flex bg-[#D5E8CF]/60 text-[#52634F] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mx-auto my-3 items-center justify-center">
                  Duration : 45m
                </div>
              </div>
            </div>

            {/* Desktop CTA Button */}
            <div className="hidden md:block w-full px-4 pb-4 pt-1">
              <button className="w-full py-2.5 bg-[#4A604A] hover:bg-[#394d39] text-white text-xs font-medium uppercase tracking-widest rounded-xl transition-all cursor-pointer">
                Book Session
              </button>
            </div>

            {/* Mobile Duration Badge */}
            <div className="w-full flex items-center justify-center pt-2 border-t border-[#e8e5dc] md:hidden">
              <div className="bg-[#D5E8CF] px-3.5 py-1.5 rounded-md inline-flex items-center justify-center">
                <span className="font-sans font-semibold text-[12px] leading-[16px] tracking-[1.2px] text-[#52634F] uppercase">
                  Duration : 45m
                </span>
              </div>
            </div>
          </div>

          {/* Treatment 5: Reiki Therapy */}
          <div
            onClick={() => {
              onSelectService(visibleServices[0]);
              setActiveTab('booking');
            }}
            className="bg-white border border-[#ABABAB] md:border-stone-200/80 rounded-[15px] md:rounded-2xl p-4 sm:p-5 md:p-0 flex flex-col justify-between items-center text-center space-y-3 sm:space-y-4 md:space-y-0 hover:border-[#52634F] md:hover:border-stone-200/80 hover:shadow-lg md:shadow-sm md:hover:shadow-xl md:hover:-translate-y-1 transition-all duration-300 cursor-pointer group md:bg-white md:overflow-hidden md:h-full w-full"
          >
            <div className="space-y-3 w-full flex flex-col items-center md:space-y-0">
              <div className="w-full h-[160px] sm:h-[190px] md:h-48 border border-[#C5C7C1]/30 md:border-none rounded-xl md:rounded-none overflow-hidden bg-[#efeee8] md:bg-stone-100 relative flex-shrink-0">
                <CardImage
                  src={tile3Img}
                  alt="Reiki Therapy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  aspectRatio="landscape"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHomeFavorite('service-reiki', e);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center shadow-xs hover:bg-white hover:scale-110 transition-all z-10 cursor-pointer"
                  aria-label="Favorite service"
                >
                  <Heart className={`w-4 h-4 ${homeFavorites['service-reiki'] ? 'fill-[#e11d48] text-[#e11d48]' : 'text-[#52634F]'}`} />
                </button>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-center w-full md:p-4 md:pb-2 md:flex md:flex-col md:items-center md:justify-start md:flex-1">
                <h3 className="font-sans font-medium text-[18px] sm:text-[20px] leading-[24px] sm:leading-[27px] text-[#1B1C19] group-hover:text-[#52634F] transition-colors md:font-serif md:text-xl md:font-medium md:text-stone-800 md:text-center">
                  Reiki Therapy
                </h3>
                <p className="font-sans font-normal text-[14px] sm:text-[15px] leading-[20px] sm:leading-[22px] text-[#454843] md:text-stone-600 md:text-sm md:leading-relaxed md:text-center md:px-4 md:line-clamp-2">
                  Gentle energy healing that targets emotional and spiritual blockages.
                </p>
                {/* Desktop Duration Badge */}
                <div className="hidden md:inline-flex bg-[#D5E8CF]/60 text-[#52634F] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mx-auto my-3 items-center justify-center">
                  Duration : 1h
                </div>
              </div>
            </div>

            {/* Desktop CTA Button */}
            <div className="hidden md:block w-full px-4 pb-4 pt-1">
              <button className="w-full py-2.5 bg-[#4A604A] hover:bg-[#394d39] text-white text-xs font-medium uppercase tracking-widest rounded-xl transition-all cursor-pointer">
                Book Session
              </button>
            </div>

            {/* Mobile Duration Badge */}
            <div className="w-full flex items-center justify-center pt-2 border-t border-[#e8e5dc] md:hidden">
              <div className="bg-[#D5E8CF] px-3.5 py-1.5 rounded-md inline-flex items-center justify-center">
                <span className="font-sans font-semibold text-[12px] leading-[16px] tracking-[1.2px] text-[#52634F] uppercase">
                  Duration : 1h
                </span>
              </div>
            </div>
          </div>

          {/* Treatment 6: Foot Reflexology */}
          <div
            onClick={() => {
              onSelectService(visibleServices[3] || services[0]);
              setActiveTab('booking');
            }}
            className="bg-white border border-[#ABABAB] md:border-stone-200/80 rounded-[15px] md:rounded-2xl p-2.5 sm:p-5 md:p-0 flex flex-col justify-between items-center text-center space-y-2 sm:space-y-3.5 md:space-y-0 hover:border-[#52634F] md:hover:border-stone-200/80 hover:shadow-lg md:shadow-sm md:hover:shadow-xl md:hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group md:bg-white md:overflow-hidden md:h-full w-full"
          >
            <div className="space-y-2 sm:space-y-3 w-full flex flex-col items-center md:space-y-0">
              <div className="w-full h-[120px] sm:h-[190px] md:h-48 border border-[#C5C7C1]/30 md:border-none rounded-xl md:rounded-none overflow-hidden bg-[#efeee8] md:bg-stone-100 relative flex-shrink-0">
                <CardImage
                  src={tile4Img}
                  alt="Foot Reflexology"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  aspectRatio="landscape"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHomeFavorite('service-foot', e);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center shadow-xs hover:bg-white hover:scale-110 transition-all z-10 cursor-pointer"
                  aria-label="Favorite service"
                >
                  <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${homeFavorites['service-foot'] ? 'fill-[#e11d48] text-[#e11d48]' : 'text-[#52634F]'}`} />
                </button>
              </div>
              <div className="space-y-1 sm:space-y-2 text-center w-full md:p-4 md:pb-2 md:flex md:flex-col md:items-center md:justify-start md:flex-1">
                <h3 className="font-sans font-medium text-[14px] sm:text-[20px] leading-tight sm:leading-[27px] text-[#1B1C19] group-hover:text-[#52634F] transition-colors md:font-serif md:text-xl md:font-medium md:text-stone-800 md:text-center">
                  Foot Reflexology
                </h3>
                <p className="font-sans font-normal text-[11px] sm:text-[15px] leading-snug sm:leading-[22px] text-[#454843] md:text-stone-600 md:text-sm md:leading-relaxed md:text-center md:px-4 md:line-clamp-2">
                  Reflex pressure points soothing tired feet and boosting circulation.
                </p>
                {/* Desktop Duration Badge */}
                <div className="hidden md:inline-flex bg-[#D5E8CF]/60 text-[#52634F] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mx-auto my-3 items-center justify-center">
                  Duration : 45m
                </div>
              </div>
            </div>

            {/* Desktop CTA Button */}
            <div className="hidden md:block w-full px-4 pb-4 pt-1">
              <button className="w-full py-2.5 bg-[#4A604A] hover:bg-[#394d39] text-white text-xs font-medium uppercase tracking-widest rounded-xl transition-all cursor-pointer">
                Book Session
              </button>
            </div>

            {/* Mobile Duration Badge */}
            <div className="w-full flex items-center justify-center pt-2 border-t border-[#e8e5dc] md:hidden">
              <div className="bg-[#D5E8CF] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-md inline-flex items-center justify-center">
                <span className="font-sans font-semibold text-[10px] sm:text-[12px] leading-tight sm:leading-[16px] tracking-[1px] sm:tracking-[1.2px] text-[#52634F] uppercase">
                  Duration : 45m
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* SELECT YOUR THERAPIST CARDS SECTION */}
      <section className="px-4 max-w-md md:max-w-4xl lg:max-w-6xl mx-auto space-y-5 md:space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-[#747871] block">
              CERTIFIED EXPERTS
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-[#1b1c19]">Select Therapist</h2>
          </div>
          <button
            onClick={() => setActiveTab('therapists')}
            className="text-xs md:text-sm font-semibold text-[#3b4b38] hover:text-[#1b1c19] flex items-center space-x-1 cursor-pointer bg-[#d5e8cf] hover:bg-[#c2e0b8] px-3.5 py-1.5 md:px-4 md:py-2 rounded-full transition-colors"
          >
            <span>All ({therapists.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Featured Therapist Cards Grid (2 cards per row on mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
          {sortedHomeTherapists.slice(0, 6).map((therapist) => {
            const isFav = !!homeFavorites[therapist.id];
            return (
              <div
                key={therapist.id}
                onClick={() => {
                  if (onSelectTherapist) {
                    onSelectTherapist(therapist);
                  }
                  setActiveTab('booking');
                }}
                className="w-full bg-[#F9FAF8] border border-[#C5C7C1]/30 rounded-[16px] sm:rounded-[20px] p-2.5 sm:p-4 flex flex-col justify-between gap-2 sm:gap-3 shadow-xs hover:shadow-md hover:border-[#52634F] transition-all duration-300 cursor-pointer group relative"
              >
                {/* Avatar Image with Favorite Heart Overlay */}
                <div className="relative w-full aspect-square rounded-[12px] sm:rounded-[16px] overflow-hidden bg-[#efeee8] flex-shrink-0">
                  <ThumbnailImage
                    src={therapist.avatarUrl}
                    alt={therapist.name}
                    size={200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Favorite Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleHomeFavorite(therapist.id, e)}
                    className="absolute top-2 right-2 w-7 h-7 sm:w-[36px] sm:h-[36px] rounded-full bg-white/85 backdrop-blur-[4px] flex items-center justify-center shadow-xs hover:bg-white hover:scale-110 transition-all z-10 cursor-pointer"
                    aria-label="Favorite therapist"
                  >
                    <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFav ? 'fill-[#e11d48] text-[#e11d48]' : 'text-[#52634F]'}`} />
                  </button>
                </div>

                {/* Info Content */}
                <div className="space-y-0.5 sm:space-y-1 w-full text-left px-0.5">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-medium text-[#2E7D32]">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#2E7D32] inline-block animate-pulse" />
                    <span>Available</span>
                  </div>

                  {/* Name */}
                  <h4 className="font-sans font-bold text-[14px] sm:text-[18px] leading-snug text-[#1B1C19] capitalize truncate mt-0.5">
                    {therapist.name}
                  </h4>

                  {/* Rating Row */}
                  <div className="flex items-center justify-between gap-1 text-[11px] sm:text-[12px] font-medium text-[#1B1C19]">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                      <span className="font-semibold text-[#1B1C19]">{therapist.rating}</span>
                      <span className="text-[#6B7280] text-[10px] sm:text-[11px]">({therapist.reviewsCount})</span>
                    </div>
                    <a
                      href={contactSettings?.googleReviewUrl || 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] sm:text-[10px] font-bold text-[#4285F4] bg-[#4285F4]/10 hover:bg-[#4285F4]/20 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                      title={`Review ${therapist.name} on Google`}
                    >
                      <span>Google</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  {/* Bottom Info Bar */}
                  <div className="flex items-center justify-between pt-1.5 sm:pt-3 border-t border-[#e8e5dc] gap-1 mt-1.5 sm:mt-3">
                    <span className="bg-[#E8EFE6] text-[#52634F] text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded-md truncate max-w-[75px] sm:max-w-[110px]">
                      {therapist.specialty.split(/&|,|\+/)[0]?.trim() || 'Aromatherapy'}
                    </span>
                    <span className="font-bold text-[#1B1C19] text-xs sm:text-base flex-shrink-0">
                      ₹{therapist.price.toLocaleString()}
                    </span>
                  </div>

                  {/* Direct Book Therapist Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectTherapist) {
                        onSelectTherapist(therapist);
                      }
                      setActiveTab('booking');
                    }}
                    className="w-full mt-2 py-2 px-2.5 bg-[#52634f] hover:bg-[#3b4b38] text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Book Therapist</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FRAME 578: 4-IMAGE ARCH COLLAGE */}
      <section className="px-4 max-w-md md:max-w-xl lg:max-w-2xl mx-auto py-2">
        <div className="relative w-full max-w-[394px] md:max-w-[480px] mx-auto h-[470px] md:h-[560px]">
          {/* Tile 1: Top-Left */}
          <div
            className="absolute w-[47%] h-[225px] md:h-[265px] left-0 top-0 overflow-hidden shadow-xs border border-[#e9e8e3]"
            style={{
              borderRadius: '9999px 9999px 0px 9999px',
              transform: 'rotate(-179.5deg)',
            }}
          >
            <ResponsiveImage
              src={tile1Img}
              alt="Spa oils and candles"
              width={400}
              height={300}
              className="w-full h-full object-cover"
              sizes="400px"
              style={{ transform: 'rotate(-179.5deg)' }}
            />
          </div>

          {/* Tile 2: Top-Right */}
          <div
            className="absolute w-[47%] h-[225px] md:h-[265px] right-0 top-0 overflow-hidden shadow-xs border border-[#e9e8e3]"
            style={{
              borderRadius: '9999px 9999px 0px 9999px',
              transform: 'scaleY(-1)',
            }}
          >
            <ResponsiveImage
              src={tile2Img}
              alt="Relaxing back massage"
              width={400}
              height={300}
              className="w-full h-full object-cover"
              sizes="400px"
              style={{ transform: 'scaleY(-1)' }}
            />
          </div>

          {/* Tile 3: Bottom-Left */}
          <div
            className="absolute w-[47%] h-[225px] md:h-[265px] left-0 bottom-0 overflow-hidden shadow-xs border border-[#e9e8e3]"
            style={{
              borderRadius: '9999px 9999px 0px 9999px',
              transform: 'scaleX(-1)',
            }}
          >
            <ResponsiveImage
              src={tile3Img}
              alt="Herbal compress therapy"
              width={400}
              height={300}
              className="w-full h-full object-cover"
              sizes="400px"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>

          {/* Tile 4: Bottom-Right */}
          <div
            className="absolute w-[47%] h-[225px] md:h-[265px] right-0 bottom-0 overflow-hidden shadow-xs border border-[#e9e8e3]"
            style={{
              borderRadius: '9999px 9999px 0px 9999px',
              transform: 'rotate(0.04deg)',
            }}
          >
            <ResponsiveImage
              src={tile4Img}
              alt="Flower foot bath ritual"
              width={400}
              height={300}
              className="w-full h-full object-cover"
              sizes="400px"
            />
          </div>
        </div>
      </section>

      {/* VALUABLE CLIENT FEEDBACK */}
      <section className="px-4 max-w-md md:max-w-4xl lg:max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl md:text-3xl text-[#1b1c19]">Valuable Client Feedback</h2>
          <a
            href={contactSettings.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-[#efeee8] hover:bg-[#d5e8cf] text-[#3b4b38] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Write a review on Google Business Profile"
          >
            <svg className="w-3.5 h-3.5 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>+ Add Review</span>
          </a>
        </div>

        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-2xs space-y-3"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#efeee8] flex items-center justify-center font-bold text-[#747871]">
                  {rev.clientName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[#1b1c19]">{rev.clientName}</h4>
                  <span className="text-[10px] text-[#22c55e] font-semibold bg-[#d5e8cf]/50 px-2 py-0.5 rounded-full inline-block">
                    Trusted Customer
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#444841] italic leading-relaxed">
                "{rev.quote}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY PREMIUM SPA & TRUST BADGES */}
      <section className="px-4 max-w-md md:max-w-4xl lg:max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-[#747871]">
            TRUSTED DOORSTEP WELLNESS
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-[#1b1c19]">Why Choose Premium Spa?</h2>
          <p className="text-xs md:text-sm text-[#747871] leading-relaxed max-w-xs md:max-w-lg mx-auto">
            We bring luxury, certified expertise, and absolute safety directly to your doorstep.
          </p>
        </div>

        {/* Proof Points Metrics */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 bg-[#f0f4ee] p-5 rounded-2xl border border-[#d5e8cf] text-center shadow-2xs">
          <div className="space-y-1">
            <div className="font-serif text-2xl md:text-4xl font-bold text-[#3b4b38]">8+ Years</div>
            <div className="text-[10px] md:text-xs text-[#52634f] font-medium uppercase tracking-wider">Experience</div>
          </div>
          <div className="space-y-1 border-x border-[#d5e8cf]">
            <div className="font-serif text-2xl md:text-4xl font-bold text-[#3b4b38]">5</div>
            <div className="text-[10px] md:text-xs text-[#52634f] font-medium uppercase tracking-wider">Treatments</div>
          </div>
          <div className="space-y-1">
            <div className="font-serif text-2xl md:text-4xl font-bold text-[#3b4b38]">4.9★</div>
            <div className="text-[10px] md:text-xs text-[#52634f] font-medium uppercase tracking-wider">Rating</div>
          </div>
        </div>

        {/* 4 Key Feature Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#e8e5dc] shadow-2xs space-y-2 text-left hover:border-[#3b4b38]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#d5e8cf]/60 text-[#3b4b38] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#3b4b38]" />
            </div>
            <h4 className="font-semibold text-sm text-[#1b1c19]">Verified & Trained Therapists</h4>
            <p className="text-xs text-[#747871] leading-relaxed">
              100% background-checked certified female & male therapists with luxury hotel spa credentials.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#e8e5dc] shadow-2xs space-y-2 text-left hover:border-[#3b4b38]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#d5e8cf]/60 text-[#3b4b38] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#3b4b38]" />
            </div>
            <h4 className="font-semibold text-sm text-[#1b1c19]">Safe & Hygienic Service</h4>
            <p className="text-xs text-[#747871] leading-relaxed">
              Single-use disposable sheets, sanitized equipment, and 100% organic cold-pressed oils.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#e8e5dc] shadow-2xs space-y-2 text-left hover:border-[#3b4b38]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#d5e8cf]/60 text-[#3b4b38] flex items-center justify-center">
              <Phone className="w-5 h-5 text-[#3b4b38]" />
            </div>
            <h4 className="font-semibold text-sm text-[#1b1c19]">24/7 Customer Support</h4>
            <p className="text-xs text-[#747871] leading-relaxed">
              Dedicated spa concierge support via WhatsApp and hotline for instant booking assistance.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#e8e5dc] shadow-2xs space-y-2 text-left hover:border-[#3b4b38]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#d5e8cf]/60 text-[#3b4b38] flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#3b4b38]" />
            </div>
            <h4 className="font-semibold text-sm text-[#1b1c19]">Easy Booking & Secure Payment</h4>
            <p className="text-xs text-[#747871] leading-relaxed">
              Book in 60 seconds with ₹200 slot deposit and pay remaining amount conveniently after service.
            </p>
          </div>
        </div>
      </section>

      {/* ADD REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 border border-[#e9e8e3]">
            <h3 className="font-serif text-xl text-[#1b1c19]">Share Your Feedback</h3>
            <form onSubmit={handleAddReview} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#444841] block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={newReviewName}
                  onChange={(e) => setNewReviewName(e.target.value)}
                  placeholder="e.g. Rahul Yadav"
                  className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-sm focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#444841] block mb-1">Your Review</label>
                <textarea
                  required
                  rows={3}
                  value={newReviewQuote}
                  onChange={(e) => setNewReviewQuote(e.target.value)}
                  placeholder="Describe your spa experience..."
                  className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-sm focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#747871] hover:bg-[#efeee8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#52634f] text-white hover:bg-[#3b4b38]"
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRAND FOOTER (PREMIUM SPA Multi-Column & Policy Links) */}
      {/* FIGMA SPEC LIGHT MODE FOOTER */}
      <footer className="bg-white text-[#1B1C19] border-t border-[#e8e5dc] py-[50px] px-[20px] pb-[30px] w-full">
        <div className="max-w-[410px] md:max-w-4xl lg:max-w-6xl mx-auto flex flex-col items-start gap-[40px]">
          
          {/* Main Footer Header & Intro */}
          <div className="space-y-3 text-left w-full">
            <span className="font-sans font-semibold text-[12px] leading-[16px] tracking-[1.2px] uppercase text-[#52634F] block">
              WHY CHOOSE PREMIUM SPA
            </span>
            <h2 className="font-serif font-normal text-[28px] sm:text-[32px] leading-[36px] sm:leading-[40px] text-[#1B1C19]">
              BUILDING PHYSICAL & MENTAL HEALTH
            </h2>
            <p className="font-sans font-normal text-[14px] sm:text-[16px] leading-[22px] sm:leading-[26px] text-[#454843] max-w-2xl">
              Premium Spa brings 5-star spa therapy, organic aromatherapy oils, and certified therapists directly to your residence or hotel suite in Indore.
            </p>
          </div>

          {/* Benefit Badges Grid (2x2 / Row-Flex) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px] w-full">
            <div className="flex items-center space-x-2.5 h-[40px]">
              <div className="w-[40px] h-[40px] rounded-full bg-[#D5E8CF]/40 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#52634F]" />
              </div>
              <span className="font-sans font-normal text-[10px] leading-tight tracking-[0.5px] uppercase text-[#1B1C19]">
                VERIFIED THERAPISTS
              </span>
            </div>

            <div className="flex items-center space-x-2.5 h-[40px]">
              <div className="w-[40px] h-[40px] rounded-full bg-[#D5E8CF]/40 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#52634F]" />
              </div>
              <span className="font-sans font-normal text-[10px] leading-tight tracking-[0.5px] uppercase text-[#1B1C19]">
                100% HYGIENIC & ORGANIC
              </span>
            </div>

            <div className="flex items-center space-x-2.5 h-[40px]">
              <div className="w-[40px] h-[40px] rounded-full bg-[#D5E8CF]/40 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-[#52634F]" />
              </div>
              <span className="font-sans font-normal text-[10px] leading-tight tracking-[0.5px] uppercase text-[#1B1C19]">
                24/7 CONCIERGE SUPPORT
              </span>
            </div>

            <div className="flex items-center space-x-2.5 h-[40px]">
              <div className="w-[40px] h-[40px] rounded-full bg-[#D5E8CF]/40 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-[#52634F]" />
              </div>
              <span className="font-sans font-normal text-[10px] leading-tight tracking-[0.5px] uppercase text-[#1B1C19]">
                INSTANT SECURE BOOKING
              </span>
            </div>
          </div>

          {/* Links Grid Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full text-left pt-2 border-t border-[#e8e5dc]">
            {/* Useful Links */}
            <div className="space-y-3">
              <h3 className="font-sans font-bold text-[20px] leading-[27px] text-[#1B1C19]">
                Useful Links
              </h3>
              <ul className="space-y-2 font-sans font-normal text-[14px] sm:text-[16px] leading-[26px] text-[#454843]">
                <li><button onClick={() => setActiveTab('home')} className="hover:text-[#52634F] transition-colors cursor-pointer">Home Experience</button></li>
                <li><button onClick={() => setActiveTab('therapists')} className="hover:text-[#52634F] transition-colors cursor-pointer">Choose a Therapist</button></li>
                <li><button onClick={() => setActiveTab('booking')} className="hover:text-[#52634F] transition-colors cursor-pointer">Book 60s Slot</button></li>
                <li><button onClick={() => setActiveTab('about')} className="hover:text-[#52634F] transition-colors cursor-pointer">About Premium Spa</button></li>
                <li><button onClick={() => setActiveTab('message')} className="hover:text-[#52634F] transition-colors cursor-pointer">24/7 Concierge</button></li>
              </ul>
            </div>

            {/* Treatments */}
            <div className="space-y-3">
              <h3 className="font-sans font-bold text-[20px] leading-[27px] text-[#1B1C19]">
                Treatments
              </h3>
              <ul className="space-y-2 font-sans font-normal text-[14px] sm:text-[16px] leading-[26px] text-[#454843]">
                <li>Full Body Therapy</li>
                <li>Head, Neck & Shoulder</li>
                <li>Reiki & Stress Relief</li>
                <li>Foot Reflexology</li>
                <li>Deep Tissue Massage</li>
              </ul>
            </div>

            {/* About us / Location */}
            <div className="space-y-3">
              <h3 className="font-sans font-bold text-[20px] leading-[27px] text-[#1B1C19]">
                About us
              </h3>
              <div className="space-y-2 font-sans font-normal text-[14px] sm:text-[16px] leading-[26px] text-[#454843]">
                <p>Vijay Nagar, Indore, Madhya Pradesh</p>
                <p>Certified home spa services delivered right to your doorstep.</p>
              </div>
            </div>
          </div>

          {/* Contact & Social Divider Bar */}
          <div className="border-t border-[#C5C7C1]/30 pt-[24px] flex flex-col sm:flex-row items-center justify-between w-full gap-[20px]">
            {/* Phone & Email Rows */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-[14px] font-bold text-[#1B1C19]">
              <a
                href={`tel:${contactSettings.callNumber}`}
                className="flex items-center space-x-2 hover:text-[#52634F] transition-colors"
              >
                <Phone className="w-[16px] h-[16px] text-[#52634F]" />
                <span>{contactSettings.callNumber}</span>
              </a>
              <a
                href={`mailto:${contactSettings.contactEmail}`}
                className="flex items-center space-x-2 hover:text-[#52634F] transition-colors"
              >
                <Mail className="w-[16px] h-[16px] text-[#52634F]" />
                <span>{contactSettings.contactEmail}</span>
              </a>
            </div>

            {/* Social Circles (Frame 593: 30px x 30px with gap: 22px) */}
            <div className="flex items-center gap-[22px]">
              <a
                href={`https://wa.me/${contactSettings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-[30px] h-[30px] rounded-full bg-[#f0f4ee] flex items-center justify-center text-[#52634F] hover:bg-[#52634F] hover:text-white transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href={contactSettings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-[30px] h-[30px] rounded-full bg-[#f0f4ee] flex items-center justify-center text-[#52634F] hover:bg-[#52634F] hover:text-white transition-colors cursor-pointer"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={`tel:${contactSettings.callNumber}`}
                aria-label="Call Support"
                className="w-[30px] h-[30px] rounded-full bg-[#f0f4ee] flex items-center justify-center text-[#52634F] hover:bg-[#52634F] hover:text-white transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Copyright line */}
          <div className="w-full text-center sm:text-left text-[12px] font-sans font-normal text-[#747871] pt-2 border-t border-[#e8e5dc]">
            © {new Date().getFullYear()} PREMIUM SPA. All rights reserved. Doorstep Wellness Indore.
          </div>

        </div>
      </footer>

      {/* SELECT THERAPIST FOR SERVICE MODAL */}
      {selectedServiceForModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-[#e9e8e3] shadow-2xl relative max-h-[90vh] overflow-y-auto text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#efeee8] pb-3">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-[#52634f] uppercase block">
                  BOOKING SERVICE TREATMENT
                </span>
                <h3 className="font-serif text-xl text-[#1b1c19]">{selectedServiceForModal.name}</h3>
                <p className="text-xs text-[#747871]">
                  Duration: {selectedServiceForModal.duration} • Base Price: ₹{selectedServiceForModal.price.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedServiceForModal(null)}
                className="p-1.5 rounded-full bg-[#efeee8] text-[#747871] hover:text-[#1b1c19] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Option: Any Available Therapist */}
            <div className="bg-[#f0f4ee] p-3.5 rounded-2xl border border-[#d5e8cf] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-semibold text-xs text-[#1b1c19] block">⚡ Next Available Therapist</span>
                <span className="text-[11px] text-[#52634f]">We will auto-assign our top certified therapist in Indore</span>
              </div>
              <button
                onClick={() => {
                  onSelectService(selectedServiceForModal);
                  setActiveTab('booking');
                  setSelectedServiceForModal(null);
                }}
                className="px-4 py-2 bg-[#52634f] hover:bg-[#3b4b38] text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Book Now
              </button>
            </div>

            {/* Choose Specific Therapist Header */}
            <div className="pt-1">
              <h4 className="font-semibold text-xs text-[#747871] uppercase tracking-wider mb-2.5">
                Or Select Your Preferred Therapist ({therapists.length}):
              </h4>

              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {therapists.map((therapist) => (
                  <div
                    key={therapist.id}
                    className="p-3.5 rounded-2xl border border-[#e9e8e3] hover:border-[#52634f] bg-white transition-all space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#efeee8] border border-[#e9e8e3] flex-shrink-0">
                          <ThumbnailImage
                            src={therapist.avatarUrl}
                            alt={therapist.name}
                            size={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-sm text-[#1b1c19]">{therapist.name}</span>
                            <span className="bg-[#d5e8cf] text-[#3b4b38] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {therapist.category}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-[#747871] mt-0.5">
                            <span className="text-[#D4AF37] font-bold flex items-center">
                              <Star className="w-3 h-3 fill-current inline mr-0.5" />
                              {therapist.rating}
                            </span>
                            <span>({therapist.reviewsCount} reviews)</span>
                            <span className="font-semibold text-[#1b1c19]">₹{therapist.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectService(selectedServiceForModal);
                          if (onSelectTherapist) {
                            onSelectTherapist(therapist);
                          }
                          setActiveTab('booking');
                          setSelectedServiceForModal(null);
                        }}
                        className="px-3.5 py-2 bg-[#1b1c19] hover:bg-[#52634f] text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center space-x-1 shadow-2xs"
                      >
                        <span>Select & Book</span>
                      </button>
                    </div>

                    {/* Direct link to Google Profile rating */}
                    <div className="pt-2 border-t border-[#f0eee6] flex items-center justify-between text-[11px]">
                      <span className="text-[#747871] truncate max-w-[200px]">
                        Specialty: {therapist.specialty}
                      </span>
                      <a
                        href={contactSettings?.googleReviewUrl || 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4285F4] hover:underline font-semibold flex items-center space-x-1 flex-shrink-0"
                      >
                        <span>Google Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
);
};
