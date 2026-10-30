#!/usr/bin/env python3
"""Import an original, pinned upstream KaiOS 2.5 build, without executing it.
No user credentials are read, requested, embedded, or printed.
"""
from pathlib import Path, PurePosixPath
import hashlib
import io
import json
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent
spec = json.loads((ROOT / 'imports/telekram.json').read_text())
assert spec['repository'] == 'cyan-2048/solid-telekram'
assert spec['distributionCommit'] == '76d8a02bc8f7735c46a2e894157b57ff6dc4cf44'
assert spec['sourceCommit'] == '69001285bd619cbf30fbe407dedb7bdbd654fb77'
assert spec['packagePath'] == 'v/1.3.0/telekram4kai2.zip'
RAW = 'https://' + 'raw.githubusercontent.com/'
UPSTREAM = 'https://' + 'github.com/' + spec['repository']

def download(url, maximum):
    request = urllib.request.Request(url, headers={'User-Agent': 'RStore-upstream-import/1.0'})
    with urllib.request.urlopen(request, timeout=90) as response:
        assert response.status == 200
        assert urllib.request.urlparse(response.url).scheme == 'https'
        data = response.read(maximum + 1)
    assert len(data) <= maximum, 'Download exceeds size limit'
    return data

package_url = RAW + spec['repository'] + '/' + spec['distributionCommit'] + '/' + spec['packagePath']
package = download(package_url, 12 * 1024 * 1024)
assert len(package) == spec['packageBytes']
digest = hashlib.sha256(package).hexdigest()
with zipfile.ZipFile(io.BytesIO(package)) as archive:
    infos = archive.infolist()
    assert 0 < len(infos) <= 5000
    assert len({item.filename for item in infos}) == len(infos), 'Duplicate archive paths'
    assert sum(item.file_size for item in infos) <= 32 * 1024 * 1024
    for item in infos:
        path = PurePosixPath(item.filename)
        assert not path.is_absolute() and '..' not in path.parts
        assert '\\' not in item.filename and not item.flag_bits & 1
        assert (item.external_attr >> 16) & 0o170000 != 0o120000
    assert archive.testzip() is None
    manifest_bytes = archive.read('manifest.webapp')
    assert len(manifest_bytes) <= 65536
    manifest = json.loads(manifest_bytes)
    assert manifest['version'] == spec['version']
    assert manifest.get('type', 'web') in ('web', 'privileged')
    deny = {'webapps-manage', 'permissions', 'engmode-extension', 'settings', 'power', 'embed-apps'}
    assert not deny.intersection(manifest.get('permissions', {})), 'System privileges are not allowed'
    assert manifest['origin'] == 'app://telekram.cyankindasus.com'
    assert manifest.get('launch_path', '/index.html').split('?')[0].lstrip('/') in archive.namelist()
    icon_path = manifest['icons'].get('112') or manifest['icons'].get('56')
    icon = archive.read(icon_path.lstrip('/'))
    assert icon.startswith(b'\x89PNG\r\n\x1a\n') and len(icon) <= 1024 * 1024

source_base = RAW + spec['repository'] + '/' + spec['sourceCommit'] + '/'
license_bytes = download(source_base + 'LICENSE', 100000)
assert b'GNU GENERAL PUBLIC LICENSE' in license_bytes and b'Version 3' in license_bytes
source_manifest = json.loads(download(source_base + 'src/assets/manifest.webapp', 65536))
assert source_manifest['version'] == spec['version']
source_url = 'https://' + 'codeload.github.com/' + spec['repository'] + '/zip/' + spec['sourceCommit']
source_bytes = download(source_url, 80 * 1024 * 1024)
with zipfile.ZipFile(io.BytesIO(source_bytes)) as source_archive:
    names = source_archive.namelist()
    assert any(name.endswith('/rsbuild.config.ts') for name in names)
    assert any(name.endswith('/bun.lock') for name in names)
    assert any(name.endswith('/LICENSE') for name in names)

