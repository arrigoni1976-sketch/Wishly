import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

// Registers for native push notifications and saves the FCM/APNs token to the backend.
// Only active on native iOS/Android — no-op on web.
export function useNativePush(parentToken) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !parentToken) return

    let regHandle, errHandle, recHandle, actHandle

    async function setup() {
      const permission = await PushNotifications.requestPermissions()
      if (permission.receive !== 'granted') return

      await PushNotifications.register()

      regHandle = PushNotifications.addListener('registration', async ({ value: token }) => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || ''
          await fetch(`${baseUrl}/api/push/register-native`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, platform: Capacitor.getPlatform(), parentToken }),
          })
        } catch (e) {
          console.error('[push] token save failed', e)
        }
      })

      errHandle = PushNotifications.addListener('registrationError', (err) => {
        console.error('[push] registration error', err)
      })

      recHandle = PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[push] received in foreground', notification.title)
      })

      actHandle = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[push] action performed', action.notification.title)
      })
    }

    setup()

    return () => {
      regHandle?.then?.(h => h.remove())
      errHandle?.then?.(h => h.remove())
      recHandle?.then?.(h => h.remove())
      actHandle?.then?.(h => h.remove())
    }
  }, [parentToken])
}
