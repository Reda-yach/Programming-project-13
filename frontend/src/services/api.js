import axios from 'axios'

// Centrale axios-instance voor alle API-calls.
// baseURL komt uit de .env (VITE_API_URL), bv. http://localhost:3000/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Request-interceptor: voeg het JWT-token toe als Authorization-header.
// We lezen het token bewust uit localStorage in plaats van de Pinia auth-store
// (die in Fase 2 komt). Dat voorkomt een circulaire import — de auth-store
// persisteert het token tóch in localStorage.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response-interceptor: bij een 401 (token verlopen/ongeldig) → uitloggen
// en terug naar de loginpagina.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default api
