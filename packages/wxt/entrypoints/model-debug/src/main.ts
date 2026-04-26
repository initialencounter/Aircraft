import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'
import '../../options/src/assets/main.scss'
import App from './App.vue'

createApp(App)
  .use(ElementPlus)
  .mount('#app')