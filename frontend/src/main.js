import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles.css'

// Single-session: de backend geeft 401 als er elders is ingelogd (oud token).
// Eén fetch-wrapper vangt dat voor alle API-calls op, i.p.v. 28 views aan te
// passen. Login-401 (verkeerd wachtwoord) negeren we, anders zou dat ook
// "uitloggen" triggeren.
const origFetch = window.fetch
window.fetch = async (...args) => {
  const res = await origFetch(...args)
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
  if (res.status === 401 && !url.includes('/api/login') && localStorage.getItem('token')) {
    localStorage.removeItem('stage-auth')
    localStorage.removeItem('token')
    localStorage.removeItem('gebruiker')
    if (!location.pathname.startsWith('/login')) location.href = '/login?reden=elders'
  }
  return res
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')