import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  onEnterApp: () => void;
  onOpenVideo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onEnterApp }) => {
  const [activeTab, setActiveTab] = React.useState<string>('Home');

  const navItems = [
    { label: 'Home', id: 'Home' },
    { label: 'About', id: 'About' },
    { label: 'Features', id: 'Features' },
    { label: 'For Teams', id: 'For Teams' },
    { label: 'Contact', id: 'Contact' },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full px-[4.5vw] h-[58px] lg:h-[64px] flex items-center justify-between select-none relative z-50"
    >
      {/* Brand Logo */}
      <div className="flex-1 flex justify-start">
        <Logo onClick={onEnterApp} size="md" />
      </div>

      {/* Navigation Links (Centered, clean spacing) */}
      <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-9">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative py-1 group flex flex-col items-center cursor-pointer transition-colors"
            >
              <span
                className={`text-[12.5px] lg:text-[13.5px] font-medium transition-colors ${
                  isActive
                    ? 'text-[#0B1B35] font-semibold'
                    : 'text-[#475569] hover:text-[#0B1B35]'
                }`}
              >
                {item.label}
              </span>
              
              {/* Active Blue Indicator Underline */}
              {isActive && (
                <motion.span
                  layoutId="activeNavIndicator"
                  className="w-3.5 h-[2px] bg-[#1769E0] rounded-full mt-1 shadow-[0_1px_3px_rgba(23,105,224,0.4)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Login Button (Refined & compact) */}
      <div className="flex-1 flex justify-end items-center">
        <button
          onClick={onEnterApp}
          className="group relative inline-flex items-center gap-2 px-3.5 lg:px-4 py-1.5 lg:py-2 rounded-xl bg-[#1769E0] hover:bg-[#155fc9] text-white font-semibold text-[12px] lg:text-[13px] tracking-tight shadow-[0_3px_12px_rgba(23,105,224,0.3)] hover:shadow-[0_5px_16px_rgba(23,105,224,0.4)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer whitespace-nowrap"
        >
          {/* User Icon */}
          <svg
            className="w-3.5 h-3.5 text-white/95 transition-transform group-hover:scale-105"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          </svg>

          <span>Login to Dashboard</span>

          {/* Right Arrow */}
          <ArrowRight className="w-3.5 h-3.5 text-white transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.header>
  );
};
