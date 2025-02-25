'use client';

import React, { useEffect, useState } from 'react';

interface PendingBalanceAnimationProps {
    isActive: boolean;
    onComplete?: () => void;
}

const PendingBalanceAnimation: React.FC<PendingBalanceAnimationProps> = ({
    isActive,
    onComplete
}) => {
    const [timeRemaining, setTimeRemaining] = useState(60);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isActive) {
            setIsVisible(true);
            setTimeRemaining(60);

            // Set up countdown timer
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setTimeout(() => {
                            setIsVisible(false);
                            if (onComplete) onComplete();
                        }, 1000); // Give time for the animation to complete
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                clearInterval(timer);
            };
        }
    }, [isActive, onComplete]);

    if (!isVisible) return null;

    const progressPercentage = ((60 - timeRemaining) / 60) * 100;

    return (
        <>
            <style jsx>{`
        .pending-container {
          display: inline-flex;
          align-items: center;
          margin-left: 8px;
          opacity: ${timeRemaining > 0 ? 1 : 0};
          transition: opacity 0.5s ease-out;
        }
        
        .pending-indicator {
          position: relative;
          width: 16px;
          height: 16px;
          margin-right: 6px;
        }
        
        .pending-spinner {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 2px solid rgba(255, 165, 0, 0.2);
          border-top-color: orange;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .pending-progress {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: conic-gradient(
            transparent ${progressPercentage}%, 
            rgba(255, 165, 0, 0.2) ${progressPercentage}%
          );
          transform: rotate(-90deg);
        }
        
        .pending-text {
          font-size: 0.75rem;
          color: orange;
          font-weight: 500;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>

            <div className="pending-container">
                <div className="pending-indicator">
                    <div className="pending-spinner"></div>
                    <div className="pending-progress"></div>
                </div>
                <span className="pending-text">Pending</span>
            </div>
        </>
    );
};

export default PendingBalanceAnimation; 