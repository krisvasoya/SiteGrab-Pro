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
      {/* Outer Hexagon Shell */}
      <path
        d="M16 2L29.8564 10V22L16 30L2.14359 22V10L16 2Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      
      {/* Inner "Grab" Hook / Magnet Shape */}
      <path
        d="M11 14V11C11 8.23858 13.2386 6 16 6C18.7614 6 21 8.23858 21 11V14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M11 14H13V18H11V14Z"
        fill="currentColor"
      />
      <path
        d="M19 14H21V18H19V14Z"
        fill="currentColor"
      />
      
      {/* Bottom Accent Line */}
      <path
        d="M12 24H20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
