// Token store condiviso — aggiornato da onAuthStateChange, usato dall'interceptor API.
// Evita di chiamare getSession() nell'interceptor, che su iOS+CapacitorHttp può
// innescare un refresh del token corrotto e azzerare la sessione.
let _token = null
export const setAuthToken = (t) => { _token = t }
export const getAuthToken = () => _token
