import React from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Play } from 'lucide-react';

interface HeroContentProps {
  onEnterApp: () => void;
  onOpenVideo?: () => void;
}

export const HeroContent: React.FC<HeroContentProps> = ({ onEnterApp, onOpenVideo }) => {
  return (
    <div className="flex flex-col justify-center select-none">
      {/* 1. Pill Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="mb-2.5 lg:mb-3.5"
      >
        <div className="inline-flex items-center px-3 py-0.5 lg:py-1 rounded-full bg-white/80 backdrop-blur-md border border-white/90 shadow-[0_2px_6px_rgba(23,105,224,0.06)]">
          <span className="text-[10px] lg:text-[11px] font-bold tracking-[0.16em] uppercase text-[#1B6FD8]">
            PLAN &middot; MONITOR &middot; COORDINATE &middot; RESPOND
          </span>
        </div>
      </motion.div>

      {/* 2. Main Heading: Exactly TWO Lines, ~5-8% smaller */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mb-3 lg:mb-3.5"
      >
        <h1 className="text-[clamp(33px,3.4vw,56px)] font-extrabold tracking-[-0.03em] leading-[1.05]">
          <span className="block text-[#0B1B35] whitespace-nowrap">
            Smarter Expeditions
          </span>
          <span className="block text-[#1769E0] whitespace-nowrap">
            Safer Discoveries
          </span>
        </h1>
      </motion.div>

      {/* 3. Hero Paragraph Description: Slightly narrower (max-w-[430px]) */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="text-[#24354B] text-[clamp(12.5px,0.88vw,14.5px)] leading-[1.5] max-w-[430px] mb-4.5 lg:mb-6 font-normal"
      >
        PolarCommand is an all-in-one platform to{' '}
        <strong className="font-bold text-[#0B1B35]">plan missions</strong>,{' '}
        <strong className="font-bold text-[#0B1B35]">track teams and cargo</strong>,{' '}
        <strong className="font-bold text-[#0B1B35]">monitor real-time conditions</strong>, and{' '}
        <strong className="font-bold text-[#0B1B35]">respond</strong> to incidents — built for the world’s most extreme environments.
      </motion.p>

      {/* 4. Dual CTA Buttons: Smaller & More Refined */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-start gap-3.5 lg:gap-4.5"
      >
        {/* Primary CTA: Login to Dashboard */}
        <div className="flex flex-col items-start">
          <button
            onClick={onEnterApp}
            className="group w-[clamp(185px,13.8vw,230px)] h-[clamp(38px,4.3vh,46px)] rounded-xl bg-[#1769E0] hover:bg-[#1358BD] text-white font-semibold text-[12.5px] lg:text-[13.5px] tracking-tight shadow-[0_6px_18px_-3px_rgba(23,105,224,0.4)] hover:shadow-[0_10px_24px_-3px_rgba(23,105,224,0.5)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Lock className="w-[15px] h-[15px] text-white transition-transform group-hover:scale-105" />
            <span>Login to Dashboard</span>
            <ArrowRight className="w-[15px] h-[15px] text-white transition-transform group-hover:translate-x-1" />
          </button>
          
          <span className="text-[10px] lg:text-[11px] text-[#546882] mt-1 font-normal pl-0.5 whitespace-nowrap">
            Access mission data, live tracking and operations.
          </span>
        </div>

        {/* Secondary CTA: See How It Works */}
        <div className="flex flex-col items-start">
          <button
            onClick={onOpenVideo || onEnterApp}
            className="group w-[clamp(145px,10.6vw,175px)] h-[clamp(38px,4.3vh,46px)] rounded-xl bg-white/85 hover:bg-white text-[#0B1B35] border-[1.5px] border-[#1769E0] font-semibold text-[12.5px] lg:text-[13.5px] tracking-tight backdrop-blur-md shadow-[0_3px_12px_rgba(15,23,42,0.05)] hover:shadow-[0_6px_16px_rgba(23,105,224,0.16)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span className="w-4 h-4 rounded-full border-[1.5px] border-[#1769E0] flex items-center justify-center bg-blue-50/70 transition-transform group-hover:scale-105">
              <Play className="w-2 h-2 text-[#1769E0] fill-[#1769E0] ml-0.5" />
            </span>
            <span>See How It Works</span>
          </button>

          <span className="text-[10px] lg:text-[11px] text-[#546882] mt-1 font-normal pl-0.5 whitespace-nowrap">
            Watch 2 min overview
          </span>
        </div>
      </motion.div>
    </div>
  );
};
