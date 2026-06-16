import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
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
      component: () => import('../views/DocentInCommissieStudenten.vue'),
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
      component: () => import('../views/DocentInCommissieAanvragen.vue'),
    },
    {
      path: '/docent-logboek-detail/:stage_id',
      name: 'docent-logboek-detail',
      component: () => import('../views/DocentLogboekDetail.vue'),
    },
    {
      path: '/mentor',
      name: 'mentor',
      component: () => import('../views/MentorLogboek.vue'),
    },
    {
      path: '/docent-studenten',
      name: 'docent-studenten',
      component: () => import('../views/DocentInCommissieStudenten.vue'),
    },
  ],
})


router.beforeEach((to, from, next) => {
  const openRoutes = ['login']
  const token = localStorage.getItem('token')
  if (!openRoutes.includes(to.name) && !token) {
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router
