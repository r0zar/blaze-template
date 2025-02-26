'use client';

import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
    // Track dark mode
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // Check for dark mode preference initially
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches || document.documentElement.classList.contains('dark'));

        // Listen for changes in the color scheme preference or class changes
        const handleChange = () => {
            setIsDarkMode(mediaQuery.matches || document.documentElement.classList.contains('dark'));
        };

        mediaQuery.addEventListener('change', handleChange);

        // Create a mutation observer to watch for dark class changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    handleChange();
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
            observer.disconnect();
        };
    }, []);

    return (
        <>
            {children}
            <Toaster
                position="top-right"
                reverseOrder={false}
                gutter={8}
                containerStyle={{
                    top: 10,
                    right: 80,
                    zIndex: 40,
                }}
                toastOptions={{
                    // Default options for all toasts
                    className: '',
                    duration: 3000,
                    style: {
                        background: isDarkMode
                            ? 'linear-gradient(to right, rgba(113, 63, 18, 0.3), rgba(133, 77, 14, 0.2), rgba(146, 64, 14, 0.1))'
                            : 'linear-gradient(to right, rgba(254, 249, 195, 0.8), rgba(254, 240, 138, 0.8), rgba(253, 224, 71, 0.8))',
                        backdropFilter: 'blur(8px)',
                        minWidth: '300px',
                        maxWidth: '90vw',
                        padding: '16px',
                        borderRadius: '12px',
                        border: isDarkMode
                            ? '1px solid rgba(161, 98, 7, 0.8)'
                            : '1px solid rgba(253, 224, 71, 0.8)',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        color: isDarkMode ? '#fef9c3' : '#854d0e',
                        fontWeight: 500,
                    },
                    // Customize each toast type
                    success: {
                        style: {
                            background: isDarkMode
                                ? 'linear-gradient(to right, rgba(6, 78, 59, 0.3), rgba(6, 95, 70, 0.2))'
                                : 'linear-gradient(to right, rgba(236, 253, 245, 0.8), rgba(209, 250, 229, 0.8))',
                            border: isDarkMode
                                ? '1px solid rgba(5, 150, 105, 0.8)'
                                : '1px solid rgba(167, 243, 208, 0.8)',
                            color: isDarkMode ? '#d1fae5' : '#065f46',
                        },
                        iconTheme: {
                            primary: isDarkMode ? '#10b981' : '#10b981',
                            secondary: isDarkMode ? '#064e3b' : '#ecfdf5',
                        },
                    },
                    error: {
                        style: {
                            background: isDarkMode
                                ? 'linear-gradient(to right, rgba(153, 27, 27, 0.3), rgba(127, 29, 29, 0.2))'
                                : 'linear-gradient(to right, rgba(254, 242, 242, 0.8), rgba(254, 226, 226, 0.8))',
                            border: isDarkMode
                                ? '1px solid rgba(220, 38, 38, 0.8)'
                                : '1px solid rgba(252, 165, 165, 0.8)',
                            color: isDarkMode ? '#fee2e2' : '#b91c1c',
                        },
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: isDarkMode ? '#7f1d1d' : '#fef2f2',
                        }
                    },
                    loading: {
                        style: {
                            background: isDarkMode
                                ? 'linear-gradient(to right, rgba(113, 63, 18, 0.3), rgba(133, 77, 14, 0.2))'
                                : 'linear-gradient(to right, rgba(254, 249, 195, 0.8), rgba(254, 240, 138, 0.8))',
                            border: isDarkMode
                                ? '1px solid rgba(161, 98, 7, 0.8)'
                                : '1px solid rgba(253, 224, 71, 0.8)',
                            color: isDarkMode ? '#fef9c3' : '#854d0e',
                        },
                        iconTheme: {
                            primary: '#eab308',
                            secondary: isDarkMode ? '#713f12' : '#fef9c3',
                        }
                    },
                }}
            />
        </>
    );
} 