'use client';

import { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface DeveloperModeContextType {
    isDeveloperMode: boolean;
    toggleDeveloperMode: () => void;
}

const DeveloperModeContext = createContext<DeveloperModeContextType | undefined>(undefined);

export function DeveloperMode({ children }: { children: React.ReactNode }) {
    // Initialize with false, will update from localStorage after mount
    const [isDeveloperMode, setIsDeveloperMode] = useState(false);

    // Load the setting from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem('developerMode');
        if (savedMode !== null) {
            setIsDeveloperMode(savedMode === 'true');
        }
    }, []);

    // Toggle developer mode and save to localStorage
    const toggleDeveloperMode = () => {
        const newMode = !isDeveloperMode;
        setIsDeveloperMode(newMode);
        localStorage.setItem('developerMode', String(newMode));
    };

    return (
        <DeveloperModeContext.Provider value={{ isDeveloperMode, toggleDeveloperMode }}>
            {children}
        </DeveloperModeContext.Provider>
    );
}

export function useDeveloperMode() {
    const context = useContext(DeveloperModeContext);
    if (context === undefined) {
        throw new Error('useDeveloperMode must be used within a DeveloperModeProvider');
    }
    return context;
} 