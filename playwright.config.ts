import { defineConfig } from '@playwright/test'

// 화면 테스트: PC에 설치된 Edge로 여러 화면 크기에서 같은 시나리오를 실행합니다.
// 실행: npm run test:e2e   (브라우저를 따로 내려받지 않습니다)
const PORT = 5198

const phone = { deviceScaleFactor: 2, isMobile: true, hasTouch: true }
// 화면 배치만 확인하는 크기: 배치 테스트(layout.spec.ts)만 돌립니다. 기능 테스트는 폰-세로와 PC에서 돌립니다.
const layoutOnly = /layout\.spec\.ts/

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  // 개발 서버가 처음 화면을 준비하는 시간까지 넉넉히
  timeout: 60_000,
  // 헤드리스 Edge가 여러 테스트를 같이 돌릴 때 드물게 그리기를 멈춰(절전) 클릭이 60초를 넘기는 일이 있어
  // 한 번 다시 시도합니다. 진짜 문제는 두 번 연속 실패하므로 그대로 드러납니다.
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'msedge',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    screenshot: 'only-on-failure',
    // 헤드리스 창이 가려지거나 뒤로 가면 Edge가 그리기 프레임을 멈춰, Playwright의 "요소가 멈춰 있는지" 확인이 끝나지 않습니다. 절전을 끕니다.
    launchOptions: {
      args: [
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling',
        '--disable-features=CalculateNativeWinOcclusion',
      ],
    },
  },
  projects: [
    { name: '좁은-폰', testMatch: layoutOnly, use: { viewport: { width: 320, height: 640 }, ...phone } },
    { name: '폰-세로', use: { viewport: { width: 360, height: 780 }, ...phone } },
    { name: '폰-가로', testMatch: layoutOnly, use: { viewport: { width: 780, height: 360 }, ...phone } },
    { name: '작은-태블릿', testMatch: layoutOnly, use: { viewport: { width: 750, height: 800 }, ...phone } },
    { name: '태블릿-세로', testMatch: layoutOnly, use: { viewport: { width: 800, height: 1280 }, ...phone } },
    { name: '태블릿-가로', testMatch: layoutOnly, use: { viewport: { width: 1280, height: 800 }, ...phone } },
    { name: 'PC', use: { viewport: { width: 1366, height: 768 } } },
    { name: '와이드', testMatch: layoutOnly, use: { viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
})
