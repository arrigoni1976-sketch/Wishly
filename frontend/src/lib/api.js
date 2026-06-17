import axios from 'axios'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Events ────────────────────────────────────────────────────────────────

export const createEvent = (data) => api.post('/events', data)
export const getEventByParentToken = (token) => api.get(`/events/parent/${token}`)
export const getEventByGuestToken = (token) => api.get(`/events/guest/${token}`)
export const getEventByCollectiveToken = (token) => api.get(`/events/collective/${token}`)
export const updateEvent = (id, data) => api.put(`/events/${id}`, data)
export const trackLinkView = (token, data) => api.post(`/events/guest/${token}/view`, data)
export const checkEmailQuota = (email) => api.get(`/events/email-quota?email=${encodeURIComponent(email)}`)

// ─── Gifts ─────────────────────────────────────────────────────────────────

export const addGift = (eventId, data, parentToken) => api.post(`/events/${eventId}/gifts`, { ...data, parentToken })
export const updateGift = (giftId, data, parentToken) => api.put(`/gifts/${giftId}`, { ...data, parentToken })
export const deleteGift = (giftId, parentToken) => api.delete(`/gifts/${giftId}`, { data: { parentToken } })
export const reserveGift = (giftId, data) => api.post(`/gifts/${giftId}/reserve`, data)
export const cancelReservation = (giftId, data) => api.delete(`/gifts/${giftId}/reserve`, { data })
export const reorderGifts = (eventId, order, parentToken) => api.put(`/events/${eventId}/gifts/order`, { order, parentToken })

// ─── RSVP ──────────────────────────────────────────────────────────────────

export const submitRsvp = (eventId, data) => api.post(`/events/${eventId}/rsvp`, data)
export const updateRsvp = (rsvpId, data, guestToken) => api.put(`/rsvp/${rsvpId}`, { ...data, guestToken })

// ─── Collective gift ───────────────────────────────────────────────────────

export const getContributions = (eventId) => api.get(`/events/${eventId}/contributions`)
export const createContribution = (eventId, data) => api.post(`/events/${eventId}/contributions`, data)
export const updateContribution = (eventId, cid, data) => api.put(`/events/${eventId}/contributions/${cid}`, data)
export const confirmContribution = (eventId, cid, parentToken) => api.patch(`/events/${eventId}/contributions/${cid}/confirm`, { parentToken })
export const initSatispay = (data) => api.post('/payments/satispay/init', data)

export const sendThankYouEmails = (eventId, data) => api.post(`/events/${eventId}/thank-you`, data)

// ─── User keys ─────────────────────────────────────────────────────────────

export const registerUserKey = (key, email = null) => api.post('/user-keys/register', { key, email })
export const getUserKeyLinks = (key) => api.get(`/user-keys/${encodeURIComponent(key)}`)
export const addUserKeyLink = (key, data) => api.post(`/user-keys/${encodeURIComponent(key)}/link`, data)
export const removeUserKeyLink = (key, token) => api.delete(`/user-keys/${encodeURIComponent(key)}/link/${encodeURIComponent(token)}`)

// ─── Push notifications ────────────────────────────────────────────────────

export const getPushVapidKey = () => api.get('/push/vapid-public-key')
export const subscribePush = (data) => api.post('/push/subscribe', data)
export const diagnosePush = (parentToken) => api.get(`/push/diagnose/${parentToken}`)

// ─── Error helper ──────────────────────────────────────────────────────────

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Si è verificato un errore'

export default api
