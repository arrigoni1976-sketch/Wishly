import { useState } from 'react'

const STORAGE_KEY = 'piky_user_key'

export function useUserKey() {
  const [userKey, setUserKeyState] = useState(() => localStorage.getItem(STORAGE_KEY) || null)

  const saveKey = (key) => {
    const normalized = key.toLowerCase().trim()
    localStorage.setItem(STORAGE_KEY, normalized)
    setUserKeyState(normalized)
  }

  const clearKey = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUserKeyState(null)
  }

  return { userKey, saveKey, clearKey }
}
