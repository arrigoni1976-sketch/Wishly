/**
 * WaveIcon — stylised waving hand in app palette
 * cipria (#E8C4B8) hand · salvia (#4A7A50) motion lines
 */
export default function WaveIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Palm / hand body */}
      <rect x="11" y="14" width="5.5" height="13" rx="2.75" fill="#E8C4B8" />
      <rect x="17.5" y="11" width="5" height="15" rx="2.5" fill="#E8C4B8" />
      <rect x="23.5" y="13" width="4.5" height="12" rx="2.25" fill="#E8C4B8" />
      {/* Thumb */}
      <rect x="7" y="18" width="4.5" height="8" rx="2.25" fill="#E8C4B8" />
      {/* Palm base connector */}
      <rect x="9" y="22" width="19" height="7" rx="3.5" fill="#E8C4B8" />
      {/* Wave motion lines — salvia */}
      <path
        d="M4 10 Q5.5 8 7 10"
        stroke="#4A7A50"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M2 14 Q4 11.5 6 14"
        stroke="#4A7A50"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M3 18 Q5 16 7 18"
        stroke="#4A7A50"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
