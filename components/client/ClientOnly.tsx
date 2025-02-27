'use client';

import { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyProps {
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Component that only renders its children on the client-side
 * This helps prevent hydration errors for components that use browser-only APIs
 */
export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
} 