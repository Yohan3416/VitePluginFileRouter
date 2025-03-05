import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('./views/Home/index.vue')
    },
    {
        path: '/about',
        name: 'about',
        component: () => import('./views/About/index.vue')
    }
]

export default createRouter({
    history: createWebHistory(),
    routes
})