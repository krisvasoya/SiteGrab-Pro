// components/ScrollAnimations.jsx
// Exports reusable animated text + scroll-reveal primitives used across the app.

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// 1.  SplitText — animates each word independently on mount / when in view
// ─────────────────────────────────────────────────────────────────────────────
export function SplitText({ text, className = '', delay = 0, once = true }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: '-80px' });

  const words = text.split(' ');

  return (
    <span ref={ref} className={`split-text-wrapper ${className}`}>
      {words.map((word, i) => (
        <span key={i} className="split-word-outer" aria-hidden="true">
          <motion.span
            className="split-word-inner"
            initial={{ y: '110%', opacity: 0 }}
            animate={inView ? { y: '0%', opacity: 1 } : {}}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
              delay: delay + i * 0.06,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.  GlitchText — letter-level glitch shimmer on hover
// ─────────────────────────────────────────────────────────────────────────────
export function GlitchText({ text, className = '' }) {
  return (
    <span className={`glitch-text ${className}`} data-text={text}>
      {text}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.  RevealBlock — slides content up from a clipping mask when in view
// ─────────────────────────────────────────────────────────────────────────────
export function RevealBlock({ children, delay = 0, once = true, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: '-60px' });

  return (
    <div ref={ref} className={`reveal-block-outer ${className}`}>
      <motion.div
        className="reveal-block-inner"
        initial={{ y: 60, opacity: 0 }}
        animate={inView ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.  ParallaxSection — moves its children at a slower rate on scroll
// ─────────────────────────────────────────────────────────────────────────────
export function ParallaxSection({ children, strength = 0.18, className = '' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${strength * -80}px`, `${strength * 80}px`]);

  return (
    <div ref={ref} className={`parallax-section ${className}`}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  CountUp — animates a number from 0 to target when in view
// ─────────────────────────────────────────────────────────────────────────────
export function CountUp({ target, suffix = '', duration = 1.8, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });


  // Simple integer ticker using React state
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      setDisplay(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return (
    <span ref={ref} className={className}>
      {display}{suffix}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.  ScrollProgressBar — thin accent line at the very top tracking scroll
// ─────────────────────────────────────────────────────────────────────────────
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      className="scroll-progress-bar"
      style={{ scaleX, transformOrigin: 'left' }}
    />
  );
}
