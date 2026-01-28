import React from "react"
import { GlassNavbar } from "@/components/glass-navbar";
import { Footer } from "@/components/footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GlassNavbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
