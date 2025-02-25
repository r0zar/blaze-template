'use client';

import { useState, useEffect } from 'react';
import { STATUS, CallBackProps, Step, ACTIONS, EVENTS, Placement } from 'react-joyride';
import { tourSteps } from '../data/tourSteps';
import JoyrideWrapper from './JoyrideWrapper';

interface TourManagerProps {
    isNavTourButtonClicked?: boolean;
    onTourComplete?: () => void;
}

// Define properly typed tour steps with explicit type casting
const typedTourSteps: Step[] = tourSteps.map(step => {
    // Create a properly typed step object
    const typedStep: Step = {
        target: step.target,
        content: step.content,
        disableBeacon: step.disableBeacon || false,
        placement: step.placement as Placement,
        title: step.title,
        // Only include styles if they exist
        ...(step.styles ? { styles: step.styles } : {}),
        // Add scrolling properties
        disableScrolling: step.disableScrolling === false ? false : undefined,
        disableOverlay: step.disableOverlay === false ? false : undefined,
    };

    return typedStep;
});

// Helper function to safely access localStorage
const safeLocalStorage = {
    getItem: (key: string): string | null => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(key);
        }
        return null;
    },
    setItem: (key: string, value: string): void => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, value);
        }
    }
};

export default function TourManager({ isNavTourButtonClicked, onTourComplete }: TourManagerProps) {
    const [runTour, setRunTour] = useState(false);
    const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Check if this is the user's first visit
    useEffect(() => {
        const hasSeenTour = safeLocalStorage.getItem('blaze-tour-completed');
        if (!hasSeenTour && typeof window !== 'undefined') {
            setRunTour(true);
        }
    }, []);

    // Handle tour restart from nav button
    useEffect(() => {
        if (isNavTourButtonClicked) {
            setRunTour(true);
            setCurrentStep(0);
        }
    }, [isNavTourButtonClicked]);

    // Handle scrolling for specific steps
    useEffect(() => {
        if (runTour && (currentStep === 3 || currentStep === 4)) {
            const targetSelector = tourSteps[currentStep].target as string;
            const targetElement = document.querySelector(targetSelector);

            if (targetElement) {
                setTimeout(() => {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 300);
            }
        }
    }, [currentStep, runTour]);

    const handleTourCallback = (data: CallBackProps) => {
        const { status, type, action, index } = data;

        // Update current step
        if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            setCurrentStep(index + (action === ACTIONS.PREV ? -1 : 1));
        }

        // Handle skip button click to show confirmation
        if (action === ACTIONS.SKIP && runTour) {
            setSkipConfirmOpen(true);
            return;
        }

        // Handle tour completion or skipping
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRunTour(false);
            safeLocalStorage.setItem('blaze-tour-completed', 'true');
            if (onTourComplete) {
                onTourComplete();
            }
        }
    };

    const handleSkipConfirm = () => {
        setSkipConfirmOpen(false);
        setRunTour(false);
        safeLocalStorage.setItem('blaze-tour-completed', 'true');
        if (onTourComplete) {
            onTourComplete();
        }
    };

    const handleSkipCancel = () => {
        setSkipConfirmOpen(false);
    };

    return (
        <>
            <JoyrideWrapper
                callback={handleTourCallback}
                continuous
                hideCloseButton={false}
                run={runTour}
                scrollToFirstStep
                showProgress
                showSkipButton
                steps={typedTourSteps}
                styles={{
                    options: {
                        primaryColor: '#F59E0B',
                        zIndex: 10000,
                    },
                    tooltipContainer: {
                        textAlign: 'left',
                    },
                    buttonNext: {
                        backgroundColor: '#F59E0B',
                    },
                    buttonBack: {
                        marginRight: 10,
                    },
                }}
                locale={{
                    last: 'Finish Tour',
                    skip: 'Skip Tour',
                }}
            />

            {skipConfirmOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[10001] p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-sm mx-auto shadow-xl">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Skip the tour?
                        </h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            You can restart the tour anytime from the navigation menu.
                        </p>
                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                type="button"
                                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                                onClick={handleSkipCancel}
                            >
                                Continue Tour
                            </button>
                            <button
                                type="button"
                                className="inline-flex justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                                onClick={handleSkipConfirm}
                            >
                                Skip Tour
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
} 