export default function CakeIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Bottom tier */}
      <rect x="2" y="16" width="20" height="6" rx="1.5" fill="#E8C4B8" stroke="#D4A090" strokeWidth="0.5"/>
      {/* Middle tier */}
      <rect x="4" y="12" width="16" height="5" rx="1.5" fill="#D4A090"/>
      {/* Top tier */}
      <rect x="7" y="9" width="10" height="4" rx="1.5" fill="#E8C4B8" stroke="#D4A090" strokeWidth="0.5"/>
      {/* Candles */}
      <rect x="9" y="6" width="2" height="4" rx="0.5" fill="#4A7A50"/>
      <rect x="11.5" y="5" width="1.5" height="4" rx="0.5" fill="#2E5A34"/>
      <rect x="13.5" y="6" width="2" height="4" rx="0.5" fill="#4A7A50"/>
      {/* Flames */}
      <ellipse cx="10" cy="5.5" rx="1" ry="1.3" fill="#6A9A70"/>
      <ellipse cx="12.25" cy="4.5" rx="0.8" ry="1.1" fill="#4A7A50"/>
      <ellipse cx="14.5" cy="5.5" rx="1" ry="1.3" fill="#6A9A70"/>
    </svg>
  )
}
