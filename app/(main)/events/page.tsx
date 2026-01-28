import type { Metadata } from "next";
import { EventsGrid } from "@/components/events/events-grid";

export const metadata: Metadata = {
  title: "Events | RIPPLE 2026",
  description:
    "Explore all events at RIPPLE 2026 - Technical competitions, Cultural shows, Workshops, and Gaming tournaments. Find your perfect event and register now!",
};

export default function EventsPage() {
  return (
    <main className="min-h-screen pt-24 pb-12">
      {/* Hero Section */}
      <section className="relative py-12 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[150px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[150px] -z-10" />

        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            All <span className="gradient-text">Events</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Discover exciting competitions, workshops, and performances across
            four categories. Filter by your interests and find your perfect
            event.
          </p>
        </div>
      </section>

      {/* Events Grid */}
      <EventsGrid />
    </main>
  );
}
