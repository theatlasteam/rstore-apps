#!/usr/bin/env python3
"""Build, icon-generate, package, and catalog all 12 Refresh apps."""
import hashlib, json, math, shutil, struct, tempfile, time, zipfile, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHARED = ROOT / 'projects' / '_shared'
RUNTIME = ROOT / 'projects' / 'refresh-connect' / 'app' / 'kaios-refresh-v2'
BASE_URL = 'https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/apps/'

APPS = [
    {
        'slug': 'refresh-contacts',
        'name': 'Refresh Contacts',
        'ru_name': 'Refresh Контакты',
        'en_desc': 'Fast contacts manager with search, favorites, speed dial and vCard export.',
        'ru_desc': 'Быстрая книга контактов с поиском, избранным и экспортом в vCard.',
        'category': 'communication',
        'tags': 'refresh;contacts;phonebook;vcard',
        'color': ((46, 134, 222), (24, 90, 175)),
        'glyph': 'person',
    },
    {
        'slug': 'refresh-ai',
        'name': 'Refresh AI',
        'ru_name': 'Refresh AI',
        'en_desc': 'Lightweight AI chat assistant for OpenAI, OpenRouter, Groq and local LLMs.',
        'ru_desc': 'Лёгкий ИИ-ассистент для OpenAI, OpenRouter, Groq и локальных моделей.',
        'category': 'utility',
        'tags': 'refresh;ai;assistant;llm;chat',
        'color': ((124, 92, 230), (74, 48, 168)),
        'glyph': 'spark',
    },
    {
        'slug': 'refresh-notes',
        'name': 'Refresh Notes',
        'ru_name': 'Refresh Заметки',
        'en_desc': 'Fast offline notes with pinning, search, tags and word counter.',
        'ru_desc': 'Быстрые офлайн-заметки с закреплением, поиском и тегами.',
        'category': 'productivity',
        'tags': 'refresh;notes;memo;offline',
        'color': ((230, 154, 40), (186, 110, 18)),
        'glyph': 'lines',
    },
    {
        'slug': 'refresh-calendar',
        'name': 'Refresh Calendar',
        'ru_name': 'Refresh Календарь',
        'en_desc': 'Monthly calendar grid and daily event planner for KaiOS.',
        'ru_desc': 'Месячный календарь и планировщик событий на каждый день.',
        'category': 'productivity',
        'tags': 'refresh;calendar;events;planner',
        'color': ((214, 69, 93), (156, 36, 58)),
        'glyph': 'grid',
    },
    {
        'slug': 'refresh-tasks',
        'name': 'Refresh Tasks',
        'ru_name': 'Refresh Задачи',
        'en_desc': 'GTD to-do checklist with priorities, filters and progress tracking.',
        'ru_desc': 'Список дел с приоритетами, фильтрами и отслеживанием прогресса.',
        'category': 'productivity',
        'tags': 'refresh;tasks;todo;checklist',
        'color': ((38, 166, 118), (20, 118, 82)),
        'glyph': 'check',
    },
    {
        'slug': 'refresh-clock',
        'name': 'Refresh Clock',
        'ru_name': 'Refresh Часы',
        'en_desc': 'World clock, lap stopwatch and countdown timer with presets.',
        'ru_desc': 'Мировое время, секундомер с кругами и таймер обратного отсчёта.',
        'category': 'utility',
        'tags': 'refresh;clock;timer;stopwatch',
        'color': ((52, 152, 219), (32, 102, 168)),
        'glyph': 'clock',
    },
    {
        'slug': 'refresh-calc',
        'name': 'Refresh Calc',
        'ru_name': 'Refresh Калькулятор',
        'en_desc': 'Keypad-native scientific calculator with expression history.',
        'ru_desc': 'Инженерный калькулятор под клавиатуру телефона с историей.',
        'category': 'utility',
        'tags': 'refresh;calculator;math;scientific',
        'color': ((84, 110, 122), (48, 68, 78)),
        'glyph': 'calc',
    },
    {
        'slug': 'refresh-files',
        'name': 'Refresh Files',
        'ru_name': 'Refresh Файлы',
        'en_desc': 'Browse SD card files, preview text and check free storage space.',
        'ru_desc': 'Файловый менеджер SD-карты с просмотром текста и анализом памяти.',
        'category': 'utility',
        'tags': 'refresh;files;sdcard;manager',
        'color': ((232, 132, 44), (178, 88, 20)),
        'glyph': 'folder',
    },
    {
        'slug': 'refresh-rss',
        'name': 'Refresh RSS',
        'ru_name': 'Refresh RSS',
        'en_desc': 'Fast RSS and Atom news reader with offline cache and custom feeds.',
        'ru_desc': 'Лёгкий RSS/Atom ридер новостей с офлайн-кэшем и своими лентами.',
        'category': 'news',
        'tags': 'refresh;rss;news;atom;reader',
        'color': ((235, 110, 48), (184, 72, 22)),
        'glyph': 'rss',
    },
    {
        'slug': 'refresh-radio',
        'name': 'Refresh Radio',
        'ru_name': 'Refresh Радио',
        'en_desc': 'Ad-free internet radio player with curated streams and custom stations.',
        'ru_desc': 'Интернет-радио без рекламы с подборкой станций и своими потоками.',
        'category': 'media',
        'tags': 'refresh;radio;music;stream',
        'color': ((196, 68, 138), (138, 36, 94)),
        'glyph': 'wave',
    },
    {
        'slug': 'refresh-qr',
        'name': 'Refresh QR',
        'ru_name': 'Refresh QR',
        'en_desc': 'Offline QR code generator for links, Wi-Fi networks and text.',
        'ru_desc': 'Офлайн-генератор QR-кодов для ссылок, Wi-Fi и текста.',
        'category': 'utility',
        'tags': 'refresh;qr;qrcode;wifi;offline',
        'color': ((34, 168, 168), (18, 118, 122)),
        'glyph': 'qr',
    },
    {
        'slug': 'refresh-2048',
        'name': 'Refresh 2048',
        'ru_name': 'Refresh 2048',
        'en_desc': 'Classic 2048 sliding tile puzzle with D-pad controls, undo and high score.',
        'ru_desc': 'Классическая головоломка 2048 с управлением крестовиной, отменой хода и рекордом.',
        'category': 'games',
        'tags': 'refresh;2048;puzzle;games',
        'color': ((224, 152, 46), (174, 104, 22)),
        'glyph': 'tiles',
    },
]


