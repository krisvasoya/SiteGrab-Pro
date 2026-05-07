import React from 'react';

export default function Logo({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Nano Banana - Stylized Geometric Form */}
      {/* Main curved body */}
      <path
        d="M26 10C26 10 24 6 18 6C12 6 6 11 6 18C6 25 12 28 18 28C22 28 25 26 25 26"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Inner curvature for depth */}
      <path
        d="M21 12C21 12 19 9 16 9C12 9 9 12 9 17C9 21 12 24 16 24C19 24 21 21 21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />

      {/* Stem / Nano-connector tip */}
      <rect
        x="24"
        y="8"
        width="4"
        height="4"
        rx="1"
        transform="rotate(15 24 8)"
        fill="currentColor"
      />

      {/* Nano Glow / Sparkle */}
      <circle cx="18" cy="14" r="1.5" fill="var(--accent)" />
    </svg>
  );
}
