'use client';

import { useCallback, useEffect, useRef } from 'react';

// Global cache for loading promises to avoid creating new ones on each render
const loadingPromiseCache = new Map<string, Promise<void>>();

/**
 * Creates a loading resource hook factory
 * @returns A function that creates a loading resource hook
 */
export function createLoadingResourceHook() {
    // Ref to store resolve functions for loading promises
    const resolveRefsMap = useRef<Map<string, (() => void) | null>>(new Map());

    /**
     * Creates an effect to resolve promises when loading state changes
     * @param isLoading Current loading state
     */
    const createLoadingEffect = (isLoading: boolean) => {
        useEffect(() => {
            if (!isLoading) {
                // Add a small delay for smooth transitions
                setTimeout(() => {
                    // Resolve all pending promises
                    resolveRefsMap.current.forEach((resolveFunc, key) => {
                        if (resolveFunc) {
                            resolveFunc();
                            resolveRefsMap.current.set(key, null);
                        }
                    });
                }, 300);
            }
        }, [isLoading]);
    };

    /**
     * Creates a hook to use a loading resource for Suspense
     * @param isLoading Current loading state
     * @param prefix Prefix for the resource key
     * @returns A function that can be used to trigger Suspense
     */
    const createUseLoadingResource = (isLoading: boolean, prefix: string = 'resource') => {
        return useCallback((resourceKey: string) => {
            // If we're loading, create and throw a promise
            if (isLoading) {
                // Create a unique key for this resource
                const cacheKey = `${prefix}-${resourceKey}`;

                // Check if we already have a promise for this resource
                if (!loadingPromiseCache.has(cacheKey)) {
                    // Create a new promise that will resolve when isLoading becomes false
                    loadingPromiseCache.set(
                        cacheKey,
                        new Promise<void>((resolve) => {
                            resolveRefsMap.current.set(cacheKey, resolve);
                        })
                    );
                }

                // Throw the promise to suspend the component
                throw loadingPromiseCache.get(cacheKey);
            }
        }, [isLoading]);
    };

    return {
        createLoadingEffect,
        createUseLoadingResource,
    };
}

/**
 * Clears all loading resources from the cache
 * Useful for testing or when you need to reset the loading state
 */
export function clearLoadingResources() {
    loadingPromiseCache.clear();
} 