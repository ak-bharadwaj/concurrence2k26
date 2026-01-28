"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Users, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { events, categories } from "@/lib/data";
import { cn } from "@/lib/utils";

const featuredEvents = events.slice(0, 6);

const categoryColors: Record<string, string> = {
  technical: "from-cyan-500 to-blue-500",
  cultural: "from-purple-500 to-pink-500",
  workshops: "from-emerald-500 to-teal-500",
  gaming: "from-orange-500 to-red-500",
};

const categoryGlow: Record<string, string> = {
  technical: "shadow-cyan-500/20",
  cultural: "shadow-purple-500/20",
  workshops: "shadow-emerald-500/20",
  gaming: "shadow-orange-500/20",
};

export function FeaturedEvents() {
  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center text-center mb-10 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Featured <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Events</span>
          </h2>
          <p className="text-white/50 max-w-md text-sm sm:text-base px-4">
            Explore our exciting lineup of technical and workshop events
          </p>
        </motion.div>

        {/* Events Grid - Mobile First */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {featuredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Link href={`/events/${event.slug}`} className="block group">
                <div className={cn(
                  "relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300",
                  "hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]",
                  `hover:shadow-xl ${categoryGlow[event.category]}`
                )}>
                  {/* Gradient Header */}
                  <div
                    className={cn(
                      "h-24 sm:h-28 bg-gradient-to-br flex items-center justify-center relative overflow-hidden",
                      categoryColors[event.category]
                    )}
                  >
                    <span className="text-5xl sm:text-6xl font-black text-white/10 group-hover:text-white/20 transition-colors duration-300">
                      {event.name.charAt(0)}
                    </span>

                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    {/* Category Badge */}
                    <span
                      className={cn(
                        "inline-block px-2.5 py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-gradient-to-r text-white uppercase tracking-wide",
                        categoryColors[event.category]
                      )}
                    >
                      {categories.find((c) => c.id === event.category)?.name}
                    </span>

                    {/* Event Name */}
                    <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300 line-clamp-1">
                      {event.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-white/50 line-clamp-2 leading-relaxed">
                      {event.shortDescription}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="flex items-center gap-1.5 text-xs text-white/40">
                        <Users className="w-3.5 h-3.5" />
                        {event.teamSize}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-cyan-400 font-semibold">
                        <IndianRupee className="w-3 h-3" />
                        {event.registrationFee}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mt-10 sm:mt-12"
        >
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-full px-6"
          >
            <Link href="/events">
              View All Events
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
