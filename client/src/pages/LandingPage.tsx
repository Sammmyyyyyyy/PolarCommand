import React, { useState } from 'react';
import { Navbar } from '../components/landing/Navbar';
import { HeroContent } from '../components/landing/HeroContent';
import { HeroDashboard } from '../components/landing/HeroDashboard';
import { BottomFeatures } from '../components/landing/BottomFeatures';
import { OverviewModal } from '../components/landing/OverviewModal';
import { WhatWeDoSection } from '../components/landing/WhatWeDoSection';

interface LandingPageProps {
  onEnterApp: () => void;
  onNavigatePage?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#EAF5FF]">
      {/* TOP NAVBAR: Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar
          onEnterApp={onEnterApp}
          onOpenVideo={() => setIsOverviewOpen(true)}
        />
      </div>

      {/* 1. HERO SECTION */}
      <section
        id="hero"
        className="relative w-full h-screen min-h-[720px] overflow-hidden select-none bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/images/polar-hero-background.png')",
          backgroundPosition: '72% bottom',
          backgroundSize: 'cover',
        }}
      >
        {/* Soft White / Light-Blue Gradient Fade */}
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.72)_0%,rgba(238,246,255,0.46)_32%,rgba(224,242,254,0.18)_58%,transparent_80%)]"
        />

        {/* CENTER HERO: Dashboard & left content vertically aligned */}
        <div className="absolute inset-0 pt-[72px] pb-[84px] px-[clamp(24px,4.5vw,64px)] flex items-center justify-between pointer-events-none z-30">
          <div className="w-[clamp(440px,40vw,580px)] pointer-events-auto">
            <HeroContent
              onEnterApp={onEnterApp}
              onOpenVideo={() => setIsOverviewOpen(true)}
            />
          </div>
          <div className="w-[clamp(550px,46vw,840px)] pointer-events-auto flex justify-end">
            <HeroDashboard onEnterApp={onEnterApp} />
          </div>
        </div>

        {/* BOTTOM FEATURE ROW */}
        <div className="absolute bottom-[clamp(24px,4.5vh,48px)] left-[clamp(24px,4.5vw,64px)] w-[clamp(480px,42vw,700px)] z-30">
          <BottomFeatures />
        </div>
      </section>

      {/* 2. WHAT WE DO SECTION */}
      <WhatWeDoSection />

      {/* Interactive 2-Min Platform Overview Walkthrough Modal */}
      <OverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        onEnterApp={onEnterApp}
      />
    </div>
  );
};
