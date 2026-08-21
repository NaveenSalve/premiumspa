import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Therapist, MainTab, ContactSettings } from '../types';
import { Heart, Star, ShieldCheck, X, ThumbsUp, Sparkles, UserCheck, ExternalLink } from 'lucide-react';
import { StarRating } from './StarRating';
import { ThumbnailImage, CardImage } from './ResponsiveImage';

interface TherapistsViewProps {
  therapists: Therapist[];
  contactSettings?: ContactSettings;
  setActiveTab: (tab: MainTab) => void;
  onSelectTherapist: (therapist: Therapist) => void;
  onRateTherapist?: (therapistId: string, rating: number) => void;
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

export const TherapistsView: React.FC<TherapistsViewProps> = ({
  therapists,
  contactSettings,
  setActiveTab,
  onSelectTherapist,
  onRateTherapist,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => readStoredFavorites());
  const [profileTherapist, setProfileTherapist] = useState<Therapist | null>(null);

  React.useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  React.useEffect(() => {
    if (!profileTherapist) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [profileTherapist]);

  // Rate therapist form state in modal
  const [userRating, setUserRating] = useState<number>(5);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  // Sample client reviews for the selected therapist modal
  const [therapistReviews, setTherapistReviews] = useState<Record<string, Array<{ name: string; date: string; rating: number; text: string }>>>({
    'th-1': [
      { name: 'Priya Sharma', date: 'Yesterday', rating: 5, text: 'Anita arrived right on time with soothing aromatherapy oils and clean linens. Excellent deep pressure!' },
      { name: 'Rohan Mehta', date: '3 days ago', rating: 5, text: 'Very professional home setup. My back tightness dissolved completely.' },
    ],
    'th-3': [
      { name: 'Aakanksha Roy', date: '2 days ago', rating: 5, text: 'Elena’s Balinese technique was heavenly. Her soft music setup created a true 5-star spa atmosphere.' },
    ],
    'th-4': [
      { name: 'Vikram Malhotra', date: '4 days ago', rating: 5, text: 'Maya was thorough and polite. Excellent muscle knot release.' },
    ],
  });

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileTherapist) return;

    if (onRateTherapist) {
      onRateTherapist(profileTherapist.id, userRating);
    }

    const newRev = {
      name: reviewerName.trim() || 'Verified Client',
      date: 'Just now',
      rating: userRating,
      text: reviewComment.trim() || 'Wonderful spa experience! Highly recommended.',
    };

    setTherapistReviews(prev => ({
      ...prev,
      [profileTherapist.id]: [newRev, ...(prev[profileTherapist.id] || [])],
    }));

    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewSubmitted(false);
      setReviewComment('');
      setReviewerName('');
    }, 2500);
  };

  const categories: string[] = ['All', 'Classic', 'Deluxe', 'Luxury'];

  const filteredTherapists = selectedCategory === 'All'
    ? therapists
    : therapists.filter(t => t.category.toLowerCase() === selectedCategory.toLowerCase());

  // Helper function to sort liked therapists to the top
  const sortTherapistsByFav = (list: Therapist[]) => {
    return [...list].sort((a, b) => {
      const aFav = favorites[a.id] ? 1 : 0;
      const bFav = favorites[b.id] ? 1 : 0;
      return bFav - aFav;
    });
  };

  const classicTherapists = sortTherapistsByFav(filteredTherapists.filter(t => t.category === 'Classic'));
  const deluxeTherapists = sortTherapistsByFav(filteredTherapists.filter(t => t.category === 'Deluxe'));
  const luxuryTherapists = sortTherapistsByFav(filteredTherapists.filter(t => t.category === 'Luxury'));

  const renderTherapistCard = (therapist: Therapist) => {
    const isFav = !!favorites[therapist.id];

    return (
      <div
        key={therapist.id}
        className="w-full bg-[#F9FAF8] border border-[#C5C7C1]/30 rounded-[16px] sm:rounded-[20px] p-3 sm:p-4 flex flex-col justify-between gap-3 sm:gap-4 shadow-xs hover:shadow-md hover:border-[#52634F] transition-all duration-300 cursor-pointer group relative"
        onClick={() => {
          onSelectTherapist(therapist);
          setActiveTab('booking');
        }}
      >
        {/* Avatar Image with Favorite Heart Overlay */}
        <div className="relative w-full aspect-square rounded-[12px] sm:rounded-[16px] overflow-hidden bg-[#efeee8] flex-shrink-0">
          <CardImage
            src={therapist.avatarUrl}
            alt={therapist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            aspectRatio="square"
          />
          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={(e) => toggleFavorite(therapist.id, e)}
            className="absolute top-2 right-2 w-7 h-7 sm:w-[36px] sm:h-[36px] rounded-full bg-white/85 backdrop-blur-[4px] flex items-center justify-center shadow-xs hover:bg-white hover:scale-110 transition-all z-10 cursor-pointer"
            aria-label="Favorite therapist"
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFav ? 'fill-[#e11d48] text-[#e11d48]' : 'text-[#52634F]'}`} />
          </button>
        </div>

        {/* Info Content */}
        <div className="space-y-1 sm:space-y-1.5 w-full text-left flex-1 flex flex-col">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-medium text-[#2E7D32]">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] inline-block animate-pulse flex-shrink-0" />
            <span className="truncate">Available</span>
          </div>

          {/* Name */}
          <h4 className="font-sans font-bold text-[15px] sm:text-[18px] leading-snug text-[#1B1C19] capitalize truncate">
            {therapist.name}
          </h4>

          {/* Rating Row - aligned with consistent spacing */}
          <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-[#1B1C19]">
            <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37] flex-shrink-0" />
            <span className="font-semibold text-[#1B1C19]">{therapist.rating}</span>
            <span className="text-[#6B7280] text-[11px] sm:text-[12px]">({therapist.reviewsCount})</span>
          </div>

          {/* Bottom Info Bar - properly aligned */}
          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-[#e8e5dc] gap-2 mt-auto">
            <span className="bg-[#E8EFE6] text-[#52634F] text-[10px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 rounded-md truncate max-w-[80px] sm:max-w-[120px] flex-shrink-0">
              {therapist.specialty.split(/&|,|\+/)[0]?.trim() || 'Aromatherapy'}
            </span>
            <span className="font-bold text-[#1B1C19] text-sm sm:text-base flex-shrink-0 whitespace-nowrap">
              ₹{therapist.price.toLocaleString()}
            </span>
          </div>

          {/* Booking Action Button - consistent sizing */}
          <div className="pt-1.5 space-y-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                onSelectTherapist(therapist);
                setActiveTab('booking');
              }}
              className="w-full py-2.5 px-3 bg-[#52634f] hover:bg-[#3b4b38] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm"
            >
              <UserCheck className="w-4 h-4 flex-shrink-0" />
              <span>Book Therapist</span>
            </button>
            <button
              type="button"
              onClick={() => setProfileTherapist(therapist)}
              className="w-full text-center text-[11px] sm:text-[12px] text-[#52634f] hover:text-[#1b1c19] hover:underline font-medium cursor-pointer pt-0.5"
            >
              View Reviews & Bio →
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 py-6 max-w-md md:max-w-4xl lg:max-w-6xl mx-auto space-y-8 pb-28 animate-fade-in">
      {/* Title Header */}
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl md:text-4xl text-[#1b1c19]">Choose Your Therapist</h1>
        <p className="text-xs md:text-sm text-[#747871] leading-relaxed max-w-xs md:max-w-md mx-auto">
          Select your preferred therapist category and enjoy a premium home spa experience. Click any therapist to view client ratings & reviews.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center justify-center space-x-2 overflow-x-auto py-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#52634F] text-white shadow-xs'
                : 'bg-[#E8EFE6] text-[#52634F] hover:bg-[#dce6da]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* CLASSIC SECTION */}
      {(selectedCategory === 'All' || selectedCategory === 'Classic') && classicTherapists.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-[24px] font-normal text-[#1B1C19]">Classic</h3>
            <span className="bg-[#E8EFE6] text-[#52634F] text-[13px] font-semibold px-3.5 py-1 rounded-full">
              ₹999
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
            {classicTherapists.map(renderTherapistCard)}
          </div>
        </div>
      )}

      {/* DELUXE SECTION */}
      {(selectedCategory === 'All' || selectedCategory === 'Deluxe') && deluxeTherapists.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-[24px] font-normal text-[#1B1C19]">Deluxe</h3>
            <span className="bg-[#E8EFE6] text-[#52634F] text-[13px] font-semibold px-3.5 py-1 rounded-full">
              ₹2,999
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
            {deluxeTherapists.map(renderTherapistCard)}
          </div>
        </div>
      )}

      {/* LUXURY SECTION */}
      {(selectedCategory === 'All' || selectedCategory === 'Luxury') && luxuryTherapists.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-[24px] font-normal text-[#1B1C19]">Luxury</h3>
            <span className="bg-[#E8EFE6] text-[#52634F] text-[13px] font-semibold px-3.5 py-1 rounded-full">
              ₹4,999 - ₹12,999
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
            {luxuryTherapists.map(renderTherapistCard)}
          </div>
        </div>
      )}

      {/* THERAPIST PROFILE & STAR RATING MODAL */}
      {profileTherapist && typeof document !== 'undefined' && createPortal((
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-stretch justify-center p-0 sm:items-center sm:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="therapist-profile-title"
          onClick={() => setProfileTherapist(null)}
        >
          <div
            className="bg-white w-full h-[100dvh] max-w-none rounded-none overflow-hidden border-0 shadow-2xl relative flex flex-col sm:h-auto sm:max-h-[calc(100vh-48px)] sm:max-w-[420px] sm:rounded-3xl sm:border sm:border-[#e9e8e3] md:max-w-[520px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setProfileTherapist(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-[#efeee8] text-[#747871] hover:text-[#1b1c19] hover:bg-[#e4e2dd] transition-colors z-20 cursor-pointer"
              aria-label="Close therapist profile"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto p-4 sm:p-5 space-y-5 sm:space-y-6 no-scrollbar">
              {/* Profile Header */}
              <div className="flex gap-3 sm:gap-4 items-center pr-10 pt-1">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#efeee8] flex-shrink-0 border border-[#e9e8e3]">
                  <CardImage
                    src={profileTherapist.avatarUrl}
                    alt={profileTherapist.name}
                    className="w-full h-full object-cover"
                    aspectRatio="square"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-1 text-[9px] sm:text-[10px] font-bold text-[#22c55e] bg-[#d5e8cf]/50 px-2.5 py-0.5 rounded-full w-fit max-w-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#3b4b38] flex-shrink-0" />
                    <span className="truncate">VERIFIED CERTIFIED THERAPIST</span>
                  </div>
                  <h3 id="therapist-profile-title" className="font-serif text-xl sm:text-2xl leading-tight text-[#1b1c19] truncate">{profileTherapist.name}</h3>
                  <p className="text-xs text-[#747871]">
                    {profileTherapist.category} Category • {profileTherapist.experienceYears} Years Experience
                  </p>
                  <p className="text-xs font-semibold text-[#52634f] line-clamp-2">
                    Specialty: {profileTherapist.specialty}
                  </p>
                </div>
              </div>

              {/* STAR RATING OVERVIEW CARD */}
              <div className="bg-[#fbf9f4] rounded-2xl p-4 border border-[#e9e8e3] space-y-3">
              <div className="flex items-center justify-between border-b border-[#e9e8e3] pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#747871] block">
                    CLIENT SATISFACTION RATING
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="font-serif text-3xl font-bold text-[#1b1c19]">
                      {profileTherapist.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-[#747871]">out of 5.0</span>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <StarRating rating={profileTherapist.rating} size="lg" />
                  <span className="text-[11px] font-medium text-[#52634f]">
                    {profileTherapist.reviewsCount} verified ratings
                  </span>
                </div>
              </div>

              {/* Rating Quality Aspects */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white p-2 rounded-xl border border-[#e9e8e3]">
                  <span className="text-[9px] uppercase font-bold text-[#747871] block">TECHNIQUE</span>
                  <span className="text-xs font-bold text-[#1b1c19]">5.0 ★</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#e9e8e3]">
                  <span className="text-[9px] uppercase font-bold text-[#747871] block">HYGIENE</span>
                  <span className="text-xs font-bold text-[#1b1c19]">4.9 ★</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#e9e8e3]">
                  <span className="text-[9px] uppercase font-bold text-[#747871] block">PUNCTUAL</span>
                  <span className="text-xs font-bold text-[#1b1c19]">4.9 ★</span>
                </div>
              </div>

              {/* DIRECT GOOGLE PROFILE RATING BUTTON FOR THIS THERAPIST */}
              <div className="pt-2 border-t border-[#e9e8e3]">
                <a
                  href={contactSettings?.googleReviewUrl || 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#f0f4ee] border border-[#4285F4]/40 hover:border-[#4285F4] rounded-xl text-xs font-semibold text-[#1b1c19] flex items-center justify-between transition-all group shadow-2xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-[#4285F4] text-white flex items-center justify-center font-bold text-xs">G</span>
                    <span className="text-xs">Review <strong>{profileTherapist.name} ({profileTherapist.rating}★)</strong> on Google</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[#4285F4] font-bold text-[11px] group-hover:translate-x-0.5 transition-transform">
                    <span>Google Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </a>
              </div>
              </div>

              {/* INTERACTIVE RATE THIS THERAPIST FORM */}
              <div className="bg-white rounded-2xl p-4 border border-[#d5e8cf] bg-[#d5e8cf]/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[#3b4b38]">
                  <Sparkles className="w-4 h-4 text-[#52634f]" />
                  <h4 className="font-serif font-semibold text-sm text-[#1b1c19]">
                    Rate & Review Therapist
                  </h4>
                </div>
                <span className="text-[10px] text-[#747871]">Client Feedback</span>
              </div>

              {reviewSubmitted ? (
                <div className="bg-[#d5e8cf] text-[#3b4b38] p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Thank you! Your rating and feedback have been added.</span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#444841] block mb-1">
                      Tap stars to choose rating:
                    </label>
                    <StarRating
                      rating={userRating}
                      interactive
                      size="lg"
                      onRatingChange={(r) => setUserRating(r)}
                      showValue
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Your Name (optional)"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-[#c4c8bf] bg-white focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                    />
                    <input
                      type="text"
                      placeholder="Feedback comment..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-[#c4c8bf] bg-white focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#52634f] hover:bg-[#3b4b38] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Submit Rating
                  </button>
                </form>
              )}
              </div>

              {/* VERIFIED CLIENT REVIEWS LIST */}
              <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-lg text-[#1b1c19]">Recent Client Reviews</h4>
                <span className="text-xs text-[#747871]">Verified Bookings</span>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                {(therapistReviews[profileTherapist.id] || [
                  { name: 'Meera Patel', date: '3 days ago', rating: 5, text: 'Arrived with clean towels, essential oil diffuser, and great therapeutic skill.' },
                  { name: 'Karan Joshi', date: '1 week ago', rating: 5, text: 'Extremely polite therapist. Solved my neck stiffness.' },
                ]).map((rev, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-[#e9e8e3] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#1b1c19]">{rev.name}</span>
                      <span className="text-[10px] text-[#747871]">{rev.date}</span>
                    </div>
                    <StarRating rating={rev.rating} size="sm" />
                    <p className="text-xs text-[#444841] leading-relaxed pt-0.5">{rev.text}</p>
                  </div>
                ))}
              </div>
              </div>
            </div>

            {/* ACTION CTA */}
            <div className="border-t border-[#e9e8e3] bg-white/95 backdrop-blur-xs px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
              <div>
                <span className="text-[10px] text-[#747871] uppercase font-bold block">SERVICE CHARGES</span>
                <span className="font-serif text-xl font-bold text-[#1b1c19]">
                  ₹{profileTherapist.price.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectTherapist(profileTherapist);
                  setProfileTherapist(null);
                  setActiveTab('booking');
                }}
                className="px-5 sm:px-6 py-3 bg-[#52634f] hover:bg-[#3b4b38] text-white rounded-full text-xs font-semibold uppercase tracking-wider transition-colors shadow-md cursor-pointer flex-shrink-0"
              >
                Book {profileTherapist.name.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};