def png_chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)


def in_glyph(glyph, nx, ny):
    """Return True if normalized coord (nx, ny in [-1, 1]) is part of white glyph."""
    if glyph == 'person':
        head = (nx * nx + (ny + 0.25) ** 2) < 0.065
        body = (ny > 0.05 and ny < 0.55) and ((nx / 0.42) ** 2 + ((ny - 0.55) / 0.45) ** 2 < 1.0)
        return head or body
    if glyph == 'spark':
        d1 = abs(nx) * 2.2 + abs(ny) < 0.65
        d2 = abs(ny) * 2.2 + abs(nx) < 0.65
        return d1 or d2
    if glyph == 'lines':
        box = abs(nx) < 0.45 and abs(ny) < 0.52
        cut = (abs(nx) < 0.30) and (abs(ny + 0.24) < 0.05 or abs(ny) < 0.05 or abs(ny - 0.24) < 0.05)
        return box and not cut
    if glyph == 'grid':
        top = abs(nx) < 0.48 and -0.48 < ny < -0.22
        dots = abs(nx) < 0.48 and -0.14 < ny < 0.48 and (abs((nx + 0.48) % 0.32 - 0.16) < 0.09) and (abs((ny + 0.14) % 0.31 - 0.15) < 0.09)
        return top or dots
    if glyph == 'check':
        seg1 = (-0.42 < nx < -0.05) and abs((ny - 0.05) - (nx + 0.35) * 1.1) < 0.10
        seg2 = (-0.10 < nx < 0.45) and abs((ny - 0.32) + (nx + 0.05) * 1.25) < 0.10
        return seg1 or seg2
    if glyph == 'clock':
        r = math.hypot(nx, ny)
        ring = 0.42 < r < 0.54
        h1 = abs(nx) < 0.05 and -0.32 < ny < 0.04
        h2 = abs(ny) < 0.05 and 0.0 < nx < 0.28
        return ring or h1 or h2
    if glyph == 'calc':
        outer = abs(nx) < 0.44 and abs(ny) < 0.52
        screen = abs(nx) < 0.32 and -0.40 < ny < -0.18
        keys = abs(nx) < 0.32 and -0.06 < ny < 0.40 and (abs((nx + 0.32) % 0.22 - 0.11) < 0.065) and (abs((ny + 0.06) % 0.22 - 0.11) < 0.065)
        return outer and not screen and not keys
    if glyph == 'folder':
        tab = -0.50 < nx < -0.05 and -0.42 < ny < -0.22
        body = abs(nx) < 0.50 and -0.24 < ny < 0.40
        return tab or body
    if glyph == 'rss':
        dx, dy = nx + 0.38, 0.38 - ny
        if dx < 0 or dy < 0:
            return False
        r = math.hypot(dx, dy)
        return r < 0.14 or (0.36 < r < 0.48) or (0.66 < r < 0.78)
    if glyph == 'wave':
        bars = [(-0.36, 0.22), (-0.12, 0.48), (0.12, 0.34), (0.36, 0.20)]
        for bx, bh in bars:
            if abs(nx - bx) < 0.07 and abs(ny) < bh:
                return True
        return False
    if glyph == 'qr':
        q1 = -0.46 < nx < -0.12 and -0.46 < ny < -0.12
        q2 = 0.12 < nx < 0.46 and -0.46 < ny < -0.12
        q3 = -0.46 < nx < -0.12 and 0.12 < ny < 0.46
        q4 = 0.16 < nx < 0.42 and 0.16 < ny < 0.42
        return q1 or q2 or q3 or q4
    if glyph == 'tiles':
        return (abs(nx) < 0.44 and abs(ny) < 0.44) and (abs(nx) > 0.05 and abs(ny) > 0.05)
    return False


