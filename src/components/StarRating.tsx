import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
  reviewsCount?: number;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  showValue = false,
  reviewsCount,
  className = '',
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className={`flex items-center space-x-1.5 ${className}`}>
      <div className="flex items-center space-x-0.5">
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = currentDisplayRating >= starValue;
          const isHalf = !isFilled && currentDisplayRating > index && currentDisplayRating < starValue;

          return (
            <button
              key={index}
              type={interactive ? 'button' : undefined}
              disabled={!interactive}
              onClick={() => interactive && onRatingChange && onRatingChange(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform focus:outline-none' : 'cursor-default'}`}
              aria-label={`Rate ${starValue} stars`}
            >
              <Star
                className={`${starSizes[size]} transition-colors ${
                  isFilled
                    ? 'fill-[#eab308] text-[#eab308]'
                    : isHalf
                    ? 'fill-[#eab308]/50 text-[#eab308]'
                    : 'fill-[#e4e2dd] text-[#c4c8bf]'
                }`}
              />
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className={`font-bold text-[#1b1c19] ${textSizes[size]}`}>
          {rating.toFixed(1)}
        </span>
      )}

      {reviewsCount !== undefined && (
        <span className={`text-[#747871] ${textSizes[size]}`}>
          ({reviewsCount})
        </span>
      )}
    </div>
  );
};
