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

// ─── Gifts ─────────────────────────────────────────────────────────────────

export const addGift = (eventId, data) => api.post(`/events/${eventId}/gifts`, data)
export const updateGift = (giftId, data) => api.put(`/gifts/${giftId}`, data)
export const deleteGift = (giftId) => api.delete(`/gifts/${giftId}`)
export const reserveGift = (giftId, data) => api.post(`/gifts/${giftId}/reserve`, data)
export const cancelReservation = (giftId, data) => api.delete(`/gifts/${giftId}/reserve`, { data })
export const reorderGifts = (eventId, order) => api.put(`/events/${eventId}/gifts/order`, { order })

// ─── RSVP ──────────────────────────────────────────────────────────────────

export const submitRsvp = (eventId, data) => api.post(`/events/${eventId}/rsvp`, data)
export const updateRsvp = (rsvpId, data) => api.put(`/rsvp/${rsvpId}`, data)

// ─── Collective gift ───────────────────────────────────────────────────────

export const getContributions = (eventId) => api.get(`/events/${eventId}/contributions`)
export const createContribution = (eventId, data) => api.post(`/events/${eventId}/contributions`, data)
export const createPaymentIntent = (data) => api.post('/payments/stripe/intent', data)
export const createPayPalOrder = (data) => api.post('/payments/paypal/order', data)
export const initSatispay = (data) => api.post('/payments/satispay/init', data)

// ─── User keys ─────────────────────────────────────────────────────────────

export const registerUserKey = (key) => api.post('/user-keys/register', { key })
export const getUserKeyLinks = (key) => api.get(`/user-keys/${encodeURIComponent(key)}`)
export const addUserKeyLink = (key, data) => api.post(`/user-keys/${encodeURIComponent(key)}/link`, data)
export const removeUserKeyLink = (key, token) => api.delete(`/user-keys/${encodeURIComponent(key)}/link/${encodeURIComponent(token)}`)

// ─── Error helper ──────────────────────────────────────────────────────────

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Si è verificato un errore'

export default api