def render_icon_png(size, c1, c2, glyph):
    rows = []
    rad = size * 0.22
    half = size / 2.0
    inner = half - rad
    for y in range(size):
        row = bytearray([0])
        t = y / max(1, size - 1)
        br = int(c1[0] * (1 - t) + c2[0] * t)
        bg = int(c1[1] * (1 - t) + c2[1] * t)
        bb = int(c1[2] * (1 - t) + c2[2] * t)
        ny = (y + 0.5 - half) / half
        for x in range(size):
            dx = max(0.0, abs(x + 0.5 - half) - inner)
            dy = max(0.0, abs(y + 0.5 - half) - inner)
            dist = math.hypot(dx, dy) - rad
            if dist > 0.7:
                row.extend((0, 0, 0, 0))
                continue
            alpha = 255 if dist < -0.7 else int(max(0, min(255, (0.7 - dist) / 1.4 * 255)))
            nx = (x + 0.5 - half) / half
            if in_glyph(glyph, nx, ny):
                row.extend((255, 255, 255, alpha))
            else:
                row.extend((br, bg, bb, alpha))
        rows.append(bytes(row))
    raw = b''.join(rows)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', ihdr) + png_chunk(b'IDAT', zlib.compress(raw, 9)) + png_chunk(b'IEND', b'')


