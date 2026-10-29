const ua = navigator.userAgent

export const isNative = () => !!window.Capacitor?.isNativePlatform?.()
export const isIosBrowser = () => !isNative() && /iPhone|iPad|iPod/i.test(ua)
export const isAndroidBrowser = () => !isNative() && /Android/i.test(ua)

export const APP_STORE_URL = 'https://apps.apple.com/app/id6817407346'
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=it.pikyapp.piky'

// In Capacitor, window.location.origin è 'capacitor://localhost' (iOS) o 'https://localhost' (Android)
// — entrambi invalidi per link condivisi. Su native forziamo sempre il dominio di produzione.
export const getAppBaseUrl = () =>
  import.meta.env.VITE_PUBLIC_URL || (isNative() ? 'https://www.pikyapp.it' : window.location.origin)
