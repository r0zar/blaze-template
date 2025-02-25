'use client';

import React, { useEffect, useState } from 'react';
import { motion, useAnimation, AnimatePresence, Variants } from 'framer-motion';

interface FloatingElementsProps {
  transactionSuccess?: boolean;
}

export function FloatingElements({ transactionSuccess = false }: FloatingElementsProps) {
  const controls = useAnimation();
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Start animations when component mounts
    controls.start('visible');
  }, [controls]);

  // Trigger celebration animation when transactionSuccess changes to true
  useEffect(() => {
    if (transactionSuccess) {
      setShowCelebration(true);
      // Reset after animation completes
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [transactionSuccess]);

  // Define animation variants for entry and exit
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const elementVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0.6,
      filter: 'blur(20px)'
    },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100
      }
    }
  };

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

        .floating-element {
          position: absolute;
          z-index: -1;
          pointer-events: none;
          filter: drop-shadow(0 5px 15px rgba(0, 0, 0, 0.3));
        }

        .welsh-token {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          opacity: 0.6;
          filter: drop-shadow(0 5px 15px rgba(139, 0, 0, 0.3)) sepia(20%);
        }

        .flame-emoji {
          font-size: 2.5rem;
          animation: pulse 3s infinite ease-in-out;
          filter: drop-shadow(0 0 15px rgba(178, 34, 34, 0.6));
          opacity: 0.6;
        }

        .flame-emoji-small {
          font-size: 1.8rem;
          animation: pulse-slow 4s infinite ease-in-out;
          filter: drop-shadow(0 0 12px rgba(184, 134, 11, 0.5));
          opacity: 0.35;
        }
      `}</style>

      <motion.div
        initial="hidden"
        animate={controls}
        variants={containerVariants}
      >
        {/* Top left Welsh token */}
        <motion.div
          className="floating-element welsh-token"
          style={{
            top: '10%',
            left: '5%',
            animation: 'float 20s infinite ease-in-out'
          }}
          variants={elementVariants}
        >
          <img src="https://charisma.rocks/welsh-logo.png" alt="Welsh Token" style={{ width: '100%', height: '100%' }} />
        </motion.div>

        {/* Top right Welsh token */}
        <motion.div
          className="floating-element welsh-token"
          style={{
            top: '15%',
            right: '8%',
            animation: 'float-reverse 25s infinite ease-in-out'
          }}
          variants={elementVariants}
        >
          <img src="https://charisma.rocks/welsh-logo.png" alt="Welsh Token" style={{ width: '100%', height: '100%' }} />
        </motion.div>

        {/* Bottom left Welsh token */}
        <motion.div
          className="floating-element welsh-token"
          style={{
            bottom: '15%',
            left: '10%',
            animation: 'float-reverse 22s infinite ease-in-out'
          }}
          variants={elementVariants}
        >
          <img src="https://charisma.rocks/welsh-logo.png" alt="Welsh Token" style={{ width: '100%', height: '100%' }} />
        </motion.div>

        {/* Bottom right Welsh token */}
        <motion.div
          className="floating-element welsh-token"
          style={{
            bottom: '20%',
            right: '15%',
            animation: 'float 24s infinite ease-in-out'
          }}
          variants={elementVariants}
        >
          <img src="https://charisma.rocks/welsh-logo.png" alt="Welsh Token" style={{ width: '100%', height: '100%' }} />
        </motion.div>

        {/* Flame emojis */}
        <motion.div
          className="floating-element flame-emoji"
          style={{ top: '30%', left: '20%', animation: 'float 18s infinite ease-in-out' }}
          variants={elementVariants}
        >
          🔥
        </motion.div>

        <motion.div
          className="floating-element flame-emoji"
          style={{ top: '60%', right: '25%', animation: 'float-reverse 22s infinite ease-in-out' }}
          variants={elementVariants}
        >
          🔥
        </motion.div>

        <motion.div
          className="floating-element flame-emoji"
          style={{ bottom: '40%', left: '30%', animation: 'float 26s infinite ease-in-out' }}
          variants={elementVariants}
        >
          🔥
        </motion.div>

        {/* Additional flame emojis */}
        <motion.div
          className="floating-element flame-emoji"
          style={{ top: '70%', right: '12%', animation: 'float 21s infinite ease-in-out' }}
          variants={elementVariants}
        >
          🔥
        </motion.div>

        <motion.div
          className="floating-element flame-emoji"
          style={{ top: '25%', right: '35%', animation: 'float-reverse 19s infinite ease-in-out' }}
          variants={elementVariants}
        >
          🔥
        </motion.div>

        {/* Smaller flame emojis for depth */}
        <motion.div
          className="floating-element flame-emoji-small"
          style={{ top: '45%', left: '15%', animation: 'float-reverse 28s infinite ease-in-out' }}
          variants={elementVariants}
        >
          🔥
        </motion.div>

        <motion.div
          className="floating-element flame-emoji-small"
          style={{ top: '20%', left: '40%', animation: 'float 27s infinite ease-in-out' }}
          variants={elementVariants}
        >
          🔥
        </motion.div>

        <motion.div
          className="floating-element flame-emoji-small"
          style={{ bottom: '30%', right: '40%', animation: 'float-reverse 30s infinite ease-in-out' }}
          variants={elementVariants}
        >
          🔥
        </motion.div>

        <motion.div
          className="floating-element flame-emoji-small"
          style={{ bottom: '65%', right: '20%', animation: 'float 24s infinite ease-in-out' }}
          variants={elementVariants}
        >
          🔥
        </motion.div>
      </motion.div>

      {/* Transaction Success Celebration Animation - Using a key to force re-render */}
      <AnimatePresence mode="wait">
        {showCelebration && (
          <motion.div
            key="celebration-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Burst of particles from center */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,140,0,0.4) 100%)`,
                  zIndex: 10,
                  pointerEvents: 'none'
                }}
                initial={{
                  x: 0,
                  y: 0,
                  scale: 0.2,
                  opacity: 1
                }}
                animate={{
                  x: Math.cos(i * (Math.PI * 2 / 12)) * (Math.random() * 200 + 100),
                  y: Math.sin(i * (Math.PI * 2 / 12)) * (Math.random() * 200 + 100),
                  scale: Math.random() * 0.5 + 0.5,
                  opacity: 0
                }}
                transition={{
                  duration: 1.5,
                  ease: "easeOut"
                }}
              />
            ))}

            {/* Central flash */}
            <motion.div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,140,0,0) 70%)',
                zIndex: 10,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 3, 0.5],
                opacity: [0, 0.8, 0]
              }}
              transition={{
                duration: 1,
                times: [0, 0.3, 1],
                ease: "easeOut"
              }}
            />

            {/* Floating celebratory emojis */}
            {['🔥', '✨', '💰', '😗'].map((emoji, i) => (
              <motion.div
                key={`emoji-${i}`}
                style={{
                  position: 'fixed',
                  fontSize: '2rem',
                  zIndex: 10,
                  top: `${30 + Math.random() * 40}%`,
                  left: `${20 + Math.random() * 60}%`,
                  pointerEvents: 'none'
                }}
                initial={{
                  y: 100,
                  opacity: 0,
                  scale: 0.5,
                  rotate: -30 + Math.random() * 60
                }}
                animate={{
                  y: -100,
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.5, 1],
                  rotate: 30 + Math.random() * 60
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  ease: "easeOut"
                }}
              >
                {emoji}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default FloatingElements; 