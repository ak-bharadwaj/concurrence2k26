"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Users, IndianRupee, ArrowRight } from "lucide-react";
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
  technical: "group-hover:shadow-cyan-500/20",
  cultural: "group-hover:shadow-purple-500/20",
  workshops: "group-hover:shadow-emerald-500/20",
  gaming: "group-hover:shadow-orange-500/20",
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

export function FeaturedEvents() {
  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

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
          <p className="text-white/40 max-w-md text-sm px-4">
            Explore our exciting lineup of technical events and workshops
          </p>
        </motion.div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
                  "relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/[0.06] transition-all duration-500",
                  "hover:bg-white/[0.05] hover:border-white/10",
                  `group-hover:shadow-2xl ${categoryGlow[event.category]}`
                )}>
                  {/* Event Image */}
                  <div className="relative h-36 sm:h-40 overflow-hidden">
                    <Image
                      src={eventImages[event.slug] || `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop`}
                      alt={event.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Category Badge */}
                    <span
                      className={cn(
                        "absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-gradient-to-r text-white uppercase tracking-wide",
                        categoryColors[event.category]
                      )}
                    >
                      {categories.find((c) => c.id === event.category)?.name}
                    </span>
                  </div>

                  <div className="p-4 space-y-2.5">
                    {/* Event Name */}
                    <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300 line-clamp-1">
                      {event.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                      {event.shortDescription}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                        <Users className="w-3 h-3" />
                        {event.teamSize}
                      </span>
                      <span className="flex items-center gap-0.5 text-[11px] text-cyan-400/80 font-medium">
                        <IndianRupee className="w-2.5 h-2.5" />
                        {event.registrationFee}
                      </span>
                    </div>
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
