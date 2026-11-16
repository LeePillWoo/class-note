import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

/**
 * 웹(GitHub Pages)으로 내보낼 때 콘텐츠 보안 정책(CSP)을 넣습니다.
 * 이 앱은 바깥에서 아무것도 불러오지 않으므로, 이 사이트 안의 파일과 기기 안의 그림(data:, blob:)만 허용합니다.
 * APK(--mode apk)에는 넣지 않습니다. Capacitor가 화면에 연결 코드를 끼워 넣는 방식이 막힐 수 있어서입니다.
 */
function contentSecurityPolicy(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
  return {
    name: 'class-note-csp',
    apply: (_config, { command, mode }) => command === 'build' && mode !== 'apk',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }],
  }
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  // 상대 경로로 빌드해야 GitHub Pages와 Capacitor(APK)에서 모두 열립니다.
  base: './',
  define: {
    // 설정 화면에 보여주는 버전 (package.json의 version)
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
