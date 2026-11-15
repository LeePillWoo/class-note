"""직접 설계한 SVG를 다시 만들어요. 표준 라이브러리만 사용해요."""
from pathlib import Path
import html
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
ICONS = {
 'nav-home': ('홈 메뉴', '<path d="M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9"/>'),
 'nav-lessons': ('수업 메뉴', '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M16 8v6"/><ellipse cx="14" cy="14.5" rx="2" ry="1.5"/>'),
 'nav-makeups': ('보강 메뉴', '<path d="M4 8a9 9 0 1 1-1 7M3 3v5h5M12 7v5l3 2"/>'),
 'nav-payments': ('납부 메뉴', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>'),
 'nav-settings': ('설정 메뉴', '<path d="M9 5 10 3h4l1 2 2 1 2-.2 2 3-1 2v2l1 2-2 3-2-.2-2 1-1 2h-4l-1-2-2-1-2 .2-2-3 1-2v-2L3 9l2-3 2 .2z"/><circle cx="12" cy="12" r="3"/>'),
 'set-lesson-defaults': ('수업·수강료 기본값', '<path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>'),
 'set-students': ('학생 관리', '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8 17a4 4 0 0 1 8 0M2 7h3M2 12h3M2 17h3"/>'),
 'set-attendance': ('출결·보강 설정', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 15l3 3 5-5"/>'),
 'set-messages': ('안내 문구 설정', '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2zM7 9h10M7 13h7"/>'),
 'set-backup': ('백업과 복원', '<path d="M8 15V3M4 7l4-4 4 4M16 3v12M12 11l4 4 4-4M3 17v4h18v-4"/>'),
 'set-data': ('데이터 관리', '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 4 16 4 16 0v-13M4 12c0 4 16 4 16 0"/>'),
 'camera': ('사진 넣기', '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>'),
 'zoom-in': ('크게 보기', '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5M7.5 10.5h6M10.5 7.5v6"/>'),
 'zoom-out': ('작게 보기', '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5M7.5 10.5h6"/>'),
 'copy': ('복사', '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 5V3H4v13h1"/>'),
 'message': ('문자 보내기', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>'),
 'stats': ('통계', '<path d="M4 3v18h17M8 16v-4M13 16V8M18 16V5"/>'),
 'note': ('메모', '<path d="M5 3h10l5 5v13H5zM15 3v5h5M9 12h7M9 16h5"/>'),
 'group': ('그룹 수업', '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5v1"/>'),
 'solo': ('1:1 레슨', '<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'),
 'pause': ('잠시 쉬기', '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'),
 'leave': ('그만두기', '<path d="M10 4H4v16h6M9 12h12M17 8l4 4-4 4"/>'),
 'return': ('다시 다니기', '<path d="M14 4h6v16h-6M15 12H3M7 8l-4 4 4 4"/>'),
 'check-all': ('모두 출석', '<path d="m3 12 4 4 7-8M11 16l3 3 7-8"/>'),
 'ukulele': ('우쿨렐레', '<path d="m14 9 5-6 2 2-6 5M14 9c-4-3-8 0-7 3-5 1-5 6-2 8s7 0 7-3c4 0 5-4 3-7M6 17l2 2"/><circle cx="11" cy="13" r="1.8"/>'),
 'kalimba': ('칼림바', '<rect x="4" y="3" width="16" height="18" rx="4"/><path d="M7 7h10M8 7v6M12 7v10M16 7v6"/>'),
 'witch-hat': ('마녀 모자', '<path d="M6 17 12 3l3 8 4 6M7 14l10-1M6 17c-5 0-5 4 6 4s12-4 7-4M6 17c4 1 9 1 13 0"/>'),
 'cat': ('고양이', '<path d="M5 10 4 3l6 4h4l6-4-1 7c5 13-19 13-14 0M8 12h.1M16 12h.1M11 15l1 1 1-1M3 14l4 1M21 14l-4 1M3 18l4-1M21 18l-4-1"/>'),
 'music-note': ('음표', '<path d="M10 17V5l10-2v12M10 9l10-2"/><ellipse cx="7" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>'),
}

def cat(x=0, y=0, scale=1, sleeping=False):
    eyes = ('<path d="M30 51q6 7 12 0M60 51q6 7 12 0" fill="none" stroke="#e7d8c2" stroke-width="3"/>' if sleeping else '<path d="M28 51q8-10 17 0-8 10-17 0M57 51q8-10 17 0-8 10-17 0" fill="#e7eee9"/><path d="M37 47v8M65 47v8" stroke="#385764" stroke-width="4"/>')
    return f'''<g transform="translate({x} {y}) scale({scale})"><path d="M71 119c44 6 40-34 26-24-8 6 4 12-9 14" fill="none" stroke="#302826" stroke-width="11"/><path d="M29 79Q9 111 23 132h56q12-24-8-53" fill="#302826"/><path d="M22 39 18 9l26 21h15L85 9l-4 31c23 54-78 55-59-1" fill="#302826"/><path d="m24 23 3 16 10-7m38-9-3 16-10-7" fill="#ad8c79" stroke="none"/>{eyes}<path d="m48 61 4 4 4-4" fill="#c28c88" stroke="#c28c88" stroke-width="3"/><path d="M52 66v5m0 0q-7 7-12 0m12 0q7 7 12 0" stroke="#c28c88" stroke-width="2.5" fill="none"/><path d="m17 60 15 4m-15 7 15-2m40-5 15-4m-15 9 15 2" stroke="#d5c5af" stroke-width="2.5"/><path d="M33 85h39l-19 8z" fill="#8f3029" stroke="none"/><path d="m52 92-3 14m3-14 7 12" stroke="#8f3029" stroke-width="5"/><path d="M35 118v14m29-14v14" fill="none" stroke="#a58b76" stroke-width="3"/></g>'''

def uke(x,y,s=1):
    return f'''<g transform="translate({x} {y}) scale({s}) rotate(22 42 75)"><path d="M30 63C7 50 0 81 13 91c-22 19-9 48 13 51 25 3 45-23 24-48 18-12 6-42-13-31" fill="#bd8b49"/><path d="M29 65 30 16h12l-5 49" fill="#795334"/><rect x="29" y="3" width="15" height="23" rx="4" fill="#bd8b49"/><path d="M26 10h4m14 0h4m-22 9h4m14 0h4"/><circle cx="31" cy="91" r="11" fill="#49352a"/><path d="M20 121h22" stroke-width="7"/><path d="M33 21v100m5-100-3 100" stroke="#f1dfbc" stroke-width="1.8"/></g>'''

def art(body, label, size=384, view='0 0 384 320'):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{320 if size==384 else size}" viewBox="{view}" role="img" aria-label="{label}"><g stroke="#302826" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>'''

ARTS = {
 'empty-lessons': ('수업이 없어요: 쉬고 있는 고양이와 우쿨렐레', art('<path d="M57 276h266" stroke="#d7cbbb"/>'+uke(214,88,1.12)+cat(90,111,1.2,True)+'<path d="M267 55v20m-10-10h20" stroke="#bd8b49"/>', '쉬고 있는 고양이와 우쿨렐레')),
 'empty-makeups': ('잡힌 보강이 없어요: 고양이와 비어 있는 달력', art('<path d="M52 277h278" stroke="#d7cbbb"/><rect x="141" y="72" width="172" height="170" rx="16" fill="#fbf5e9"/><path d="M141 113h172M179 58v30M274 58v30"/><path d="M174 147h16m35 0h16m35 0h10M174 180h16m35 0h16m35 0h10" stroke="#c9b89d"/>'+cat(63,119,1.16)+'<path d="M237 225v-21l15-4v19" fill="none"/><ellipse cx="232" cy="226" rx="5" ry="4" fill="#302826"/><ellipse cx="247" cy="220" rx="5" ry="4" fill="#302826"/>', '고양이와 비어 있는 달력')),
 'empty-payments': ('받을 수강료가 없어요: 정리한 장부와 고양이', art('<path d="M52 277h278" stroke="#d7cbbb"/><path d="M77 93h157v153H77z" fill="#bd8b49"/><path d="M94 80h153v155H94z" fill="#fbf5e9"/><path d="M120 111h81M120 136h54M120 163h45" stroke="#c9b89d"/><circle cx="202" cy="195" r="23" fill="#ede4d5"/><path d="m190 194 8 9 16-17"/>'+cat(230,125,1.05,True), '정리한 장부와 편히 쉬는 고양이')),
 'empty-students': ('학생이 없어요: 새 친구를 기다리는 고양이와 칼림바', art('<path d="M52 277h278" stroke="#d7cbbb"/><path d="M193 127h103v15H193zM204 143v119m81-119v119" fill="#bd8b49"/><rect x="204" y="63" width="80" height="67" rx="15" fill="#bd8b49"/><path d="M218 80h52" stroke="#71563d" stroke-width="6"/><path d="M220 81v27m12-27v35m12-35v40m12-40v35m12-35v27" stroke="#f6eedc" stroke-width="5"/>'+cat(72,113,1.2)+'<path d="M115 73v-18l14-4v17" fill="none"/><ellipse cx="110" cy="74" rx="5" ry="4" fill="#302826"/>', '새 친구를 기다리는 고양이와 칼림바')),
 'app-icon': ('앱 아이콘 후보: 붉은 리본의 마녀 모자', art('<rect x="24" y="24" width="976" height="976" rx="224" fill="#f1ebe1" stroke="none"/><path d="M269 720Q360 488 444 212q119 27 142 161 49 111 153 347z" fill="#302826" stroke-width="16"/><path d="M321 558q194 62 360-22l30 67q-186 98-418 22z" fill="#8f3029" stroke-width="12"/><path d="M261 660q-126 24-108 76 29 93 376 72 308-17 352-127 9-29-23-27-290 99-597 6z" fill="#302826" stroke-width="16"/><path d="M480 601q-66-64-98-46l15 116q50-4 83-40m36-28q46-76 84-71l8 116q-47 8-92-18" fill="#8f3029" stroke="#742620" stroke-width="10"/><rect x="474" y="588" width="48" height="51" rx="17" fill="#8f3029" stroke="#742620" stroke-width="9"/>', '붉은 리본의 마녀 모자 앱 아이콘',1024,'0 0 1024 1024')),
}

def main():
    for folder in ['icons','images']:
        (ROOT/folder).mkdir(exist_ok=True)
    for name, (_, body) in ICONS.items():
        (ROOT/'icons'/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{body}</svg>\n', encoding='utf-8')
    for name, (_, content) in ARTS.items():
        (ROOT/'images'/f'{name}.svg').write_text(content+'\n',encoding='utf-8')
    cards=''.join(f'<article><div class="sizes">'+''.join(f'<span style="width:{s}px;height:{s}px">{(ROOT/"icons"/(name+".svg")).read_text()}</span>' for s in [16,20,24])+f'</div><p>{name}</p><small>{html.escape(label)}</small></article>' for name,(label,_) in ICONS.items())
    illustrations=''.join(f'<article class="art"><img src="images/{name}.svg" alt="{label}"><p>{name}</p></article>' for name,(label,_) in ARTS.items())
    (ROOT/'preview.html').write_text('''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>마녀의 출석부 · 디자인 후보</title><style>body{margin:32px;background:#f6f5f2;color:#302826;font:14px/1.5 system-ui,sans-serif}h1{font-size:24px}h2{margin-top:32px;font-size:18px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}article{padding:20px;border:1px solid #ded8d0;border-radius:14px;background:#fff}p{margin:12px 0 0}small{color:#655c54}.sizes{display:flex;align-items:center;gap:24px;height:36px}.sizes span{display:inline-flex}.sizes svg{width:100%;height:100%}.art img{width:100%;height:200px;object-fit:contain}.art{background:repeating-conic-gradient(#f6f5f2 0% 25%,#fff 0% 50%) 0/20px 20px}.arts{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}</style><h1>마녀의 출석부 · 디자인 후보</h1><p>직접 그린 SVG예요. 아이콘은 왼쪽부터 16 · 20 · 24px예요.</p><h2>빈 화면 그림과 앱 아이콘</h2><div class="grid arts">'''+illustrations+'</div><h2>아이콘 29개</h2><div class="grid">'+cards+'</div></html>',encoding='utf-8')
    rows=[]
    for folder, entries in [('icons',ICONS),('images',ARTS)]:
        for name,(label,_) in entries.items():
            rows.append(f'| [{folder}/{name}.svg]({folder}/{name}.svg) | {label} | 직접 그린 SVG |')
    (ROOT/'README.md').write_text('''# 마녀의 출석부 디자인 후보

2026-11-15에 기존 화면과 로고를 보고 만들었어요. 앱 코드는 변경하지 않았어요.

## 만든 방법

모든 아이콘과 그림은 좌표와 경로를 직접 설계한 SVG예요. 내장 그림 생성 도구는 있지만 이 세션에서 **추가 비용이 없는지 확인할 수 없어** 요청에 허용된 SVG 대안을 사용했어요. 외부 서비스, API 키, 유료 호출은 사용하지 않았어요. 원본 로고의 검은 고양이·붉은 리본·나무색 악기를 참고했으며 원본을 대체하는 정식 로고가 아니라 보조 그림과 앱 아이콘 후보예요.

아이콘은 24×24 격자, currentColor, 선 1.8, 둥근 끝과 모서리를 사용해요. 16·20·24px 미리보기는 preview.html에서 확인해요. 빈 화면 SVG 4장은 384×320이며 배경 사각형이 없어 투명해요. 앱 아이콘 SVG는 1024×1024이고 따뜻한 회색 둥근 네모 바깥은 투명해요. 모든 그림은 150KB보다 작아요.

## 파일과 쓰임새

| 파일 | 쓰임새 | 만든 방법 |
|---|---|---|
'''+ '\n'.join(rows)+'''
| [review.md](review.md) | 실제 화면에 근거한 우선순위 10개와 CSS 제안 | 직접 검토·작성 |
| [preview.html](preview.html) | 그림과 아이콘 16·20·24px 크기 비교 | 직접 작성한 정적 HTML |
| [make-assets.py](make-assets.py) | SVG·목록·미리보기 재생성 | Python 표준 라이브러리 |
| [preview.png](preview.png) | 그림·아이콘을 함께 보는 검토용 렌더 | 브라우저 Canvas로 SVG 렌더 |
| [images/app-icon.png](images/app-icon.png) | 1024×1024 앱 아이콘 후보 | 직접 그린 SVG를 PNG로 렌더 |
| [render-preview.js](render-preview.js) | 미리보기 렌더 코드 | 직접 작성한 JavaScript |
| [validate.py](validate.py) | XML·규격·크기와 파일 목록 검사 | Python 표준 라이브러리 |
| [validation.md](validation.md) | XML·규격 검사 결과와 전체 파일 크기 | 검사 결과 기록 |

## 적용할 때

- SVG 아이콘의 내부 도형을 기존 `Icon` 컴포넌트 안에 넣거나 inline SVG로 사용해요. `<img>`로 불러오면 바깥 CSS의 `currentColor`가 전달되지 않아요.
- 아이콘 옆에 글자가 있으면 `aria-hidden="true"`를 주고, 아이콘만 있는 단추에는 동작을 설명하는 `aria-label`을 붙여요.
- 빈 화면 그림은 112~144px 너비로, `object-fit: contain`과 `alt=""`를 사용해요. 옆 제목이 의미를 설명해요.
- 수업: “아직 등록한 수업이 없어요” / “1:1 레슨이나 그룹 수업을 등록해요.”
- 보강: “잡아 둔 보강이 없어요” / “날짜를 정한 보강이 여기에 보여요.” 대기 보강이 있으면 ‘날짜 잡기’로 연결해요.
- 납부: “지금 받을 수강료가 없어요” / “받을 날이 되면 여기에 알려 드려요.”
- 학생: “아직 등록한 학생이 없어요” / “수업을 만들면서 학생도 함께 등록해요.” 기존 수업 중심 흐름을 유지해요.
- `set-lesson-defaults`, `set-students`, `set-messages`는 요청한 새 메뉴 후보용이에요. 현재 설정 구조와 이름이 다르므로 파일을 만들었다고 새 경로를 자동 추가하지 않아요.
- 재생성: 저장소 루트에서 `python design/codex/make-assets.py`를 실행해요. review.md와 validation.md는 덮어쓰지 않아요.
''',encoding='utf-8')
    for path in ROOT.rglob('*.svg'):
        ET.parse(path)
    print(f'{len(ICONS)} icons + {len(ARTS)} illustrations: XML OK')

if __name__ == '__main__':
    main()
