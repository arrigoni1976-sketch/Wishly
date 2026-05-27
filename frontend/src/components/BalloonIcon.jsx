/**
 * BalloonIcon — classic round balloon in app palette
 * cipria (#E8C4B8) body · salvia (#4A7A50) string · #D4A090 knot
 */
export default function BalloonIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Balloon body */}
      <ellipse cx="16" cy="14" rx="12" ry="13" fill="#E8C4B8" />

      {/* Shine highlight */}
      <ellipse cx="11.5" cy="8.5" rx="3.5" ry="4.5" fill="#F2DDD6" opacity="0.65" />

      {/* Bottom tail of balloon body */}
      <path
        d="M12 26 Q16 31 20 26"
        fill="#E8C4B8"
        stroke="#E8C4B8"
        strokeWidth="0.5"
      />

      {/* Knot — small oval */}
      <ellipse cx="16" cy="30" rx="2.2" ry="1.6" fill="#D4A090" />

      {/* String — wavy, salvia */}
      <path
        d="M16 31.5 C13.5 33.5 18.5 35.5 16 37.5 C13.5 39.5 17 41 16 43"
        stroke="#4A7A50"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
