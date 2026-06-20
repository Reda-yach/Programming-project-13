import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      meta: { requiresAuth: false },
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/student',
      name: 'student-dashboard',
      component: () => import('../views/StudentDashboard.vue'),
    },
    {
      path: '/student/aanvraag',
      name: 'student-aanvraag',
      component: () => import('../views/StudentAanvraag.vue'),
    },
    {
      path: '/student/logboek',
      name: 'student-logboek',
      component: () => import('../views/StudentLogboek.vue'),
    },
    {
      path: '/student/evaluatie',
      name: 'student-evaluatie',
      component: () => import('../views/StudentEvaluatie.vue'),
    },
    {
      path: '/docent',
      name: 'docent',
      // /docent is enkel het landingspunt na login → toon de studentenlijst (kaarten-view).
      redirect: '/docent-studenten',
    },
    {
      path: '/docent-logboek-overzicht',
      name: 'docent-logboek-overzicht',
      component: () => import('../views/Docentlogboekoverzicht.vue'),
    },
    {
      path: '/docent-evaluaties',
      name: 'docent-evaluaties',
      component: () => import('../views/DocentInCommissieEvaluaties.vue'),
    },
    {
      path: '/docent-aanvragen',
      name: 'docent-aanvragen',
      // Enkel docenten in de stagecommissie (commissielid) mogen aanvragen zien.
      meta: { requiresCommissie: true },
      component: () => import('../views/DocentInCommissieAanvragen.vue'),
    },
    {
      path: '/docent-logboek-detail/:stage_id',
      name: 'docent-logboek-detail',
      component: () => import('../views/DocentLogboekDetail.vue'),
    },
    {
      path: '/docent-studenten',
      name: 'docent-studenten',
      component: () => import('../views/DocentInCommissieStudenten.vue'),
    },
    // ── Admin (all routes require admin role) ─────────────────────────────
    {
      // Oude tabel-UI is verwijderd; bestaande links naar /docent/studenten
      // (AppTopbar, evaluatie-terugknoppen) leiden nu naar de kaarten-view.
      path: '/docent/studenten',
      redirect: '/docent-studenten',
    },
    {
      path: '/aanvragen',
      name: 'commissie-aanvragen',
      component: () => import('@/views/CommissieAanvragenView.vue'),
    },
    {
      path: '/docent/aanvragen',
      name: 'docent-aanvragen-overzicht',
      meta: { requiresCommissie: true },
      component: () => import('../views/DocentAanvragen.vue'),
    },
    {
      path: '/docent/evaluaties/:stageId',
      name: 'docent-evaluatie-overzicht',
      component: () => import('../views/DocentEvaluatieOverzicht.vue'),
    },
    {
      path: '/docent/evaluatie/:stageId/:fase/vergelijking',
      name: 'docent-evaluatie-vergelijking',
      component: () => import('../views/EvaluatieVergelijking.vue'),
    },
    {
      path: '/mentor',
      name: 'mentor-studenten',
      component: () => import('../views/MentorStudenten.vue'),
    },
    {
      path: '/mentor/logboeken',
      name: 'mentor-logboeken',
      component: () => import('../views/MentorLogboeken.vue'),
    },
    {
      path: '/mentor/evaluatie',
      name: 'mentor-evaluatie',
      component: () => import('../views/MentorEvaluatie.vue'),
    },
    {
      path: '/mentor/probleem',
      name: 'mentor-probleem',
      component: () => import('../views/MentorProbleemmelding.vue'),
    },
    {
      path: '/student/contract',
      name: 'student-contract',
      component: () => import('../views/StudentContract.vue'),
    },
    {
      path: '/student/evaluatie/:fase',
      name: 'student-evaluatie-invullen',
      component: () => import('../views/StudentEvaluatieInvullen.vue'),
    },
    {
      path: '/student/evaluatie/:fase/beoordeling',
      name: 'student-evaluatie-beoordeling',
      component: () => import('../views/EvaluatieVergelijking.vue'),
    },
    {
      path: '/student/eindoverzicht',
      name: 'student-eindoverzicht',
      component: () => import('../views/StudentEindoverzicht.vue'),
    },
    {
      path: '/commissie',
      name: 'commissie',
      component: () => import('../views/CommissieDashboard.vue'),
    },
    {
      path: '/admin/studenten/nieuw',
      name: 'admin-student-nieuw',
      component: () => import('../views/AdminStudentNieuw.vue'),
    },
    {
      path: '/admin/competenties',
      name: 'admin-competenties',
      component: () => import('../views/AdminCompetentiebeheer.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/competentiebeheer',
      redirect: '/admin/competenties',
    },
    {
      path: '/admin/competentiesets',
      redirect: '/admin/competenties',
    },
    {
      path: '/admin/stages',
      name: 'admin-stages',
      component: () => import('../views/Adminstagebeheer.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/stages/:id/koppelen',
      name: 'admin-stage-koppelen',
      component: () => import('../views/Adminaccountkoppelen.vue'),
      props: true,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/accounts',
      name: 'admin-accounts',
      component: () => import('../views/Adminaccountbeheer.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/accounts/nieuw',
      name: 'admin-account-nieuw',
      component: () => import('../views/AdminAccountNieuw.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/accounts/:id/bewerken',
      name: 'admin-account-bewerken',
      component: () => import('../views/Adminaccountbewerken.vue'),
      props: true,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/aanvragen',
      name: 'admin-aanvragen',
      // Deelt de split-layout aanvragenpagina met de docent; de view is
      // rol-bewust (admin-navigatie + admin-topbar).
      component: () => import('../views/DocentInCommissieAanvragen.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/commissie',
      name: 'commissie-dashboard',
      component: () => import('../views/CommissieDashboard.vue'),
    },
    {
      path: '/wachtwoord-vergeten',
      name: 'wachtwoord-vergeten',
      meta: { requiresAuth: false },
      component: () => import('../views/WachtwoordVergetenView.vue'),
    },
    {
      path: '/wachtwoord-reset',
      name: 'wachtwoord-reset',
      meta: { requiresAuth: false },
      component: () => import('../views/WachtwoordResetView.vue'),
    },
  ],
})

router.beforeEach((to, _from, next) => {
  // Routes met meta.requiresAuth === false zijn publiek (login, wachtwoord-reset).
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth !== false && !token) {
    next({ name: 'login' })
    return
  }

  // 2. Admin-only route → verify rol from stored gebruiker object
  if (to.meta.requiresAdmin) {
    try {
      const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')
      if (gebruiker.rol !== 'admin') {
        next({ name: 'login' })
        return
      }
    } catch {
      next({ name: 'login' })
      return
    }
  }

  // 3. Aanvragen-pagina van de docent → enkel de stagecommissie (rol
  // 'commissie') of admin. Een gewone docent gaat terug naar zijn studenten.
  if (to.meta.requiresCommissie) {
    try {
      const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')
      const magBeoordelen =
        gebruiker.rol === 'admin' || gebruiker.rol === 'commissie'
      if (!magBeoordelen) {
        next({ name: 'docent-studenten' })
        return
      }
    } catch {
      next({ name: 'login' })
      return
    }
  }

  next()
})

export default router