'use client';

import React, { ComponentType } from 'react';
import { BookOpen, Github, Flame, CircleDollarSign, Code, ExternalLink, LucideProps, Twitter } from 'lucide-react';

// Map of icon names to components
const iconMap: Record<string, ComponentType<LucideProps>> = {
    BookOpen,
    Github,
    Flame,
    CircleDollarSign,
    Code,
    ExternalLink,
    Twitter
};

interface ClientIconProps extends LucideProps {
    name: keyof typeof iconMap;
}

export default function ClientIcon({ name, ...props }: ClientIconProps) {
    const IconComponent = iconMap[name];

    if (!IconComponent) {
        console.error(`Icon ${name} not found`);
        return null;
    }

    return <IconComponent {...props} />;
} 