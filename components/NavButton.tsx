'use client';
import Image from "next/image";

interface NavButtonProps {
    href: string;
    icon: string;
    text: string;
}

export function NavButton({ href, icon, text }: NavButtonProps) {
    return (
        <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
        >
            <Image
                className="dark:invert"
                src={icon}
                alt={`${text} icon`}
                width={20}
                height={20}
            />
            {text}
        </a>
    );
} 