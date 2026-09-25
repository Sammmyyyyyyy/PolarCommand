import React from 'react';
import { motion } from 'framer-motion';

export const BottomFeatures: React.FC = () => {
  const features = [
    {
      title: 'Mission Planning',
      description: 'Plan and organize expeditions effortlessly',
      icon: (
        <svg
          className="w-4 h-4 lg:w-[18px] lg:h-[18px] text-[#1769E0]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
        </svg>
      ),
    },
    {
      title: 'Real-time Tracking',
      description: 'Monitor teams, cargo and routes live',
      icon: (
        <svg
          className="w-4 h-4 lg:w-[18px] lg:h-[18px] text-[#1769E0]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      title: 'Live Environmental Data',
      description: 'Weather, ice conditions and risk alerts',
      icon: (
        <svg
          className="w-4 h-4 lg:w-[18px] lg:h-[18px] text-[#1769E0]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="M20 12h2" />
          <path d="m19.07 4.93-1.41 1.41" />
          <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
          <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
        </svg>
      ),
    },
    {
      title: 'Faster Response',
      description: 'Detect issues early and keep everyone safe',
      icon: (
        <svg
          className="w-4 h-4 lg:w-[18px] lg:h-[18px] text-[#1769E0]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full select-none">
      {/* 4 Feature Items Grid: 4 columns, compact, leaving the right side clear for climbers */}
      <div className="grid grid-cols-4 gap-3 lg:gap-5 xl:gap-6">
        {features.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.45 + index * 0.07,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="group flex flex-col items-start cursor-default"
          >
            {/* Small Rounded Icon Container */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-white/75 backdrop-blur-md border border-white/85 shadow-[0_2px_8px_rgba(15,23,42,0.05)] flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-hover:bg-white/90 group-hover:shadow-[0_4px_14px_rgba(23,105,224,0.18)]">
              {item.icon}
            </div>

            {/* Title */}
            <h3 className="text-[12px] sm:text-[12.5px] lg:text-[13.5px] font-bold text-[#0B1B35] mt-1.5 sm:mt-2 tracking-tight whitespace-nowrap group-hover:text-[#1769E0] transition-colors">
              {item.title}
            </h3>

            {/* Description */}
            <p className="text-[10.5px] sm:text-[11px] lg:text-[11.5px] text-[#52637A] mt-0.5 leading-[1.35] max-w-[170px]">
              {item.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
