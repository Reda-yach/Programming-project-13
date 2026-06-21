import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'stage-auth'

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return { token: null, user: null }
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return { token: null, user: null }
  }

  try {
    return JSON.parse(stored)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return { token: null, user: null }
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(readStoredAuth().token)
  const user = ref(readStoredAuth().user)

  const isLoggedIn = computed(() => Boolean(token.value))

  // Log in op een andere tab? Dan verandert localStorage daar, en deze tab
  // krijgt een 'storage' event (vuurt alleen in ANDERE tabs, niet in de tab
  // die zelf inlogt). Wijkt het token af van het onze, dan stuurt deze (oude)
  // tab zichzelf naar de loginpagina met een reden, zodat de LoginView een
  // melding kan tonen.
  //
  // Belangrijk: NIET clearSession() hier — dat wist de gedeelde localStorage,
  // óók het token dat de nieuwe tab net schreef, waardoor die opnieuw moet
  // inloggen. We raken localStorage dus niet aan; de volledige reload leest
  // gewoon de actuele sessie.
  //
  // ponytail: zelfde browser deelt localStorage, dus de oude tab is niet écht
  // "uitgelogd" (token bestaat nog) — hij toont enkel login + melding. Voor
  // echte single-session over tabs/browsers/apparaten: server-side de oude
  // tokens ongeldig maken bij login.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY || !token.value) return
      const nieuwToken = e.newValue ? JSON.parse(e.newValue).token : null
      if (nieuwToken !== token.value) {
        window.location.href = '/login?reden=elders'
      }
    })
  }

  function saveSession(session) {
    token.value = session.token
    user.value = session.user

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: session.token, user: session.user })
    )

    // ponytail: legacy compat — de meeste schermen lezen nog rechtstreeks
    // localStorage 'token'/'gebruiker'. Spiegelen i.p.v. 30+ views migreren.
    localStorage.setItem('token', session.token)
    localStorage.setItem('gebruiker', JSON.stringify(session.user))
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('token')
    localStorage.removeItem('gebruiker')
  }

  function getRoleHomePath(role) {
    const map = {
      student: '/student',
      docent: '/docent',
      mentor: '/mentor',
      admin: '/admin/competenties',
      // De stagecommissie gebruikt dezelfde schermen als de docent (mét de
      // extra Aanvragen-tab), dus landt ook op de docent-studentenlijst.
      commissie: '/docent-studenten',
    }

    return map[role] || '/login'
  }

  return { token, user, isLoggedIn, saveSession, clearSession, getRoleHomePath }
})
