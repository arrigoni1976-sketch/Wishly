import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

export const capacitorStorage = {
  getItem: async (key) => {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key })
      return value
    }
    return localStorage.getItem(key)
  },
  setItem: async (key, value) => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value: String(value) })
    } else {
      localStorage.setItem(key, value)
    }
  },
  removeItem: async (key) => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key })
    } else {
      localStorage.removeItem(key)
    }
  },
}
