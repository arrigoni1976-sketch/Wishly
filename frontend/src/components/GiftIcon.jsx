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
      {/* Lid */}
      <rect x="3" y="12" width="26" height="7" rx="1.5" fill="#D4A090" />
      {/* Ribbon strip on lid */}
      <rect x="14" y="12" width="4" height="7" fill="#FAF7F2" opacity="0.85" />
      {/* Box body */}
      <rect x="5" y="18" width="22" height="12" rx="1.5" fill="#E8C4B8" />
      {/* Bow left lobe */}
      <ellipse cx="12.5" cy="11.5" rx="4" ry="3.5" fill="#FAF7F2" />
      {/* Bow right lobe */}
      <ellipse cx="19.5" cy="11.5" rx="4" ry="3.5" fill="#FAF7F2" />
      {/* Bow centre knot */}
      <ellipse cx="16" cy="12.5" rx="2" ry="1.8" fill="#FAF7F2" />
      {/* Decorative dots on body */}
      <circle cx="10" cy="23" r="0.8" fill="#D4A090" opacity="0.5" />
      <circle cx="22" cy="25" r="0.8" fill="#D4A090" opacity="0.5" />
      <circle cx="24" cy="21" r="0.7" fill="#D4A090" opacity="0.4" />
    </svg>
  )
}
