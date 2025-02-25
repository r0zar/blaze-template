import { Flame, BookOpen, Github, Twitter } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/50 py-12 relative z-10">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-[#B22222] dark:text-[#B22222] mb-1" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Powered by Blaze Subnets
                        </span>
                    </div>
                    <div className="flex gap-8 text-sm text-gray-600 dark:text-gray-400">
                        <a
                            href="https://github.com/r0zar/blaze/blob/main/README.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#B22222] dark:hover:text-[#DAA520] transition-colors flex items-center gap-2"
                        >
                            <BookOpen className="w-4 h-4" />
                            Documentation
                        </a>
                        <a
                            href="https://github.com/r0zar/blaze"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#B22222] dark:hover:text-[#DAA520] transition-colors flex items-center gap-2"
                        >
                            <Github className="w-4 h-4" />
                            GitHub
                        </a>
                        <a
                            href="https://x.com/CharismaBTC"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#B22222] dark:hover:text-[#DAA520] transition-colors flex items-center gap-2"
                        >
                            <Twitter className="w-4 h-4" />
                            Twitter
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
} 