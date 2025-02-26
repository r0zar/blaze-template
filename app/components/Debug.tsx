'use client';

import { useState } from 'react';
import { Zap, Trash2 } from 'lucide-react';
import { trimQueue, trimStatus } from '../lib/utils';

export default function Debug() {
    const [isLoading, setIsLoading] = useState(false);
    const [isClearingQueue, setIsClearingQueue] = useState(false);
    const [lastResponse, setLastResponse] = useState<any>(null);

    const handleForceBatch = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/debug/force-batch', {
                method: 'POST',
            });
            const data = await response.json();

            // Format the response data for display
            const formattedData = {
                success: data.success,
                message: data.message,
                queue: data.queue ? trimQueue(data.queue) : [],
                status: data.status ? trimStatus(data.status) : null
            };

            setLastResponse(formattedData);
            console.log('Force batch response:', formattedData);
        } catch (error) {
            console.error('Error forcing batch:', error);
            setLastResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearQueue = async () => {
        try {
            setIsClearingQueue(true);
            const response = await fetch('/api/debug/clear-queue', {
                method: 'POST',
            });
            const data = await response.json();

            // Format the response data for display
            const formattedData = {
                success: data.success,
                message: data.message,
                queue: data.queue ? trimQueue(data.queue) : []
            };

            setLastResponse(formattedData);
            console.log('Clear queue response:', formattedData);
        } catch (error) {
            console.error('Error clearing queue:', error);
            setLastResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsClearingQueue(false);
        }
    };

    return (
        <div className="mb-12 p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 backdrop-blur-sm">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold mb-2">Debug Controls</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Advanced controls for debugging and testing.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleForceBatch}
                            disabled={isLoading || isClearingQueue}
                            className={`px-4 py-2 rounded-lg border border-blue-500 dark:border-blue-500 
                                text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 
                                transition-colors flex items-center justify-center gap-2 font-medium text-base
                                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Zap className="w-5 h-5" />
                            {isLoading ? 'Processing...' : 'Force Mine Batch'}
                        </button>
                        <button
                            onClick={handleClearQueue}
                            disabled={isLoading || isClearingQueue}
                            className={`px-4 py-2 rounded-lg border border-red-500 dark:border-red-500 
                                text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 
                                transition-colors flex items-center justify-center gap-2 font-medium text-base
                                ${isClearingQueue ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Trash2 className="w-5 h-5" />
                            {isClearingQueue ? 'Clearing...' : 'Clear Queue'}
                        </button>
                    </div>
                </div>

                {/* Response Display */}
                {lastResponse && (
                    <div className="mt-4 p-4 rounded-lg bg-white/50 dark:bg-black/20 border border-blue-100 dark:border-blue-800">
                        <h3 className="text-sm font-semibold mb-2 text-blue-800 dark:text-blue-200">Last Response:</h3>
                        <pre className="text-xs overflow-auto p-2 bg-blue-50 dark:bg-blue-900/40 rounded">
                            {JSON.stringify(lastResponse, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
} 