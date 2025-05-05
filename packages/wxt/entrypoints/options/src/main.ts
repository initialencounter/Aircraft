import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'
import './assets/main.scss'
// @ts-ignore
import form from 'schemastery-vue'
import { createI18n } from 'vue-i18n'
// @ts-ignore
import Markdown from 'markdown-vue'
import App from './App.vue'
const i18n = createI18n({
  legacy: false,
})

createApp(App)
  .use(i18n)
  .use(form)
  .component('k-markdown', Markdown)
  .use(ElementPlus)
  .mount('#app')
