export default function HeartRibbonIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Heart body */}
      <path d="M12 20.5C12 20.5 3 14.5 3 8.5C3 5.5 5.5 3.5 8 3.5C10 3.5 11.5 4.5 12 5.5C12.5 4.5 14 3.5 16 3.5C18.5 3.5 21 5.5 21 8.5C21 14.5 12 20.5 12 20.5Z" fill="#E8C4B8" stroke="#D4A090" strokeWidth="0.5"/>
      {/* Ribbon horizontal band */}
      <rect x="6.5" y="10.5" width="11" height="2.5" rx="1.2" fill="#4A7A50" opacity="0.85"/>
      {/* Bow left loop */}
      <path d="M11.5 11.75C11 10.5 8 9.5 8.5 11C8.8 11.8 11 11.8 11.5 11.75Z" fill="#2E5A34"/>
      {/* Bow right loop */}
      <path d="M12.5 11.75C13 10.5 16 9.5 15.5 11C15.2 11.8 13 11.8 12.5 11.75Z" fill="#2E5A34"/>
      {/* Bow knot */}
      <circle cx="12" cy="11.75" r="1" fill="#4A7A50"/>
    </svg>
  )
}
