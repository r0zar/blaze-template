import ClientExplorerLink from "@/components/ClientExplorerLink";
import Link from "next/link";

export default function ExplorerCard() {
    return (
        <div className="mb-12 p-6 rounded-xl bg-white/50 dark:bg-black/50 border border-yellow-200 dark:border-yellow-800 backdrop-blur-sm relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold mb-2">Blaze Smart Contract</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                        View the Blaze subnet contract on the Stacks blockchain explorer.
                    </p>
                    <div className="hidden sm:block font-mono text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-3 py-2 rounded-lg mb-4 md:mb-0">
                        SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.blaze-welsh-v0
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <ClientExplorerLink
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
    );
} 