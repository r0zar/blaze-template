'use client';

import React, { useEffect } from 'react';
import Joyride, { CallBackProps, Step, STATUS, ACTIONS } from 'react-joyride';

interface JoyrideWrapperProps {
    steps: Step[];
    run: boolean;
    continuous?: boolean;
    showProgress?: boolean;
    showSkipButton?: boolean;
    callback?: (data: CallBackProps) => void;
    styles?: any;
    locale?: any;
    hideCloseButton?: boolean;
    scrollToFirstStep?: boolean;
}

export default function JoyrideWrapper({
    steps,
    run,
    continuous = true,
    showProgress = true,
    showSkipButton = true,
    callback,
    styles,
    locale,
    hideCloseButton = false,
    scrollToFirstStep = true,
}: JoyrideWrapperProps) {
    // Handle React 19 compatibility
    useEffect(() => {
        // This is a workaround for React 19 compatibility
        // The actual fix happens by using the latest beta version of react-joyride
        return () => {
            // Cleanup if needed
        };
    }, []);

    // Custom callback wrapper to handle scrolling issues
    const handleCallback = (data: CallBackProps) => {
        const { index, type, action } = data;

        // Fix scrolling for steps 4 and 5 (index 3 and 4)
        if (type === 'step:after' && (index === 3 || index === 4)) {
            // Give the browser a moment to process before scrolling
            setTimeout(() => {
                const targetElement = document.querySelector(steps[index].target as string);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }, 100);
        }

        // Pass the data to the original callback
        if (callback) {
            callback(data);
        }
    };

    return (
        <Joyride
            callback={handleCallback}
            continuous={continuous}
            hideCloseButton={hideCloseButton}
            run={run}
            scrollToFirstStep={scrollToFirstStep}
            showProgress={showProgress}
            showSkipButton={showSkipButton}
            steps={steps}
            styles={styles}
            locale={locale}
            scrollOffset={100}
            disableScrolling={false}
            scrollDuration={300}
        />
    );
} 