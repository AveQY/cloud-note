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
    path: '/note/:noteId',
    name: 'NoteView',
    component: () => import('@/components/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/components/SettingsPage.vue'),
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
    // 永久登录：没有 expireTime 即表示不设置过期时间。
    // 兼容旧版本遗留的过期时间：登录成功后会自动清理。
    return false
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
