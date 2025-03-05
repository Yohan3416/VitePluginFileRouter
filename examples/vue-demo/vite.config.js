import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vitePluginFileRouterVue from './../../packages/vue/src/index';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vitePluginFileRouterVue(),vue()],
})
