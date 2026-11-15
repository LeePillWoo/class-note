"""산출물 규격과 XML을 확인하고 파일별 크기를 기록해요."""
from pathlib import Path
import xml.etree.ElementTree as ET
import struct

root = Path(__file__).resolve().parent
icons = sorted((root/'icons').glob('*.svg'))
arts = sorted((root/'images').glob('*.svg'))
assert len(icons) == 29 and len(arts) == 5
spec = {'viewBox':'0 0 24 24', 'fill':'none', 'stroke':'currentColor',
        'stroke-width':'1.8', 'stroke-linecap':'round', 'stroke-linejoin':'round'}
for p in icons:
    svg = ET.parse(p).getroot()
    assert svg.tag == '{http://www.w3.org/2000/svg}svg'
    assert all(svg.get(k) == v for k,v in spec.items()), p.name
for p in arts:
    svg = ET.parse(p).getroot()
    w,h = int(svg.get('width')),int(svg.get('height'))
    assert (w,h)==(1024,1024) if p.stem=='app-icon' else max(w,h)<=512
    assert p.stat().st_size <= 150*1024
    assert not any(e.tag.endswith('image') for e in svg.iter())
    if p.stem.startswith('empty-'):
        assert svg.get('viewBox')=='0 0 384 320'
        assert svg.get('style') is None
png=(root/'images/app-icon.png').read_bytes()
assert png[:8]==b'\x89PNG\r\n\x1a\n'
assert struct.unpack('>II',png[16:24])==(1024,1024)
titles=[line for line in (root/'review.md').read_text(encoding='utf-8').splitlines()
        if line.startswith('## ') and line[3:4].isdigit()]
assert len(titles)==10
intro='''# 검증 결과

- SVG 34개 모두 Python ElementTree로 XML 파싱을 통과했어요.
- 메뉴 5개 + 설정 6개 + 동작 13개 + 학원 5개 = 아이콘 29개예요.
- 아이콘 29개 모두 viewBox 0 0 24 24 / fill none / stroke currentColor / stroke-width 1.8 / 둥근 끝·모서리를 확인했어요.
- 빈 화면 그림 4개는 384×320이며 배경 면 없이 투명해요. SVG 5개 모두 외부 비트맵 삽입 없이 직접 그린 경로이고 장당 150KB 이하예요.
- 앱 아이콘 SVG와 PNG 모두 1024×1024예요. PNG는 SVG를 브라우저 Canvas로 렌더한 파일이에요.
- preview.html을 Orca 브라우저로 열고 SVG를 Canvas로 렌더한 preview.png를 직접 확인했어요. 16·20·24px 아이콘에서 잘림과 누락이 없고, 모든 그림이 표시되는 것을 확인했어요.
- 생성형 이미지 도구를 호출하지 않았어요. 비용 여부를 확인할 수 없어 허용된 대안인 직접 그린 SVG로 만들었어요.
- 앱 소스·public·package.json·테스트는 수정하지 않았고 빌드·E2E·git 상태 변경 명령도 실행하지 않았어요. 앱에 CSS 제안을 적용한 뒤의 검증은 남아 있어요.

## 검토서 항목

'''+ '\n'.join('- '+t[3:] for t in titles)+'''

## 파일 목록과 크기

크기는 바이트예요. 이 문서 자체의 크기도 포함해요.

| 파일 | 크기 (bytes) |
|---|---:|
'''
out=root/'validation.md'
if not out.exists(): out.write_text('',encoding='utf-8')
for _ in range(4):
    files=sorted(p for p in root.rglob('*') if p.is_file())
    rows='\n'.join(f'| {p.relative_to(root).as_posix()} | {p.stat().st_size:,} |' for p in files)
    out.write_text(intro+rows+'\n',encoding='utf-8')
print(f'PASS: {len(icons)+len(arts)} SVG XML; 29 icon specs; 5 illustration dimensions; PNG 1024x1024; 10 review items')
for p in files:
    print(f'{p.relative_to(root).as_posix()}\t{p.stat().st_size}')
