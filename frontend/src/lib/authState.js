let _token = null

export function setAuthToken(token) {
  _token = token
}

export function getAuthToken() {
  return _token
}
