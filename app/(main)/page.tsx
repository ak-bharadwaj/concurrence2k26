import { Hero } from "@/components/home/hero";
import { FeaturedEvents } from "@/components/home/featured-events";
import { About } from "@/components/home/about";
import { ScheduleSection } from "@/components/home/schedule-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedEvents />
      <ScheduleSection />
      <About />
    </>
  );
}
