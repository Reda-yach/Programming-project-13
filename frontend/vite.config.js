import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // host: true => dev-server luistert op alle netwerkinterfaces, zodat iemand op
  // dezelfde VPN/LAN de app kan openen via http://<jouw-ip>:5173
  server: {
    host: true,
  },
})
