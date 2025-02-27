'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useBlaze } from '@/contexts/blaze/BlazeContext';
import styles from './FloatingElements.module.css';

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

type ElementState = {
  [key: string]: boolean;
};

// Helper function to generate random positions across the entire viewport
const generateRandomPositions = (): PositionsMap => ({
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
});

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

// Define element names for consistency
const ELEMENT_NAMES = [
  'bitcoin1',
  'welsh1',
  'bitcoin2',
  'flame1',
  'flame2',
  'sparkle',
  'moneybag'
];

// Create initial element states
const createInitialElementStates = (): ElementState => {
  return ELEMENT_NAMES.reduce((acc, name) => {
    acc[name] = false;
    return acc;
  }, {} as ElementState);
};

/**
 * FloatingElements Component
 * 
 * Displays decorative floating elements in the background of the application.
 * Uses CSS animations for smooth movement and staggered appearance.
 */
const FloatingElements = React.memo(function FloatingElements() {
  const { transactionCounter } = useBlaze();
  const prevTransactionCounter = useRef(0);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [elementStates, setElementStates] = useState(createInitialElementStates());
  const [positions, setPositions] = useState(initialPositions);
  const [mounted, setMounted] = useState(false);
  const initializationRef = useRef(false);

  // Handle transaction success animation
  useEffect(() => {
    if (transactionCounter > prevTransactionCounter.current) {
      setTransactionSuccess(true);
      const timer = setTimeout(() => setTransactionSuccess(false), 2000);
      prevTransactionCounter.current = transactionCounter;
      return () => clearTimeout(timer);
    }
  }, [transactionCounter]);

  // Handle component initialization
  useEffect(() => {
    // Skip server-side rendering
    if (typeof window === 'undefined') return;

    // Prevent double initialization
    if (initializationRef.current) return;
    initializationRef.current = true;

    // Set random positions
    setPositions(generateRandomPositions());

    // Mark as mounted to enable visibility
    const mountTimer = setTimeout(() => {
      setMounted(true);

      // Stagger the appearance of each element
      ELEMENT_NAMES.forEach((element, index) => {
        const elementTimer = setTimeout(() => {
          setElementStates(prev => ({
            ...prev,
            [element]: true
          }));
        }, 300 + (index * 150)); // Stagger with initial delay
      });
    }, 500); // Delay to ensure hydration is complete

    return () => clearTimeout(mountTimer);
  }, []);

  // If not mounted yet, render nothing to prevent FOUC
  if (typeof window !== 'undefined' && !mounted) {
    return null;
  }

  return (
    <div className={`${styles.container} ${mounted ? styles.mounted : ''}`}>
      {/* Bitcoin emoji 1 */}
      <div
        className={`${styles.element} ${styles.bitcoinEmoji} ${styles.floatErratic} ${elementStates.bitcoin1 ? styles.visible : ''}`}
        style={{
          top: positions.bitcoin1.top,
          left: positions.bitcoin1.left
        }}
      >
        ₿
      </div>

      {/* Welsh token */}
      <div
        className={`${styles.element} ${styles.welshToken} ${styles.floatWide} ${elementStates.welsh1 ? styles.visible : ''}`}
        style={{
          top: positions.welsh1.top,
          right: positions.welsh1.right
        }}
      >
        <Image
          src="https://charisma.rocks/welsh-logo.png"
          alt="Welsh Token"
          width={50}
          height={50}
          loading="lazy"
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Bitcoin emoji 2 */}
      <div
        className={`${styles.element} ${styles.bitcoinEmoji} ${styles.floatErraticSlow} ${elementStates.bitcoin2 ? styles.visible : ''}`}
        style={{
          bottom: positions.bitcoin2.bottom,
          right: positions.bitcoin2.right
        }}
      >
        ₿
      </div>

      {/* Sparkle emoji */}
      <div
        className={`${styles.element} ${styles.celebrationEmoji} ${styles.sparkleEmoji} ${styles.floatWideMedium} ${elementStates.sparkle ? styles.visible : ''}`}
        style={{
          top: positions.sparkle.top,
          left: positions.sparkle.left
        }}
      >
        ✨
      </div>

      {/* Money bag emoji */}
      <div
        className={`${styles.element} ${styles.celebrationEmoji} ${styles.moneybagEmoji} ${styles.floatErratic} ${elementStates.moneybag ? styles.visible : ''}`}
        style={{
          bottom: positions.moneybag.bottom,
          right: positions.moneybag.right
        }}
      >
        💰
      </div>

      {/* Flame emoji 1 */}
      <div
        className={`${styles.element} ${styles.flameEmoji} ${styles.floatWideFast} ${elementStates.flame1 ? styles.visible : ''}`}
        style={{
          top: positions.flame1.top,
          left: positions.flame1.left
        }}
      >
        🔥
      </div>

      {/* Flame emoji 2 */}
      <div
        className={`${styles.element} ${styles.flameEmoji} ${styles.floatWideSlow} ${elementStates.flame2 ? styles.visible : ''}`}
        style={{
          bottom: positions.flame2.bottom,
          left: positions.flame2.left
        }}
      >
        🔥
      </div>
    </div>
  );
});

export default FloatingElements; 