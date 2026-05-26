export default function BalloonIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Balloon body */}
      <ellipse cx="12" cy="9" rx="7.5" ry="8" fill="#E8C4B8"/>
      {/* Highlight */}
      <ellipse cx="9.5" cy="6.5" rx="2" ry="2.5" fill="#F2DDD6" opacity="0.7"/>
      {/* Knot */}
      <path d="M11 17 C10.5 17.8 11 18.5 12 18.5 C13 18.5 13.5 17.8 13 17Z" fill="#D4A090"/>
      {/* String */}
      <path d="M12 18.5 C11 19.5 13 20.5 12 22" stroke="#4A7A50" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}
