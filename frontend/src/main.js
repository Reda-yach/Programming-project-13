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
    // Alleen uitloggen bij een ÉCHT sessie-conflict (backend code 'sessie_elders'),
    // niet bij elke willekeurige 401 — anders maskeert een toevallige 401 zich als
    // "elders ingelogd" en word je onterecht naar de loginpagina gestuurd.
    let code = null
    try { code = (await res.clone().json()).code } catch { /* geen JSON-body */ }
    if (code === 'sessie_elders') {
      localStorage.removeItem('stage-auth')
      localStorage.removeItem('token')
      localStorage.removeItem('gebruiker')
      if (!location.pathname.startsWith('/login')) location.href = '/login?reden=elders'
    }
  }
  return res
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')