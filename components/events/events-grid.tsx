"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Users, IndianRupee, ArrowUpRight } from "lucide-react";
import { events, categories } from "@/lib/data";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  technical: "from-cyan-500 to-blue-500",
  cultural: "from-purple-500 to-pink-500",
  workshops: "from-emerald-500 to-teal-500",
  gaming: "from-orange-500 to-red-500",
};

const categoryAccent: Record<string, string> = {
  technical: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5",
  cultural: "text-purple-400 border-purple-400/20 bg-purple-400/5",
  workshops: "text-emerald-400 border-emerald-400/20 bg-emerald-400/5",
  gaming: "text-orange-400 border-orange-400/20 bg-orange-400/5",
};

// Event images mapping
const eventImages: Record<string, string> = {
  techsprint: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop",
  "ideathon-ideate-x": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop",
  "codequest-hackathon": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop",
  "prompt-craft": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop",
  "webathon": "https://images.unsplash.com/photo-1547658719-da2b51169166?w=400&h=300&fit=crop",
  "poster-presentation": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop",
  "paper-presentation": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop",
  "project-expo": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
  "technical-quiz": "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&h=300&fit=crop",
  "debugging-battleground": "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400&h=300&fit=crop",
};

export function EventsGrid() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredEvents =
    selectedCategory === "all"
      ? events
      : events.filter((event) => event.category === selectedCategory);

  return (
    <section className="container mx-auto px-4">
      {/* Category Filters - Minimal pill design */}
      <div className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center sm:flex-wrap">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 border",
              selectedCategory === category.id
                ? "bg-white text-black border-white"
                : "bg-transparent text-white/50 border-white/10 hover:border-white/20 hover:text-white/70"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Events Grid - Minimal cards */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
      >
        <AnimatePresence mode="popLayout">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
            >
              <Link href={`/events/${event.slug}`} className="block group">
                <div className="relative overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.06] transition-all duration-500 hover:bg-white/[0.04] hover:border-white/10">
                  {/* Image */}
                  <div className="relative h-40 sm:h-44 overflow-hidden">
                    <Image
                      src={eventImages[event.slug] || `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop`}
                      alt={event.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Category badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-semibold rounded-full bg-gradient-to-r text-white uppercase tracking-wide",
                          categoryColors[event.category]
                        )}
                      >
                        {categories.find((c) => c.id === event.category)?.name}
                      </span>
                    </div>

                    {/* Arrow indicator */}
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-white/20">
                      <ArrowUpRight className="w-4 h-4 text-white" />
                    </div>

                    {/* Event name on image */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300">
                        {event.name}
                      </h3>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Description */}
                    <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                      {event.shortDescription}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] text-white/30">
                          <Users className="w-3 h-3" />
                          {event.teamSize}
                        </span>
                        <span className="text-white/10">•</span>
                        <span className="text-[11px] text-white/30">
                          {event.schedule.date}
                        </span>
                      </div>
                      <span className={cn(
                        "flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full border",
                        categoryAccent[event.category]
                      )}>
                        <IndianRupee className="w-2.5 h-2.5" />
                        {event.registrationFee}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/40 text-sm">
            No events found in this category.
          </p>
        </div>
      )}
    </section>
  );
}
