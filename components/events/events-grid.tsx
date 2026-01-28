"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Users, IndianRupee, Calendar, ArrowRight } from "lucide-react";
import { events, categories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const categoryColors: Record<string, string> = {
  technical: "from-blue-500 to-cyan-500",
  cultural: "from-purple-500 to-pink-500",
  workshops: "from-green-500 to-emerald-500",
  gaming: "from-orange-500 to-red-500",
};

export function EventsGrid() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredEvents =
    selectedCategory === "all"
      ? events
      : events.filter((event) => event.category === selectedCategory);

  return (
    <section className="container mx-auto px-4">
      {/* Category Filters - Horizontally scrollable on mobile */}
      <div className="flex gap-2 sm:gap-3 mb-8 sm:mb-12 overflow-x-auto pb-2 sm:overflow-visible sm:flex-wrap sm:justify-center scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              "px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0",
              selectedCategory === category.id
                ? "bg-gradient-to-r text-white " + category.color
                : "glass-card text-muted-foreground hover:text-foreground hover:bg-white/10"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <motion.div
        layout
        className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link href={`/events/${event.slug}`} className="block group h-full">
                <div className="glass-card overflow-hidden h-full hover:bg-white/10 transition-all duration-300 hover:border-white/20 flex flex-col">
                  {/* Category Gradient Header */}
                  <div
                    className={cn(
                      "h-36 bg-gradient-to-br flex items-center justify-center relative overflow-hidden",
                      categoryColors[event.category]
                    )}
                  >
                    <span className="text-6xl font-bold text-white/20 group-hover:text-white/30 transition-colors">
                      {event.name.charAt(0)}
                    </span>
                    {/* Animated Shine Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col">
                    {/* Category Badge */}
                    <span
                      className={cn(
                        "inline-block w-fit px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r text-white",
                        categoryColors[event.category]
                      )}
                    >
                      {categories.find((c) => c.id === event.category)?.name}
                    </span>

                    {/* Event Name */}
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-neon-cyan transition-colors">
                      {event.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                      {event.shortDescription}
                    </p>

                    {/* Schedule */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 text-neon-cyan" />
                      <span>{event.schedule.date}</span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {event.teamSize}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-neon-cyan font-medium">
                        <IndianRupee className="w-3 h-3" />
                        {event.registrationFee}
                      </span>
                    </div>

                    {/* View Details */}
                    <Button
                      variant="ghost"
                      className="w-full mt-2 text-muted-foreground group-hover:text-foreground group-hover:bg-white/5"
                    >
                      View Details
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No events found in this category.
          </p>
        </div>
      )}
    </section>
  );
}