folder = ROOT / 'apps' / 'telekram'
folder.mkdir(parents=True, exist_ok=True)
(folder / 'application.zip').write_bytes(package)
(folder / 'manifest.webapp').write_bytes(manifest_bytes)
(folder / 'icon.png').write_bytes(icon)
(folder / 'LICENSE').write_bytes(license_bytes)
(folder / 'source.zip').write_bytes(source_bytes)
public = RAW + 'theatlasteam/rstore-apps/main/apps/telekram/'
provenance = {
    'upstream': UPSTREAM,
    'upstreamPackage': package_url,
    'upstreamLicense': source_base + 'LICENSE',
    'distributionCommit': spec['distributionCommit'],
    'sourceCommit': spec['sourceCommit'],
    'sourceArchive': public + 'source.zip',
    'sourceSha256': hashlib.sha256(source_bytes).hexdigest(),
    'sha256': digest,
    'packageBytes': len(package),
    'modified': False,
    'platform': spec['platform'],
    'runtimeTested': False,
    'notes': 'Original upstream build. Source snapshot has matching manifest version; it has not been independently rebuilt or reproduced. No login or message access tested.'
}
(folder / 'source.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
(folder / 'README.md').write_text(
    '# Telekram 1.3.0 for KaiOS 2.5\n\n'
    'Unofficial Telegram client by Cyan. This is the original upstream KaiOS 2.5 ZIP, without code or credential modifications. It is not a KaiOS 3/4 build.\n\n'
    'License: GNU GPL v3; see LICENSE. Source and build scripts are available in [source.zip](source.zip) and at ' + UPSTREAM + '/tree/' + spec['sourceCommit'] + '. The source snapshot has the same manifest version; RStore has not independently reproduced this binary.\n\n'
    'Install using RStore on a supported phone. This client connects to Telegram; Telegram login and account security remain under the user’s control. RStore does not receive login codes, passwords or chats. This mirror is not an endorsement or a privacy audit. Phone compatibility, sign-in and messaging have not been tested.\n\n'
    'The manifest requests microphone, camera, contacts, SD-card access, notifications and networking. Review permissions before signing in. Upstream app language support is unchanged; only the RStore listing is localized.\n'
)

catalog = json.loads((ROOT / 'catalog.json').read_text())
entry = {
    'slug': 'telekram', 'name': 'Telekram',
    'description': 'Unofficial Telegram client for KaiOS 2.5 by Cyan. Original upstream build; sign-in and messaging have not been tested on this phone.',
    'icon': public + 'icon.png', 'git_repo': UPSTREAM,
    'download': {'url': public + 'application.zip', 'manifest': public + 'manifest.webapp'},
    'type': manifest.get('type', 'web'), 'license': 'GPL-3.0',
    'author': ['Cyan'], 'maintainer': ['RStore (unmodified upstream mirror)'],
    'meta': {'tags': 'telegram; telekram; messenger; kaios 2.5', 'categories': ['social']},
    'screenshots': [], 'sha256': digest, 'packageBytes': len(package),
    'version': manifest['version'], 'permissions': list(manifest.get('permissions', {})),
    'runtimeTested': False, 'requiresRoot': False, 'manualOnly': False, 'installSupported': True,
    'locales': {
        'ru': {'description': 'Неофициальный клиент Telegram для KaiOS 2.5 от Cyan. Оригинальная сборка автора, без изменений. Вход и переписка на этом телефоне ещё не проверены.'},
        'en': {'description': 'Unofficial Telegram client for KaiOS 2.5 by Cyan. Unmodified upstream build; phone sign-in and messaging not yet tested.'}
    },
    'installationNotes': {
        'ru': 'Сборка для KaiOS 2.5, не для KaiOS 3/4. Самому приложению root не нужен. Telegram потребует вход; проверьте разрешения на микрофон, камеру, контакты и SD-карту. Языки интерфейса приложения оставлены авторские.',
        'en': 'KaiOS 2.5 build, not KaiOS 3/4. The app itself does not require root. Telegram sign-in is required; review microphone, camera, contacts and SD-card permissions. Upstream interface languages are unchanged.'
    }
}
catalog['apps'] = [app for app in catalog['apps'] if app['slug'] != 'telekram'] + [entry]
catalog['generated_at'] = int(time.time())
(ROOT / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
print('IMPORTED', entry['slug'], entry['version'], len(package), digest)
