import type { Metadata } from "next";
import { EventsGrid } from "@/components/events/events-grid";

export const metadata: Metadata = {
  title: "Events | RIPPLE 2026",
  description:
    "Explore all events at RIPPLE 2026 - Technical competitions, Cultural shows, Workshops, and Gaming tournaments. Find your perfect event and register now!",
};

export default function EventsPage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      {/* Header */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            All <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Events</span>
          </h1>
          <p className="text-white/40 max-w-lg mx-auto text-sm sm:text-base">
            Discover exciting competitions and workshops across multiple categories
          </p>
        </div>
      </section>

      {/* Events Grid */}
      <EventsGrid />
    </main>
  );
}
