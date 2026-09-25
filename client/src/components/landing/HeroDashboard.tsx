import React, { useRef, useState, useEffect } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

interface HeroDashboardProps {
  onEnterApp: () => void;
}

export const HeroDashboard: React.FC<HeroDashboardProps> = ({ onEnterApp }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse tilt tracking with smooth spring physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3.5, 1.0]), {
    stiffness: 180,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6.5, -3.0]), {
    stiffness: 180,
    damping: 24,
  });
  const scale = useSpring(isHovered ? 1.01 : 1, {
    stiffness: 220,
    damping: 26,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const xPct = e.clientX / innerWidth - 0.5;
      const yPct = e.clientY / innerHeight - 0.5;
      mouseX.set(xPct);
      mouseY.set(yPct);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ perspective: 1400 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onEnterApp}
        className="relative group cursor-pointer w-full"
      >
        {/* Ambient Backlight Glow */}
        <div className="absolute -inset-4 bg-gradient-to-r from-sky-400/20 via-blue-500/15 to-indigo-400/20 rounded-[28px] blur-2xl opacity-60 group-hover:opacity-85 transition-opacity duration-500 pointer-events-none" />

        {/* Premium Translucent Frosted Glass Card Border (Matching Reference 3) */}
        <div className="relative rounded-[22px] lg:rounded-[26px] p-2 lg:p-2.5 bg-white/45 backdrop-blur-md border border-white/80 shadow-[0_24px_55px_-12px_rgba(11,27,53,0.32),0_0_35px_rgba(255,255,255,0.45)] transition-shadow duration-300 group-hover:shadow-[0_30px_70px_-12px_rgba(11,27,53,0.4),0_0_45px_rgba(255,255,255,0.6)]">
          
          {/* Inner Dashboard Wrapper with exact Reference 2 visual */}
          <div className="relative rounded-[16px] lg:rounded-[18px] overflow-hidden bg-white/95 shadow-sm">
            {/* Exact High-Fidelity Reference 2 Dashboard Image */}
            <img
              src="/images/polar-dashboard.png"
              alt="Polar Command Mission Control Dashboard"
              className="w-full h-auto block select-none pointer-events-none transform translate-z-0"
              loading="eager"
            />

            {/* LIVE DYNAMIC MICRO-INTERACTIONS LAYER OVER THE MOCKUP */}

            {/* 1. Pulsing Crevasse Risk Alert Radar Beacon (Bottom of route line, Antarctica) */}
            <div
              className="absolute top-[67.8%] left-[48.8%] -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
              title="Active Crevasse Risk Alert"
            >
              <span className="absolute w-8 h-8 rounded-full bg-rose-500/35 animate-ping" />
              <span className="absolute w-5 h-5 rounded-full bg-rose-500/50 animate-pulse" />
            </div>

            {/* 2. Pulsing Field Team B Location Beacon (Mid route line) */}
            <div
              className="absolute top-[53.8%] left-[40.6%] -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
              title="Field Team B (In Transit)"
            >
              <span className="absolute w-7 h-7 rounded-full bg-blue-500/35 animate-ping" style={{ animationDuration: '2.5s' }} />
              <span className="absolute w-4 h-4 rounded-full bg-blue-500/40 animate-pulse" />
            </div>

            {/* 3. Research Base Alpha Beacon (Upper route start) */}
            <div
              className="absolute top-[34.8%] left-[37.8%] -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
              title="Research Base Alpha"
            >
              <span className="absolute w-6 h-6 rounded-full bg-emerald-500/30 animate-ping" style={{ animationDuration: '3s' }} />
            </div>

            {/* 4. Active Mission "Ongoing" Status Pulse Dot */}
            <div className="absolute top-[15.4%] left-[90.2%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-500/40 animate-ping" />
            </div>

            {/* 5. Critical Alerts Live Pulse Warning */}
            <div className="absolute top-[44.8%] left-[69.2%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <span className="absolute w-3.5 h-3.5 rounded-full bg-rose-500/40 animate-ping" />
            </div>

            {/* Interactive "Click to Launch Mission Control" Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-sky-950/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
              <div className="px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white text-xs font-semibold text-[#0B1B35] shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                <span className="w-2 h-2 rounded-full bg-[#1769E0] animate-pulse" />
                <span>Launch Interactive Command Center</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
