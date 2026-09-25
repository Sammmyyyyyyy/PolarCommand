import React from 'react';

interface LogoProps {
  className?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', onClick, size = 'md' }) => {
  const iconSizes = {
    sm: 'w-6 h-5',
    md: 'w-8 h-6 sm:w-8.5 sm:h-6.5',
    lg: 'w-10 h-8',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-[16px] sm:text-[17.5px]',
    lg: 'text-xl',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 cursor-pointer select-none transition-transform duration-150 hover:opacity-95 ${className}`}
    >
      {/* Precision Polar Command Mountain Icon - Slightly Refined Scale */}
      <svg
        className={iconSizes[size]}
        viewBox="0 0 46 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Peak (Navy / Shadowed facet) */}
        <polygon points="15,9 2,32 23,32" fill="#0C2340" />
        <polygon points="15,9 10,21 16,19 12,28 17,27 15,32 23,32" fill="#143E6E" />

        {/* Right Peak (Primary Vivid Polar Blue) */}
        <polygon points="26,2 14,32 44,32" fill="#1769E0" />
        
        {/* Right Peak facets & snow shadows */}
        <polygon points="26,2 35,32 44,32" fill="#1255B8" />

        {/* Crisp Geometric White Snow Caps & Ridge Striations */}
        <path
          d="M26 2L22 11L27 13L20 22L24 23L16 32"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 9L11 16L15 18L9 26L13 27L8 32"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Summit snow highlights */}
        <polygon points="26,2 24,7 28,7" fill="white" />
        <polygon points="15,9 13,13 17,13" fill="white" />
      </svg>

      {/* Typography: POLAR (Dark Navy) + COMMAND (Polar Blue) */}
      <div className={`font-black tracking-tight ${textSizes[size]} leading-none flex items-center gap-1.5`}>
        <span className="text-[#0B1B35] font-extrabold tracking-[-0.02em]">POLAR</span>
        <span className="text-[#1769E0] font-extrabold tracking-[-0.02em]">COMMAND</span>
      </div>
    </div>
  );
};
