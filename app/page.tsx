import ClientFooter from '@/components/ClientFooter';
import ClientDebug from '@/components/ClientDebug';
import Hero from '@/components/layout/Hero';
import ExplorerCard from '@/components/layout/ExplorerCard';
import BlockchainSection from '@/components/blockchain/BlockchainSection';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* <div className="mesh-gradient fixed inset-0 opacity-[0.02] pointer-events-none z-0" /> */}
      {/* Hero Section */}
      <Hero />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Explorer Card */}
          <ExplorerCard />

          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Try It Now</h2>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Experience the power of Blaze subnets firsthand.
            </p>
          </div>

          {/* Blockchain Components wrapped in a client component */}
          <BlockchainSection />

          <div className="mt-12" />

          {/* Debug Section */}
          <ClientDebug />
        </div>

      </main>

      {/* Footer */}
      <ClientFooter />
    </div>
  );
}

