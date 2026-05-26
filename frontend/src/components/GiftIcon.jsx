/**
 * Custom gift box icon in the Wishly palette (cipria + salvia).
 * Replaces the default 🎁 emoji throughout the app.
 *
 * Props:
 *  size   – pixel size (default 24)
 *  className – extra Tailwind / CSS classes
 */
export default function GiftIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Box body */}
      <rect x="2.5" y="12" width="19" height="10" rx="1.5" fill="#E8C4B8" />
      {/* Box lid */}
      <rect x="1.5" y="8.5" width="21" height="4" rx="2" fill="#D4A090" />
      {/* Vertical ribbon on body */}
      <rect x="10.5" y="12" width="3" height="10" fill="#4A7A50" opacity="0.85" />
      {/* Vertical ribbon on lid */}
      <rect x="10.5" y="8.5" width="3" height="4" fill="#2E5A34" />
      {/* Bow — left loop */}
      <path
        d="M11.8 8.5C11.2 7.2 7.5 4.5 8.8 6.8C9.4 7.8 11.2 8.4 11.8 8.5Z"
        fill="#4A7A50"
      />
      {/* Bow — right loop */}
      <path
        d="M12.2 8.5C12.8 7.2 16.5 4.5 15.2 6.8C14.6 7.8 12.8 8.4 12.2 8.5Z"
        fill="#4A7A50"
      />
      {/* Bow — centre knot */}
      <circle cx="12" cy="8.5" r="1.1" fill="#2E5A34" />
    </svg>
  )
}
