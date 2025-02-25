import { Footer } from '@/components/Footer';
import ActionButtons from "@/components/ActionButton";
import { BookOpen, Github, CircleDollarSign, Code, Flame, ExternalLink } from "lucide-react";
import ExplorerLink from '@/components/ExplorerLink';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* <div className="mesh-gradient fixed inset-0 opacity-[0.02] pointer-events-none z-0" /> */}
      {/* Hero Section */}
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
              <a
                href="https://github.com/r0zar/blaze/blob/main/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-yellow-600 via-yellow-700 to-yellow-800 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
              >
                <BookOpen className="w-5 h-5" />
                Read the Documentation
              </a>
              <a
                href="https://github.com/r0zar/blaze"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-red-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400 hover:bg-red-50 dark:hover:bg-yellow-900/20 transition-colors flex items-center justify-center gap-2 font-medium group"
              >
                <Github className="w-5 h-5 transition-transform group-hover:scale-110" />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: 'Blazing Fast',
                description: 'Process thousands of transactions per second with bitcoin finality',
                icon: Flame
              },
              {
                title: 'Cost Effective',
                description: 'Minimize transaction fees while maintaining Bitcoin-level security',
                icon: CircleDollarSign
              },
              {
                title: 'Developer Ready',
                description: 'Built with developers in mind, easy to integrate and scale',
                icon: Code
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="z-10 backdrop-blur-lg p-6 rounded-2xl bg-white/50 dark:bg-black/20 border border-[#CD5C5C] dark:border-[#8D6E63]"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-[#F7DC6F]/50 dark:from-red-900/50 dark:to-[#B8860B]/50 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#8B0000] dark:text-[#DAA520]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Explorer Card */}
          <div className="mb-12 p-6 rounded-xl bg-white/50 dark:bg-black/50 border border-yellow-200 dark:border-yellow-800 backdrop-blur-sm relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Blaze Smart Contract</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  View the Blaze subnet contract on the Stacks blockchain explorer.
                </p>
                <div className="font-mono text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-3 py-2 rounded-lg mb-4 md:mb-0">
                  SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.blaze-welsh-v0
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <ExplorerLink
                  variant="button"
                  size="lg"
                  label="View on Stacks Explorer"
                />
                <Link
                  href="/explorer"
                  className="px-4 py-2 rounded-lg border border-yellow-500 dark:border-yellow-500 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors flex items-center justify-center gap-2 font-medium text-base"
                >
                  View Transaction History
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Try It Now</h2>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Experience the power of Blaze subnets firsthand.
            </p>
          </div>
          <ActionButtons />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

