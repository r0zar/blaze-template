import Link from 'next/link';
import ClientIcon from '@/components/ui/ClientIcon';

export default function Hero() {
    return (
        <header className="relative py-24 sm:py-32 overflow-hidden z-10">
            {/* Background Elements */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-[#8B0000]/5 to-transparent" />
                <div className="absolute right-1/2 -top-32 transform translate-x-1/2">
                    <div className="w-[800px] h-[800px] rounded-full bg-[#B22222]/10 blur-3xl" />
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 relative z-10">
                {/* Main Content */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-sm font-medium mb-8">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Currently in Closed Alpha
                    </div>

                    <div className="flex items-center justify-center gap-3 mb-6">
                        <h1 className="text-4xl sm:text-5xl font-bold text-[#8B0000] dark:text-[#F7DC6F]">
                            Bitcoin is Fast Now
                        </h1>
                    </div>

                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-12">
                        Experience instant transactions and minimal fees while maintaining the security of Bitcoin.
                        Built for developers who need degen-grade speed.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            href="https://github.com/r0zar/blaze/blob/main/README.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-yellow-600 via-yellow-700 to-yellow-800 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
                        >
                            <ClientIcon name="BookOpen" className="w-5 h-5" />
                            Read the Documentation
                        </Link>
                        <Link
                            href="https://github.com/r0zar/blaze"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-red-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400 hover:bg-red-50 dark:hover:bg-yellow-900/20 transition-colors flex items-center justify-center gap-2 font-medium group"
                        >
                            <ClientIcon name="Github" className="w-5 h-5 transition-transform group-hover:scale-110" />
                            View on GitHub
                        </Link>
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                        {
                            title: 'Blazing Fast',
                            description: 'Process thousands of transactions per second with bitcoin finality',
                            iconName: 'Flame' as const
                        },
                        {
                            title: 'Cost Effective',
                            description: 'Minimize transaction fees while maintaining Bitcoin-level security',
                            iconName: 'CircleDollarSign' as const
                        },
                        {
                            title: 'Developer Ready',
                            description: 'Built with developers in mind, easy to integrate and scale',
                            iconName: 'Code' as const
                        }
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="z-10 backdrop-blur-lg p-6 rounded-2xl bg-white/50 dark:bg-black/20 border border-[#CD5C5C] dark:border-[#8D6E63]"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-[#F7DC6F]/50 dark:from-red-900/50 dark:to-[#B8860B]/50 flex items-center justify-center mb-4">
                                <ClientIcon name={feature.iconName} className="w-6 h-6 text-[#8B0000] dark:text-[#DAA520]" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </header>
    );
} 