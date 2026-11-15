import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import App from './App'
import { DataProvider } from './data/DataProvider'
// 글꼴: 화면 글자는 Pretendard, 앱 이름과 홈의 큰 제목만 주아. 둘 다 필요한 글자 묶음만 내려받습니다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@fontsource/jua/index.css'
import './styles.css'

// HashRouter: 주소에 #을 붙여 화면을 나눕니다. 서버 설정 없이 GitHub Pages와 APK에서 그대로 동작합니다.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </HashRouter>
  </StrictMode>,
)
