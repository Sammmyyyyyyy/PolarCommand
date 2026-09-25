import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Satellite, Users, ShieldAlert } from 'lucide-react';

const CARDS = [
  {
    number: '01',
    title: 'Plan Better',
    desc: 'Organize missions, set routes and checkpoints, and manage teams and supplies with ease.',
    image: '/images/what-we-do/card-01-plan-better.png',
    alt: 'Mission planning with snowy mountains and blue route checkpoints',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Stay Informed',
    desc: 'Track your teams and cargo live with satellite data, weather updates, and real-time environmental conditions.',
    image: '/images/what-we-do/card-02-stay-informed.png',
    alt: 'Satellite surveillance over Antarctic ice with radar tracking pin',
    icon: Satellite,
  },
  {
    number: '03',
    title: 'Coordinate Teams',
    desc: 'Keep everyone aligned with real-time communication, task management, and resource tracking.',
    image: '/images/what-we-do/card-03-coordinate-teams.png',
    alt: 'Polar expedition team trekking with Team B status callout badge',
    icon: Users,
  },
  {
    number: '04',
    title: 'Respond Faster',
    desc: 'Detect risks early, get instant alerts, and take quick action to keep your team safe.',
    image: '/images/what-we-do/card-04-respond-faster.png',
    alt: 'High wind alert panel with red alert indicator and environmental telemetry',
    icon: ShieldAlert,
  },
];

export const WhatWeDoSection: React.FC = () => {
  return (
    <section
      id="what-we-do"
      className="relative w-full min-h-screen flex flex-col justify-center items-center py-14 px-6 md:px-12 overflow-hidden bg-cover bg-center select-none"
      style={{
        backgroundImage: "url('/images/what-we-do/what-we-do-bg.png')",
        backgroundColor: '#EAF5FF',
      }}
    >
      {/* Atmosphere subtle gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_48%,rgba(255,255,255,0.3)_0%,rgba(238,246,255,0.15)_60%,transparent_100%)]" />

      <div className="relative z-10 w-full max-w-[1240px] mx-auto flex flex-col items-center">
        {/* Header Area */}
        <div className="flex flex-col items-center text-center mb-8 w-full">
          {/* Label Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#EAF5FF]/85 border border-[#1677FF]/25 backdrop-blur-md mb-2.5 shadow-sm">
            <span className="w-3.5 h-[1.5px] bg-[#1677FF] opacity-80" />
            <span className="text-[11px] font-bold tracking-[0.12em] text-[#1677FF] uppercase">
              WHAT WE DO
            </span>
            <span className="w-3.5 h-[1.5px] bg-[#1677FF] opacity-80" />
          </div>

          {/* Heading */}
          <h2 className="text-[28px] sm:text-[36px] lg:text-[44px] font-extrabold text-[#071A36] leading-[1.15] tracking-tight mb-2">
            From Planning to Action,<br />
            <span className="text-[#1677FF]">We’ve Got You Covered</span>
          </h2>

          {/* Description */}
          <p className="text-[13.5px] sm:text-[15px] font-medium text-[#556B8D] leading-relaxed max-w-[680px] mx-auto">
            PolarCommand brings everything you need for a successful expedition — mission planning,
            real-time tracking, live environmental data, and instant incident response — all in one place.
          </p>
        </div>

        {/* Cards Row Container */}
        <div className="relative w-full mt-3">
          {/* Dotted Connection Line across cards */}
          <div className="hidden lg:block absolute -top-4 left-0 right-0 h-9 z-0 pointer-events-none">
            <svg
              className="w-full h-full"
              viewBox="0 0 1000 40"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M 10 26 C 60 22, 95 16, 125 16 C 155 16, 215 30, 250 30 C 285 30, 345 16, 375 16 C 405 16, 465 30, 500 30 C 535 30, 595 16, 625 16 C 655 16, 715 30, 750 30 C 785 30, 845 16, 875 16 C 905 16, 940 22, 990 26"
                stroke="rgba(22, 119, 255, 0.45)"
                strokeWidth="1.8"
                strokeDasharray="4 5"
              />
            </svg>
          </div>

          {/* Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 w-full">
            {CARDS.map(({ number, title, desc, image, alt, icon: Icon }) => (
              <motion.article
                key={title}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="group relative flex flex-col bg-white/88 border-[1.5px] border-white/95 rounded-[20px] p-5 pb-4 shadow-[0_10px_30px_rgba(7,26,54,0.08),0_0_0_1px_rgba(22,119,255,0.1)] backdrop-blur-xl hover:border-[#1677FF]/30 hover:shadow-[0_20px_42px_rgba(7,26,54,0.14),0_0_0_1px_rgba(22,119,255,0.22)] transition-colors duration-300"
              >
                {/* Number Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-[1.5px] border-[#1677FF]/35 shadow-[0_4px_12px_rgba(22,119,255,0.15)] flex items-center justify-center text-[12px] font-extrabold text-[#1677FF] z-20 group-hover:bg-[#1677FF] group-hover:text-white group-hover:border-[#1677FF] transition-all duration-200">
                  {number}
                </div>

                {/* Card Icon */}
                <div className="w-11 h-11 rounded-xl bg-[#1677FF]/8 border border-[#1677FF]/15 flex items-center justify-center text-[#1677FF] mb-3 group-hover:scale-105 group-hover:bg-[#1677FF]/14 transition-all duration-200">
                  <Icon className="w-5 h-5" />
                </div>

                {/* Card Title */}
                <h3 className="text-[17px] font-extrabold text-[#071A36] tracking-tight mb-1.5">
                  {title}
                </h3>

                {/* Card Description */}
                <p className="text-[12.5px] text-[#556B8D] leading-[1.48] mb-3.5 flex-1">
                  {desc}
                </p>

                {/* Card Image */}
                <div className="relative w-full aspect-[490/238] rounded-xl overflow-hidden shadow-sm border border-white/85">
                  <img
                    src={image}
                    alt={alt}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
