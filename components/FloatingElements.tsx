'use client';

import React, { useEffect, useRef, useState } from 'react';

// Define position types
type Position = {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
};

type PositionsMap = {
  [key: string]: Position;
};

// Helper function to generate random positions across the entire viewport
const generateRandomPositions = (): PositionsMap => {
  return {
    bitcoin1: {
      top: `${5 + Math.random() * 25}vh`,
      left: `${3 + Math.random() * 20}vw`,
    },
    welsh1: {
      top: `${10 + Math.random() * 30}vh`,
      right: `${5 + Math.random() * 25}vw`,
    },
    bitcoin2: {
      bottom: `${10 + Math.random() * 30}vh`,
      right: `${7 + Math.random() * 28}vw`,
    },
    flame1: {
      top: `${35 + Math.random() * 25}vh`,
      left: `${25 + Math.random() * 35}vw`,
    },
    flame2: {
      bottom: `${15 + Math.random() * 35}vh`,
      left: `${35 + Math.random() * 25}vw`,
    },
    sparkle: {
      top: `${60 + Math.random() * 25}vh`,
      left: `${60 + Math.random() * 25}vw`,
    },
    moneybag: {
      bottom: `${25 + Math.random() * 35}vh`,
      right: `${45 + Math.random() * 25}vw`,
    }
  };
};

// Initial static positions for server-side rendering (using viewport units)
const initialPositions: PositionsMap = {
  bitcoin1: { top: '10vh', left: '5vw' },
  welsh1: { top: '15vh', right: '10vw' },
  bitcoin2: { bottom: '20vh', right: '15vw' },
  flame1: { top: '40vh', left: '30vw' },
  flame2: { bottom: '30vh', left: '60vw' },
  sparkle: { top: '70vh', left: '75vw' },
  moneybag: { bottom: '50vh', right: '30vw' }
};

interface FloatingElementsProps {
  transactionSuccess?: boolean;
}

