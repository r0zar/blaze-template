'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Something went wrong
                    </h1>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {error.message || "We're having trouble connecting to the blockchain. This could be due to network issues or server maintenance."}
                    </p>

                    <div className="space-y-3 w-full">
                        <button
                            onClick={() => reset()}
                            className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Try again
                        </button>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Refresh page
                        </button>
                    </div>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs overflow-auto max-h-48">
                        <p className="font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {error.stack}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
} 