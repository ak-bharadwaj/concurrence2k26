"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { festInfo, collegeInfo } from "@/lib/data";
import { CountdownTimer } from "./countdown-timer";
import FloatingLines from "@/components/FloatingLines";
import { Button } from "@/components/ui/moving-border";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* FloatingLines Background */}
      <div className="absolute inset-0 -z-10">
        <FloatingLines
          linesGradient={["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"]}
          enabledWaves={["top", "middle", "bottom"]}
          lineCount={[4, 6, 4]}
          lineDistance={[8, 6, 10]}
          animationSpeed={0.8}
          interactive={true}
          bendRadius={6}
          bendStrength={-0.4}
          parallax={true}
          parallaxStrength={0.15}
          mixBlendMode="screen"
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
      </div>

      <div className="container mx-auto px-4 text-center pt-24 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-5"
        >
          {/* Main Title - Premium Font */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="relative"
          >
            <span
              className="block text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                CONCURRENCE
              </span>
            </span>
            <span
              className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-widest mt-1"
              style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
            >
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                2K26
              </span>
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm sm:text-base md:text-lg text-white/60 max-w-lg mx-auto px-4"
          >
            {festInfo.tagline}
          </motion.p>

          {/* College Info - RGM College first, then Dept */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-1"
          >
            <p className="text-xs sm:text-sm text-white/50 px-4">
              {collegeInfo.name}
            </p>
            <p className="text-xs text-white/40 px-4">
              Department of Computer Science & Engineering
            </p>
          </motion.div>

          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-4"
          >
            <CountdownTimer targetDate="2026-02-27T09:00:00" />
          </motion.div>

          {/* Event Date */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 text-xs sm:text-sm font-medium text-cyan-400/80 border border-cyan-400/20 rounded-full bg-cyan-400/5">
              {festInfo.dates.start} — {festInfo.dates.end}
            </span>
          </motion.div>

          {/* CTA Button - Moving Border */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-4 flex justify-center"
          >
            <Link href="/events">
              <Button
                borderRadius="2rem"
                containerClassName="h-12 w-auto px-0"
                className="bg-background/80 border-white/10 px-6 gap-2 text-sm font-medium"
                borderClassName="bg-[radial-gradient(#22d3ee_40%,transparent_60%)]"
                duration={3000}
              >
                Explore Events
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator - Desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-1 bg-cyan-400/60 rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
