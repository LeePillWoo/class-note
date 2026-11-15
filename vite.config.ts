import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react()],
  // 상대 경로로 빌드해야 GitHub Pages와 Capacitor(APK)에서 모두 열립니다.
  base: './',
  define: {
    // 설정 화면에 보여주는 버전 (package.json의 version)
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
