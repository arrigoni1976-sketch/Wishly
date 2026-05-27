/**
 * BalloonIcon — classic round balloon in app palette
 * cipria (#E8C4B8) body · salvia (#4A7A50) string · #D4A090 knot
 * Square 32×32 viewBox — renders correctly at any size={n}
 */
export default function BalloonIcon({ size = 24, className = '' }) {
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
      {/* Balloon body — slightly oval */}
      <ellipse cx="16" cy="11" rx="10" ry="11" fill="#E8C4B8" />

      {/* Shine highlight */}
      <ellipse cx="12" cy="6.5" rx="2.5" ry="3.5" fill="#F2DDD6" opacity="0.65" />

      {/* Bottom tail — teardrop point */}
      <path
        d="M13.5 21.5 Q16 25.5 18.5 21.5"
        fill="#E8C4B8"
        stroke="#E8C4B8"
        strokeWidth="0.5"
      />

      {/* Knot */}
      <ellipse cx="16" cy="25.5" rx="1.8" ry="1.4" fill="#D4A090" />

      {/* String — wavy, salvia */}
      <path
        d="M16 27 C14 28.5 18 29.5 16 31"
        stroke="#4A7A50"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
