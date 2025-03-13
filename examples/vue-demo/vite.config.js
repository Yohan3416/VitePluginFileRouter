import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { VitePluginFileRouterVue } from '@vite-plugin/file-router-vue'
import { VitePluginFileRouterVue } from '../../packages/vue/src/VitePluginFileRouterVue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [VitePluginFileRouterVue(),vue()],
})
