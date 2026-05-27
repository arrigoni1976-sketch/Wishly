/**
 * GiftIcon — gift box in app palette, no background
 * Body: cipria #E8C4B8  Lid: #D4A090  Bow: avorio #FAF7F2
 */
export default function GiftIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Bow left lobe */}
      <ellipse cx="11.5" cy="11" rx="4" ry="3.8" fill="#F5EDE3" />
      {/* Bow right lobe */}
      <ellipse cx="20.5" cy="11" rx="4" ry="3.8" fill="#F5EDE3" />
      {/* Bow centre knot */}
      <ellipse cx="16" cy="11.8" rx="1.9" ry="1.7" fill="#F5EDE3" />
      {/* Lid */}
      <rect x="4" y="12" width="24" height="5" rx="1" fill="#D4A090" />
      {/* Ribbon strip on lid */}
      <rect x="14.5" y="12" width="3" height="5" fill="#F5EDE3" opacity="0.88" />
      {/* Box body */}
      <rect x="5" y="17" width="22" height="11" rx="1" fill="#ECC4B4" />
      {/* Decorative dots on body */}
      <circle cx="10" cy="22" r="0.7" fill="#D4A090" opacity="0.45" />
      <circle cx="22" cy="21" r="0.6" fill="#D4A090" opacity="0.4" />
      <circle cx="23.5" cy="25" r="0.6" fill="#D4A090" opacity="0.35" />
    </svg>
  )
}
