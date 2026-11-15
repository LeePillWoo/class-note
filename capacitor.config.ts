import type { CapacitorConfig } from '@capacitor/cli'

// 안드로이드 앱(APK)으로 감싸는 설정. 웹 빌드(dist)를 앱 안에 넣어 인터넷 없이도 열립니다.
const config: CapacitorConfig = {
  appId: 'com.leepillwoo.classnote',
  appName: '마녀의 출석부',
  webDir: 'dist',
  android: {
    // 화면이 그려지기 전 바탕 (styles.css의 --bg)
    backgroundColor: '#f6f5f2',
  },
}

export default config
