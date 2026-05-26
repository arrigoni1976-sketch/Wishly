export default function CelebrationIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Cone body */}
      <path d="M3 21 L10 10 L14 14 Z" fill="#4A7A50"/>
      {/* Cone opening (lighter) */}
      <path d="M10 10 L14 14 L12.5 15.5 L8.5 11.5 Z" fill="#6A9A70"/>
      {/* Confetti pieces */}
      <rect x="14" y="5" width="2.5" height="2.5" rx="0.5" fill="#E8C4B8" transform="rotate(20 14 5)"/>
      <rect x="18" y="8" width="2" height="2" rx="0.5" fill="#D4A090" transform="rotate(-15 18 8)"/>
      <rect x="16" y="2" width="2" height="2" rx="0.5" fill="#4A7A50" transform="rotate(40 16 2)"/>
      <circle cx="20" cy="5" r="1.2" fill="#E8C4B8"/>
      <circle cx="17" cy="11" r="1" fill="#6A9A70"/>
      <circle cx="21" cy="10" r="0.9" fill="#D4A090"/>
      {/* Star/sparkle */}
      <path d="M19 3 L19.5 4.5 L21 5 L19.5 5.5 L19 7 L18.5 5.5 L17 5 L18.5 4.5 Z" fill="#4A7A50"/>
    </svg>
  )
}
