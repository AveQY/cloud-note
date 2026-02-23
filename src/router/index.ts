import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/components/LoginPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/components/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/share/:shareId',
    name: 'Share',
    component: () => import('@/components/SharePage.vue'),
    props: true,
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const requiresAuth = to.meta?.requiresAuth !== false

  const checkLoginExpired = () => {
    const expireTime = localStorage.getItem('expireTime')
    if (!expireTime) return true
    
    const now = Date.now()
    const expired = now > parseInt(expireTime)
    
    if (expired) {
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('username')
      localStorage.removeItem('loginTime')
      localStorage.removeItem('expireTime')
    }
    
    return expired
  }

  if (to.name === 'Login' && isLoggedIn && !checkLoginExpired()) {
    next({ name: 'Home' })
  } else if (requiresAuth && (!isLoggedIn || checkLoginExpired())) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
