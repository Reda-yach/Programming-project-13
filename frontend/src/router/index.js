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
      path: '/wachtwoord-vergeten',
      name: 'wachtwoord-vergeten',
      component: () => import('../views/WachtwoordVergeten.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/WachtwoordReset.vue'),
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
      path: '/student/aanvraag/status',
      name: 'student-aanvraag-status',
      component: () => import('../views/StudentAanvraagStatus.vue'),
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
      path: '/mentor',
      name: 'mentor-dashboard',
      component: () => import('../views/MentorDashboard.vue'),
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
      path: '/commissie',
      name: 'commissie-dashboard',
      component: () => import('../views/CommissieDashboard.vue'),
    },
  ],
})

router.beforeEach((to, from, next) => {
  const openRoutes = ['login', 'wachtwoord-vergeten', 'reset-password']
  const token = localStorage.getItem('token')
  if (!openRoutes.includes(to.name) && !token) {
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router
