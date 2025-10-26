import { useState } from 'react';
import { ImageOff, Newspaper } from 'lucide-react';

interface FallbackImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

/**
 * Image component with fallback handling for broken/forbidden images
 * Automatically handles 403 errors from external news sources
 */
export const FallbackImage: React.FC<FallbackImageProps> = ({
  src,
  alt,
  className = "",
  fallbackIcon
}) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  // If no src or image failed to load, show fallback
  if (!src || imageError) {
    return (
      <div className={`flex items-center justify-center bg-secondary/20 ${className}`}>
        {fallbackIcon || <Newspaper className="w-12 h-12 text-muted-foreground/40" />}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setImageError(true);
          setLoading(false);
        }}
        // Add referrer policy to try to avoid some 403 issues
        referrerPolicy="no-referrer"
        // Add cross-origin for better compatibility
        crossOrigin="anonymous"
      />
    </div>
  );
};

/**
 * Utility function to create placeholder image URLs
 * Can be used as fallback for news articles without images
 */
export const getPlaceholderImage = (category: string): string => {
  const placeholders = {
    general: '/placeholder.svg',
    crop_care: '/placeholder.svg',
    pest_control: '/placeholder.svg', 
    weather: '/placeholder.svg',
    market_prices: '/placeholder.svg',
    technology: '/placeholder.svg',
    government_schemes: '/placeholder.svg',
    best_practices: '/placeholder.svg',
    seasonal_tips: '/placeholder.svg'
  };

  return placeholders[category as keyof typeof placeholders] || '/placeholder.svg';
};