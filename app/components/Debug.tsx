'use client';

import { useState, useEffect } from 'react';
import { Zap, Trash2, ArrowRightLeft, Loader2, RefreshCw } from 'lucide-react';
import { trimQueue, trimStatus } from '../lib/utils';
import { useActionButtonState } from '../hooks/useActionButtonState';
import toast from 'react-hot-toast';

export default function Debug() {
    const { state, actions } = useActionButtonState();
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

    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <div className="mb-12 p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 backdrop-blur-sm">
            <div className="flex flex-col gap-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold mb-2">Developer Controls</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Debugging tools and real-time blockchain status
                        </p>
                    </div>
                </div>

                {/* Pusher Status Indicators */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-4 bg-white/70 dark:bg-black/30 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-blue-800 dark:text-blue-300">Pusher Status</h3>
                            <button
                                onClick={actions.refreshBlockchainData}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 rounded text-xs flex items-center gap-1 transition-colors"
                                disabled={state.isRefreshing}
                            >
                                {state.isRefreshing ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Refreshing...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Refresh Data</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center justify-between p-2 bg-blue-50/70 dark:bg-blue-900/30 rounded">
                                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Connection:</span>
                                <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-1.5 ${state.connectionState === 'connected' ? 'bg-green-500' :
                                        state.connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                            state.connectionState === 'error' ? 'bg-red-500' :
                                                'bg-gray-500'
                                        }`} />
                                    <span className="text-xs font-medium">
                                        {state.connectionState === 'connected' ? 'Connected' :
                                            state.connectionState === 'connecting' ? 'Connecting...' :
                                                state.connectionState === 'error' ? 'Connection Error' :
                                                    state.connectionState === 'disconnected' ? 'Disconnected' :
                                                        'Initializing...'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-blue-50/70 dark:bg-blue-900/30 rounded">
                                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Loading:</span>
                                <span className="text-xs font-medium">{state.isLoading ? '✓' : '✗'}</span>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-blue-50/70 dark:bg-blue-900/30 rounded">
                                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Balances:</span>
                                <span className="text-xs font-medium">{state.balances ? Object.keys(state.balances).length : 0} addresses</span>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-blue-50/70 dark:bg-blue-900/30 rounded">
                                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Queue:</span>
                                <span className="text-xs font-medium">{state.txRequests?.length || 0} transactions</span>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-blue-50/70 dark:bg-blue-900/30 rounded">
                                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Last Batch:</span>
                                <span className="text-xs font-medium">{state.lastBatch ? `${state.lastBatch.batchSize} tx` : 'N/A'}</span>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-blue-50/70 dark:bg-blue-900/30 rounded">
                                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Mining:</span>
                                <span className="text-xs font-medium">{state.isMining ? 'Active' : 'Idle'}</span>
                            </div>
                        </div>

                        {/* Display status object properties if available */}
                        {typeof state.pusherStatus === 'object' && state.pusherStatus !== null && (
                            <div className="mt-2 border-t border-blue-200 dark:border-blue-800 pt-2">
                                <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-xs mb-1">Status Details:</h4>
                                <div className="max-h-32 overflow-y-auto p-2 bg-blue-50/70 dark:bg-blue-900/30 rounded text-xs">
                                    {Object.entries(state.pusherStatus).map(([key, value]) => (
                                        <div key={key} className="grid grid-cols-3 gap-2 mb-1">
                                            <span className="text-blue-700 dark:text-blue-400 font-medium">{key}:</span>
                                            <span className="col-span-2 truncate">
                                                {typeof value === 'object'
                                                    ? `${Array.isArray(value) ? value.length + ' items' : JSON.stringify(value).substring(0, 30) + '...'}`
                                                    : String(value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Debug Action Controls */}
                    <div className="p-4 bg-white/70 dark:bg-black/30 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">Action Controls</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={handleForceBatch}
                                disabled={isLoading || isClearingQueue}
                                className={`p-3 rounded-lg border border-blue-500 dark:border-blue-500 
                                    text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 
                                    transition-colors flex items-center justify-center gap-2 font-medium text-sm
                                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        <span>Force Mine Batch</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleClearQueue}
                                disabled={isLoading || isClearingQueue}
                                className={`p-3 rounded-lg border border-red-500 dark:border-red-500 
                                    text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 
                                    transition-colors flex items-center justify-center gap-2 font-medium text-sm
                                    ${isClearingQueue ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isClearingQueue ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Clearing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        <span>Clear Queue</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Response Display */}
                        {lastResponse && (
                            <div className="mt-3">
                                <h4 className="text-xs font-semibold mb-1 text-blue-800 dark:text-blue-200">Last Response:</h4>
                                <div className="text-xs overflow-auto max-h-[180px] p-2 bg-blue-50/70 dark:bg-blue-900/30 rounded">
                                    <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(lastResponse, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 