// Use React.memo to prevent re-renders when props change
const FloatingElements = React.memo(function FloatingElements({ transactionSuccess = false }: FloatingElementsProps) {
  // Use state to control visibility
  const [elementStates, setElementStates] = useState({
    bitcoin1: false,
    welsh1: false,
    bitcoin2: false,
    flame1: false,
    flame2: false,
    sparkle: false,
    moneybag: false
  });
  const [positions, setPositions] = useState(initialPositions);
  const hasMounted = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (!hasMounted.current && typeof window !== 'undefined') {
      hasMounted.current = true;

      // Set random positions
      setPositions(generateRandomPositions());

      // Stagger the appearance of each element
      const elements = ['bitcoin1', 'welsh1', 'bitcoin2', 'flame1', 'flame2', 'sparkle', 'moneybag'];

      elements.forEach((element, index) => {
        setTimeout(() => {
          setElementStates(prev => ({
            ...prev,
            [element]: true
          }));
        }, 300 + (index * 150)); // Start after 300ms, then stagger by 150ms each
      });
    }
  }, []);

  return (
    <>
      <style jsx global>{`
        @keyframes float {
          0% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-15px) translateX(10px) rotate(5deg);
          }
          50% {
            transform: translateY(0px) translateX(20px) rotate(0deg);
          }
          75% {
            transform: translateY(15px) translateX(10px) rotate(-5deg);
          }
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
        }

        @keyframes float-reverse {
          0% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateY(15px) translateX(-10px) rotate(-5deg);
          }
          50% {
            transform: translateY(0px) translateX(-20px) rotate(0deg);
          }
          75% {
            transform: translateY(-15px) translateX(-10px) rotate(5deg);
          }
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
        }

        @keyframes float-wide {
          0% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-35px) translateX(40px) rotate(8deg);
          }
          50% {
            transform: translateY(15px) translateX(80px) rotate(-5deg);
          }
          75% {
            transform: translateY(30px) translateX(25px) rotate(-10deg);
          }
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
        }

        @keyframes float-erratic {
          0% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          20% {
            transform: translateY(-60px) translateX(-30px) rotate(15deg);
          }
          40% {
            transform: translateY(45px) translateX(60px) rotate(-8deg);
          }
          60% {
            transform: translateY(-35px) translateX(50px) rotate(-15deg);
          }
          80% {
            transform: translateY(50px) translateX(-45px) rotate(10deg);
          }
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.9;
          }
          100% {
            transform: scale(1);
            opacity: 0.7;
          }
        }

        @keyframes pulse-slow {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
        }

        @keyframes pop-in {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(20px);
            filter: blur(10px);
          }
          70% {
            opacity: 0.7;
            transform: scale(1.1);
            filter: blur(0px);
          }
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
        }

        .floating-element {
          position: absolute;
          z-index: -1;
          pointer-events: none;
          filter: drop-shadow(0 5px 15px rgba(0, 0, 0, 0.3));
          will-change: transform;
          backface-visibility: hidden;
          opacity: 0;
          transform: scale(0.5) translateY(20px);
          filter: blur(10px);
        }

        .floating-element.visible {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .bitcoin-emoji {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          filter: drop-shadow(0 5px 15px rgba(247, 147, 26, 0.5)) saturate(120%);
        }

        .welsh-token {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          filter: drop-shadow(0 5px 15px rgba(139, 0, 0, 0.3)) sepia(20%);
        }

        .flame-emoji {
          font-size: 2.5rem;
          filter: drop-shadow(0 0 15px rgba(178, 34, 34, 0.6));
        }

        .flame-emoji.visible {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     pulse 3s infinite ease-in-out 0.8s;
        }

        .flame-emoji-small {
          font-size: 1.8rem;
          filter: drop-shadow(0 0 12px rgba(184, 134, 11, 0.5));
        }
        
        .celebration-emoji {
          font-size: 2.5rem;
          filter: drop-shadow(0 5px 15px rgba(0, 0, 0, 0.3));
        }
        
        .sparkle-emoji {
          filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.6));
        }
        
        .moneybag-emoji {
          filter: drop-shadow(0 0 15px rgba(0, 128, 0, 0.5));
        }
        
        /* Animation classes - only apply after element is visible */
        .floating-element.visible.float-erratic {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float-erratic 18s infinite ease-in-out 0.8s;
        }
        
        .floating-element.visible.float-erratic-slow {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float-erratic 22s infinite ease-in-out 0.8s;
        }
        
        .floating-element.visible.float-wide {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float-wide 20s infinite ease-in-out 0.8s;
        }
        
        .floating-element.visible.float-wide-fast {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float-wide 16s infinite ease-in-out 0.8s;
        }
        
        .floating-element.visible.float-wide-medium {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float-wide 17s infinite ease-in-out 0.8s;
        }
        
        .floating-element.visible.float-wide-slow {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float-wide 18s infinite ease-in-out 0.8s;
        }
        
        .floating-element.visible.float-reverse {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float-reverse 19s infinite ease-in-out 0.8s;
        }
        
        .floating-element.visible.float-reverse-fast {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float-reverse 15s infinite ease-in-out 0.8s;
        }
        
        .floating-element.visible.float-reverse-slow {
          animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float-reverse 21s infinite ease-in-out 0.8s;
        }
      `}</style>

      <div className="floating-elements-container">
        {/* Randomly positioned Bitcoin emoji */}
        <div
          className={`floating-element bitcoin-emoji float-erratic ${elementStates.bitcoin1 ? 'visible' : ''}`}
          style={{
            top: positions.bitcoin1.top,
            left: positions.bitcoin1.left
          }}
        >
          ₿
        </div>

        {/* Randomly positioned Welsh token */}
        <div
          className={`floating-element welsh-token float-wide ${elementStates.welsh1 ? 'visible' : ''}`}
          style={{
            top: positions.welsh1.top,
            right: positions.welsh1.right
          }}
        >
          <img src="https://charisma.rocks/welsh-logo.png" alt="Welsh Token" style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Randomly positioned Bitcoin emoji */}
        <div
          className={`floating-element bitcoin-emoji float-erratic-slow ${elementStates.bitcoin2 ? 'visible' : ''}`}
          style={{
            bottom: positions.bitcoin2.bottom,
            right: positions.bitcoin2.right
          }}
        >
          ₿
        </div>

        {/* Sparkle emoji */}
        <div
          className={`floating-element celebration-emoji sparkle-emoji float-wide-medium ${elementStates.sparkle ? 'visible' : ''}`}
          style={{
            top: positions.sparkle.top,
            left: positions.sparkle.left
          }}
        >
          ✨
        </div>

        {/* Money bag emoji */}
        <div
          className={`floating-element celebration-emoji moneybag-emoji float-erratic ${elementStates.moneybag ? 'visible' : ''}`}
          style={{
            bottom: positions.moneybag.bottom,
            right: positions.moneybag.right
          }}
        >
          💰
        </div>

        {/* Flame emojis */}
        <div
          className={`floating-element flame-emoji float-wide-fast ${elementStates.flame1 ? 'visible' : ''}`}
          style={{
            top: positions.flame1.top,
            left: positions.flame1.left
          }}
        >
          🔥
        </div>

        <div
          className={`floating-element flame-emoji float-wide-slow ${elementStates.flame2 ? 'visible' : ''}`}
          style={{
            bottom: positions.flame2.bottom,
            left: positions.flame2.left
          }}
        >
          🔥
        </div>
      </div>
    </>
  );
});

export default FloatingElements; 