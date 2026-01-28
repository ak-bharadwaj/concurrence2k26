import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  IndianRupee,
  Trophy,
  Phone,
  User,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { events, categories } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

const categoryColors: Record<string, string> = {
  technical: "from-blue-500 to-cyan-500",
  cultural: "from-purple-500 to-pink-500",
  workshops: "from-green-500 to-emerald-500",
  gaming: "from-orange-500 to-red-500",
};

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);

  if (!event) {
    return {
      title: "Event Not Found | RIPPLE 2026",
    };
  }

  return {
    title: `${event.name} | RIPPLE 2026`,
    description: event.shortDescription,
    openGraph: {
      title: `${event.name} | RIPPLE 2026`,
      description: event.shortDescription,
      type: "website",
    },
  };
}

export function generateStaticParams() {
  return events.map((event) => ({
    slug: event.slug,
  }));
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);

  if (!event) {
    notFound();
  }

  const category = categories.find((c) => c.id === event.category);

  return (
    <main className="min-h-screen pt-24 pb-12">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-[200px] -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[200px] -z-10" />

      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Banner */}
            <div
              className={cn(
                "h-64 md:h-80 rounded-2xl bg-gradient-to-br flex items-center justify-center relative overflow-hidden",
                categoryColors[event.category]
              )}
            >
              <span className="text-[150px] font-bold text-white/20">
                {event.name.charAt(0)}
              </span>
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div>
                  <span
                    className={cn(
                      "inline-block px-4 py-1.5 text-sm font-medium rounded-full bg-white/20 text-white backdrop-blur-sm"
                    )}
                  >
                    {category?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Title & Description */}
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {event.name}
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {event.fullDescription}
              </p>
            </div>

            {/* Rules & Guidelines */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-neon-cyan" />
                Rules & Guidelines
              </h2>
              <ul className="space-y-3">
                {event.rules.map((rule, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-muted-foreground"
                  >
                    <span className="w-6 h-6 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0 text-xs text-neon-cyan font-medium">
                      {index + 1}
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coordinators */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card p-6 space-y-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-neon-blue" />
                  Faculty Coordinator
                </h3>
                <div className="space-y-2">
                  <p className="text-foreground font-medium">
                    {event.facultyCoordinator.name}
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Phone className="w-4 h-4" />
                    {event.facultyCoordinator.phone}
                  </p>
                </div>
              </div>

              <div className="glass-card p-6 space-y-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-neon-purple" />
                  Student Coordinator
                </h3>
                <div className="space-y-2">
                  <p className="text-foreground font-medium">
                    {event.studentCoordinator.name}
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Phone className="w-4 h-4" />
                    {event.studentCoordinator.phone}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <div className="glass-card p-6 space-y-5 sticky top-28">
              <h2 className="text-xl font-semibold text-foreground">
                Event Details
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium text-foreground">
                      {event.schedule.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-neon-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium text-foreground">
                      {event.schedule.time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-neon-purple" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Venue</p>
                    <p className="font-medium text-foreground">
                      {event.schedule.venue}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Team Size</p>
                    <p className="font-medium text-foreground">
                      {event.teamSize}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Registration Fee</span>
                  <span className="flex items-center gap-1 text-2xl font-bold text-neon-cyan">
                    <IndianRupee className="w-5 h-5" />
                    {event.registrationFee}
                  </span>
                </div>

                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:opacity-90 text-white border-0"
                  size="lg"
                >
                  <Link href={`/register?event=${event.slug}`}>
                    Register Now
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Prizes Card */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Prizes
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
                  <span className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold text-sm">
                      1
                    </span>
                    <span className="text-foreground">First Prize</span>
                  </span>
                  <span className="font-bold text-yellow-500">
                    {event.prizes.first}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-400/10">
                  <span className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gray-400/20 flex items-center justify-center text-gray-400 font-bold text-sm">
                      2
                    </span>
                    <span className="text-foreground">Second Prize</span>
                  </span>
                  <span className="font-bold text-gray-400">
                    {event.prizes.second}
                  </span>
                </div>

                {event.prizes.third && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-700/10">
                    <span className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-orange-700/20 flex items-center justify-center text-orange-700 font-bold text-sm">
                        3
                      </span>
                      <span className="text-foreground">Third Prize</span>
                    </span>
                    <span className="font-bold text-orange-700">
                      {event.prizes.third}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
