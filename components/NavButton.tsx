'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flame, Menu, X, ExternalLink, BarChart2, Home, HelpCircle, Terminal, MessageSquare } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useDeveloperMode } from '@/contexts/DeveloperMode';

// Dynamically import TourManager with SSR disabled
const TourManager = dynamic(() => import('./TourManager'), {
    ssr: false,
    loading: () => null
});

export default function NavButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isTourButtonClicked, setIsTourButtonClicked] = useState(false);
    const { isDeveloperMode, toggleDeveloperMode } = useDeveloperMode();

    const startTour = () => {
        setIsTourButtonClicked(true);
        setIsOpen(false); // Close the menu when starting the tour
    };

    const handleTourComplete = () => {
        setIsTourButtonClicked(false);
    };

    return (
        <>
            <TourManager
                isNavTourButtonClicked={isTourButtonClicked}
                onTourComplete={handleTourComplete}
            />

            <div className="fixed top-4 right-4 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-12 h-12 rounded-full bg-white dark:bg-black/80 shadow-lg flex items-center justify-center"
                >
                    {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {isOpen && (
                    <div className="absolute top-16 right-0 w-72 bg-white dark:bg-black/80 rounded-xl shadow-xl p-4 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-4">
                            <Flame className="w-5 h-5 text-[#B22222] dark:text-[#B22222]" />
                            <span className="font-semibold">Blaze Subnet</span>
                        </div>
                        <div className="space-y-2">
                            <Link
                                href="/"
                                className="block px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                onClick={() => setIsOpen(false)}
                            >
                                <Home className="w-4 h-4" />
                                Homepage Demo
                            </Link>
                            <Link
                                href="/explorer"
                                className="block px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                onClick={() => setIsOpen(false)}
                            >
                                <BarChart2 className="w-4 h-4" />
                                Transaction Explorer
                            </Link>
                            <Link
                                href="/chatroom"
                                className="block px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                onClick={() => setIsOpen(false)}
                            >
                                <MessageSquare className="w-4 h-4" />
                                Chatroom: Tip & Win
                            </Link>
                            <a
                                href="https://explorer.hiro.so/txid/SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.blaze-welsh-v0?chain=mainnet"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                onClick={() => setIsOpen(false)}
                            >
                                <ExternalLink className="w-4 h-4" />
                                View Contract on Explorer
                            </a>

                            {/* Tour Guide Button */}
                            <button
                                onClick={startTour}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                            >
                                <HelpCircle className="w-4 h-4" />
                                Start Tour Guide
                            </button>

                            {/* Developer Mode Toggle */}
                            <button
                                onClick={() => {
                                    toggleDeveloperMode();
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 flex items-center gap-2"
                            >
                                <Terminal className="w-4 h-4" />
                                <span className={isDeveloperMode ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300"}>
                                    Developer Mode: {isDeveloperMode ? "On" : "Off"}
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
} 