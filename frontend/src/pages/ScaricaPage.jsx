import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { isIosBrowser, isAndroidBrowser, APP_STORE_URL, PLAY_STORE_URL } from '../lib/platform'
import GiftIcon from '../components/GiftIcon'

export default function ScaricaPage() {
  const { t } = useTranslation()

  useEffect(() => {
    if (isIosBrowser()) {
      window.location.replace(APP_STORE_URL)
    } else if (isAndroidBrowser()) {
      window.location.replace(PLAY_STORE_URL)
    }
  }, [])

  // Mobile: redirect in corso
  if (isIosBrowser() || isAndroidBrowser()) {
    return (
      <div className="min-h-screen bg-avorio flex items-center justify-center px-4">
        <div className="text-center">
          <GiftIcon size={40} />
          <p className="mt-4 text-gray-500 text-sm">{t('scarica.redirecting')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-avorio flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-10 max-w-sm w-full text-center">
        <div className="flex justify-center mb-4">
          <GiftIcon size={40} />
        </div>
        <p className="font-display text-xl font-bold text-salvia mb-2">{t('scarica.logo')}</p>
        <p className="text-gray-500 text-sm mb-6">{t('scarica.subtitle')}</p>
        <div className="flex flex-col gap-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-center py-3 text-sm font-semibold rounded-2xl"
          >
            {t('scarica.app_store_btn')}
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-center py-3 text-sm font-semibold rounded-2xl"
          >
            {t('scarica.play_store_btn')}
          </a>
        </div>
      </div>
    </div>
  )
}
