"use client";

import React from "react";
import FloatingLines from "@/components/FloatingLines";
import { FloatingLinesErrorBoundary } from "@/components/FloatingLinesErrorBoundary";

export function GlobalBackground() {
    return (
        <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden bg-background">
            {/* Dynamic Lines Layer */}
            <div className="absolute inset-0 opacity-40">
                <FloatingLinesErrorBoundary>
                    <FloatingLines
                        linesGradient={["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"]}
                        enabledWaves={["top", "middle", "bottom"]}
                        lineCount={[3, 4, 3]}
                        lineDistance={[10, 8, 12]}
                        animationSpeed={0.5}
                        interactive={false}
                        bendRadius={6}
                        bendStrength={-0.3}
                        parallax={false}
                        mixBlendMode="screen"
                    />
                </FloatingLinesErrorBoundary>
            </div>

            {/* Dim & Texture Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background/90" />

            {/* Subtle Glows */}
            <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-0 left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />
        </div>
    );
}
