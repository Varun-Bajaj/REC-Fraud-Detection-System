import React from "react";

export function StitchShieldLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <rect width="100" height="100" rx="22" fill="#0b1326" />
      <path
        d="M50 16L78 28V52C78 68.5 66 83.5 50 88C34 83.5 22 68.5 22 52V28L50 16Z"
        stroke="#00d4a4"
        strokeWidth="5"
        strokeLinejoin="round"
        fill="#131b2e"
      />
      <path
        d="M38 52L46 60L64 42"
        stroke="#45f1bf"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="30" r="4" fill="#3772cf" />
      <path d="M42 36L58 36" stroke="#7cebcb" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
