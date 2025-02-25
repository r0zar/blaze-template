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

    return (
        <Joyride
            callback={callback}
            continuous={continuous}
            hideCloseButton={hideCloseButton}
            run={run}
            scrollToFirstStep={scrollToFirstStep}
            showProgress={showProgress}
            showSkipButton={showSkipButton}
            steps={steps}
            styles={styles}
            locale={locale}
        />
    );
} 