import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Schema from '../components/Schema.vue'
import SchemaBase from '../components/SchemaBase.vue'
import Logs from '../views/Logs.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/schema',
      name: 'Schema',
      component: Schema
    },
    {
      path: '/schema_base',
      name: 'SchemaBase',
      component: SchemaBase
    },
    {
      path: '/logs',
      name: 'Logs',
      component: Logs
    }
  ]
})

export default router 