def build_all():
    catalog_path = ROOT / 'catalog.json'
    catalog = json.loads(catalog_path.read_text())
    new_slugs = {a['slug'] for a in APPS}
    kept = [a for a in catalog['apps'] if a['slug'] not in new_slugs]

    for spec in APPS:
        slug = spec['slug']
        proj_app = ROOT / 'projects' / slug / 'app'
        out_dir = ROOT / 'apps' / slug
        out_dir.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory() as tmp:
            pkg_root = Path(tmp) / 'app'
            shutil.copytree(proj_app, pkg_root)
            shutil.copyfile(SHARED / 'refresh-ui.css', pkg_root / 'refresh-ui.css')
            shutil.copyfile(SHARED / 'refresh-ui.js', pkg_root / 'refresh-ui.js')
            shutil.copyfile(SHARED / 'LICENSE', pkg_root / 'LICENSE')
            shutil.copyfile(SHARED / 'THIRD-PARTY-NOTICES', pkg_root / 'THIRD-PARTY-NOTICES')
            shutil.copytree(RUNTIME, pkg_root / 'kaios-refresh-v2')

            icons_dir = pkg_root / 'icons'
            icons_dir.mkdir(exist_ok=True)
            c1, c2 = spec['color']
            for sz in (56, 112, 128):
                png = render_icon_png(sz, c1, c2, spec['glyph'])
                (icons_dir / f'icon-{sz}.png').write_bytes(png)
                if sz == 128:
                    (out_dir / 'icon.png').write_bytes(png)

            zip_path = out_dir / 'application.zip'
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
                for f in sorted(pkg_root.rglob('*')):
                    if f.is_file():
                        info = zipfile.ZipInfo(f.relative_to(pkg_root).as_posix(), (2026, 11, 20, 0, 0, 0))
                        info.compress_type = zipfile.ZIP_DEFLATED
                        info.external_attr = 0o644 << 16
                        z.writestr(info, f.read_bytes())

        data = (out_dir / 'application.zip').read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        manifest = json.loads((proj_app / 'manifest.webapp').read_text())

        shutil.copyfile(proj_app / 'manifest.webapp', out_dir / 'manifest.webapp')
        shutil.copyfile(SHARED / 'LICENSE', out_dir / 'LICENSE')
        shutil.copyfile(SHARED / 'THIRD-PARTY-NOTICES', out_dir / 'THIRD-PARTY-NOTICES')

        source = {
            'upstream': f'https://github.com/theatlasteam/rstore-apps/tree/main/projects/{slug}',
            'upstreamLicense': 'https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/projects/_shared/LICENSE',
            'sha256': sha,
            'packageBytes': len(data),
            'licenseNotes': 'MIT for app code; shared KaiOS Refresh runtime and bundled fonts retain their licences.',
        }
        (out_dir / 'source.json').write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')

        base = BASE_URL + slug + '/'
        kept.append({
            'slug': slug,
            'name': spec['name'],
            'description': spec['en_desc'],
            'icon': base + 'icon.png',
            'git_repo': f'https://github.com/theatlasteam/rstore-apps/tree/main/projects/{slug}',
            'download': {
                'url': base + 'application.zip',
                'manifest': base + 'manifest.webapp',
            },
            'type': 'privileged',
            'license': 'MIT (code); bundled fonts retain their licences',
            'author': ['Atlas Messenger'],
            'maintainer': ['Atlas Messenger'],
            'has_ads': False,
            'has_tracking': False,
            'meta': {
                'tags': spec['tags'],
                'categories': [spec['category']],
            },
            'screenshots': [],
            'sha256': sha,
            'packageBytes': len(data),
            'version': manifest['version'],
            'permissions': list(manifest.get('permissions', {}).keys()),
            'runtimeTested': False,
            'requiresRoot': False,
            'manualOnly': False,
            'installSupported': True,
            'locales': {
                'ru': {
                    'name': spec['ru_name'],
                    'description': spec['ru_desc'],
                },
                'en': {
                    'description': spec['en_desc'],
                },
            },
        })
        print(f'Built {slug}: {len(data)} bytes, sha256={sha[:12]}...')

    catalog['apps'] = kept
    catalog['generated_at'] = int(time.time())
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(f'Updated catalog.json with {len(kept)} total apps.')


if __name__ == '__main__':
    build_all()
