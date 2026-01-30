"use client";

import { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

export class FloatingLinesErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error but don't crash
        console.warn("FloatingLines WebGL error caught:", error.message);
    }

    render() {
        if (this.state.hasError) {
            // Fallback to a simple gradient background
            return this.props.fallback || (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
            );
        }

        return this.props.children;
    }
}
