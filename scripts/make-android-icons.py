"""
앱 아이콘(public/icon-512.png)으로 안드로이드 런처 아이콘과 시작 화면을 만듭니다.
  - mipmap-*/ic_launcher.png, ic_launcher_round.png   둥근 네모, 동그라미 (예전 안드로이드)
  - mipmap-*/ic_launcher_foreground.png                적응형 아이콘 앞면. 그림을 안전 영역(가운데 66%) 안에 둡니다.
  - values/ic_launcher_background.xml                  적응형 아이콘 바탕색 (흰색, 아이콘 그림의 바탕과 같음)
  - drawable*/splash.png                               시작 화면: 따뜻한 회색 바탕 가운데에 아이콘

정식 아이콘을 받으면 public/icon-512.png를 바꾸고 다시 실행합니다: python scripts/make-android-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public' / 'icon-512.png'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

BACKGROUND = '#FFFFFF'
SPLASH_BG = (246, 245, 242)  # styles.css의 --bg

LAUNCHER = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FOREGROUND = {name: size * 108 // 48 for name, size in LAUNCHER.items()}
SPLASH = {'mdpi': (320, 480), 'hdpi': (480, 800), 'xhdpi': (720, 1280), 'xxhdpi': (960, 1600), 'xxxhdpi': (1280, 1920)}


def rounded(image, radius_ratio):
    """모서리를 둥글게 자릅니다. radius_ratio 0.5면 동그라미"""
    size = image.size[0]
    scale = 4  # 경계를 부드럽게 하려고 크게 그려서 줄입니다.
    mask = Image.new('L', (size * scale, size * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * scale - 1, size * scale - 1), radius=int(size * scale * radius_ratio), fill=255)
    out = Image.new('RGBA', image.size, (0, 0, 0, 0))
    out.paste(image, (0, 0), mask.resize(image.size, Image.LANCZOS))
    return out


def main():
    icon = Image.open(SOURCE).convert('RGBA')
    white = Image.new('RGBA', icon.size, BACKGROUND)
    white.alpha_composite(icon)

    for name, size in LAUNCHER.items():
        folder = RES / f'mipmap-{name}'
        folder.mkdir(parents=True, exist_ok=True)
        tile = white.resize((size, size), Image.LANCZOS)
        rounded(tile, 0.22).save(folder / 'ic_launcher.png')
        rounded(tile, 0.5).save(folder / 'ic_launcher_round.png')

    for name, size in FOREGROUND.items():
        # 앞면은 108dp 가운데 72dp가 늘 보이고, 기기에 따라 동그라미(지름 66dp)로 잘립니다. 그림을 66dp 안에 넣습니다.
        inner = round(size * 66 / 108)
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        offset = (size - inner) // 2
        canvas.alpha_composite(icon.resize((inner, inner), Image.LANCZOS), (offset, offset))
        canvas.save(RES / f'mipmap-{name}' / 'ic_launcher_foreground.png')

    (RES / 'values' / 'ic_launcher_background.xml').write_text(
        f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{BACKGROUND}</color>\n</resources>\n',
        encoding='utf-8',
    )

    def splash(width, height):
        canvas = Image.new('RGB', (width, height), SPLASH_BG)
        side = round(min(width, height) * 0.36)
        logo = rounded(white.resize((side, side), Image.LANCZOS), 0.22)
        canvas.paste(logo, ((width - side) // 2, (height - side) // 2), logo)
        return canvas

    for name, (width, height) in SPLASH.items():
        splash(width, height).save(RES / f'drawable-port-{name}' / 'splash.png')
        splash(height, width).save(RES / f'drawable-land-{name}' / 'splash.png')
    splash(480, 800).save(RES / 'drawable' / 'splash.png')
    print('안드로이드 아이콘과 시작 화면을 만들었어요:', RES)


if __name__ == '__main__':
    main()
