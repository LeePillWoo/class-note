"""
로고 그림(design/logo-source.png)에서 앱에 쓸 그림을 만듭니다.
  - public/brand/witch.png       마녀 전체 그림 (홈 화면 큰 그림). 흰 바탕을 투명하게
  - public/brand/witch-face.png  모자와 얼굴 (위쪽 막대의 로고, 불러오는 화면)
  - public/brand/cat-face.png    고양이 얼굴 (빈 화면 안내). 동그랗게 잘라 쓰므로 흰 바탕 그대로
  - public/icon-192.png, icon-512.png  임시 앱 아이콘 (정식 아이콘은 나중에 따로 만듭니다)

실행: python scripts/make-brand-art.py
"""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'design' / 'logo-source.png'
BRAND = ROOT / 'public' / 'brand'

# 원본에서 그림만 있는 범위 (글자는 뺌). 오른쪽 2px은 화면 캡처 테두리라 쓰지 않습니다.
ART_BOX = (74, 120, 420, 388)
WHITE_MIN = 246  # 세 색이 모두 이 값 이상이면 바탕(흰색)으로 봅니다.


def whiteness(pixel):
    """흰색에서 얼마나 떨어졌는지 (0 = 흰색)"""
    return (255 - pixel[0]) + (255 - pixel[1]) + (255 - pixel[2])


def cut_out(image):
    """가장자리와 이어진 흰 바탕을 투명하게 만들고, 경계는 부드럽게 합니다."""
    rgb = image.convert('RGB')
    width, height = rgb.size
    px = rgb.load()
    is_white = [[min(px[x, y]) >= WHITE_MIN for x in range(width)] for y in range(height)]

    # 가장자리에서 시작해 이어진 흰 픽셀만 바탕으로 봅니다. (눈 흰자, 양말 줄무늬 같은 그림 안의 흰색은 남김)
    background = [[False] * width for _ in range(height)]
    queue = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height or background[y][x] or not is_white[y][x]:
            continue
        background[y][x] = True
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    out = Image.new('RGBA', (width, height))
    out_px = out.load()
    for y in range(height):
        for x in range(width):
            if background[y][x]:
                out_px[x, y] = (255, 255, 255, 0)
                continue
            r, g, b = px[x, y]
            alpha = 255
            touches_background = any(
                0 <= x + dx < width and 0 <= y + dy < height and background[y + dy][x + dx]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if touches_background:
                # 경계 픽셀은 그림 색과 흰색이 섞여 있습니다. 주변에서 가장 진한 그림 색을 찾아 섞인 비율을 구합니다.
                strongest = (r, g, b)
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < width and 0 <= ny < height and not background[ny][nx]:
                            if whiteness(px[nx, ny]) > whiteness(strongest):
                                strongest = px[nx, ny]
                if whiteness(strongest) > 0:
                    ratio = min(1.0, whiteness((r, g, b)) / whiteness(strongest))
                    alpha = max(0, min(255, round(255 * ratio)))
                    r, g, b = strongest
            out_px[x, y] = (r, g, b, alpha)
    return out


def scaled(image, factor):
    """투명한 경계가 지저분해지지 않도록 '미리 곱한 알파'로 바꿔서 키웁니다."""
    size = (round(image.width * factor), round(image.height * factor))
    return image.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def trimmed(image, margin=2):
    box = image.getchannel('A').getbbox()
    box = (max(0, box[0] - margin), max(0, box[1] - margin), min(image.width, box[2] + margin), min(image.height, box[3] + margin))
    return image.crop(box)


def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert('RGB')
    art = cut_out(source.crop(ART_BOX))
    ox, oy = ART_BOX[0], ART_BOX[1]

    witch = trimmed(art)
    scaled(witch, 2).save(BRAND / 'witch.png', optimize=True)

    # 모자와 얼굴: 정사각형으로. 모서리를 둥글게 잘라도 모자 끝이 잘리지 않게 여백을 둡니다.
    face = art.crop((238 - ox, 112 - oy, 404 - ox, 278 - oy))
    scaled(face, 2).save(BRAND / 'witch-face.png', optimize=True)

    # 고양이 얼굴: 다른 그림과 겹쳐 있어 얼굴만 정사각형으로 자릅니다. (화면에서 동그랗게 보여줌)
    cat = source.crop((254, 276, 314, 336))
    cat.resize((cat.width * 3, cat.height * 3), Image.LANCZOS).save(BRAND / 'cat-face.png', optimize=True)

    # 임시 앱 아이콘: 흰 둥근 네모 위에 모자와 얼굴
    for size in (192, 512):
        icon = Image.new('RGBA', (size, size), (255, 255, 255, 255))
        inner = round(size * 0.86)
        mark = face.convert('RGBa').resize((inner, inner), Image.LANCZOS).convert('RGBA')
        icon.alpha_composite(mark, ((size - inner) // 2, (size - inner) // 2))
        icon.convert('RGB').save(ROOT / 'public' / f'icon-{size}.png', optimize=True)

    for name in ('witch.png', 'witch-face.png', 'cat-face.png'):
        with Image.open(BRAND / name) as made:
            print(name, made.size)


if __name__ == '__main__':
    main()
