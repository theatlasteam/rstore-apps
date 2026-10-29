# RStore Apps

Community app packages served by RStore for rooted KaiOS 2.x devices.

This repository stores the catalog and the actual downloadable packages. RStore's Cloudflare Worker reads this catalog and serves these packages. The phone's local installer registers them with KaiOS; downloading a ZIP alone is not reported as installation.

## Initial catalog

- 10000h: skill practice tracker (Jan Michalak, WTFPL).
- Users Tetris (upstream authors listed in the included MIT license).

Each `apps/<id>/` contains the unchanged inner `application.zip`, extracted manifest, upstream license, source URLs and SHA-256 digest. The OmniSD wrapper is removed; application code is not modified. Upstream applications retain their original licenses. A license allowing redistribution is required before a package is added.

## Compatibility and trust

KaiOS 2.x only. Community software is not security-audited. Package validation does not prove runtime compatibility. `runtimeTested` remains false until a real device test succeeds. No paid/proprietary binaries are mirrored. Root/certified tools are clearly marked manual-only; the ordinary installer never grants their system permissions. Updates are reviewed and committed; the catalog does not automatically ingest arbitrary third-party uploads.

See `catalog.json` for the machine-readable catalog.


## Cloudflare service

Production API: https://rstore.holy-voice-dd33.workers.dev

- `GET /api/catalog`: RStore catalog, read from this repository.
- `GET /api/app/10000h`: package version, size, permissions and SHA-256.
- `GET /api/package/10000h`: actual installable inner application ZIP.
- `GET /health`: service status.

The source is in `service/`. Deploy from that directory with `bun install` followed by `wrangler deploy` using your own Cloudflare account. No credentials or device installer keys are stored here. Package responses are rejected if their SHA-256 differs from the committed catalog. Only IDs in the catalog are accepted; this is not an arbitrary URL download proxy.

Run `python3 scripts/validate.py` before committing package updates. Device-side installation requires a compatible local installer; this HTTP service does not itself grant system privileges to a browser.


## Phone client

`client/` contains the KaiOS 2.x RStore client, its gold package icon and launcher PNG sizes. The icon derives from the artwork provided for RStore. The UI uses KaiOS-style lists, D-pad navigation and softkeys. The publisher is Atlas Messenger; RStore is independent of KaiOS Technologies.

The public `config.js` deliberately has an empty local-installer key. Installing this source ZIP alone does not grant installation access. Device-specific setup must provision an authenticated local companion; do not publish device keys or personalized packages.


## Localization

RStore 0.1.2 includes Russian and English UI translations in `client/locales/`. `client/l10n.js` bundles these dictionaries for offline startup. The phone language selects the UI language; unsupported languages fall back to English. Catalog entries can provide `locales.<language>.description` and `name`; missing translations fall back to the upstream text. The current two catalog descriptions have Russian translations. Language changes do not interrupt an active installation or confirmation dialog.


## Expanded catalog

Added Wallace Toolbox (Unlicense; manual ZIP/WebIDE installation only), KaiAuth (MIT), Contact Search (MIT), and Users Weather (MIT). Packages are mirrored with original code, permissions, license text, source URLs, SHA-256 and Russian/English descriptions. None is claimed to be runtime-tested on the Nokia 6300. Wallace requests certified permissions and can modify or erase system data; downloading its ZIP is not installation.
