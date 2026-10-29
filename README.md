# RStore Apps

Community app packages served by RStore for rooted KaiOS 2.x devices.

This repository stores the catalog and the actual downloadable packages. RStore's Cloudflare Worker reads this catalog and serves these packages. The phone's local installer registers them with KaiOS; downloading a ZIP alone is not reported as installation.

## Initial catalog

- 10000h: skill practice tracker (Jan Michalak, WTFPL).
- Users Tetris (upstream authors listed in the included MIT license).

Each `apps/<id>/` contains the unchanged inner `application.zip`, extracted manifest, upstream license, source URLs and SHA-256 digest. The OmniSD wrapper is removed; application code is not modified. Upstream applications retain their original licenses. A license allowing redistribution is required before a package is added.

## Compatibility and trust

KaiOS 2.x only. Community software is not security-audited. Package validation does not prove runtime compatibility. `runtimeTested` remains false until a real device test succeeds. No paid/proprietary binaries, root tools or certified system apps are mirrored. Updates are reviewed and committed; the catalog does not automatically ingest arbitrary third-party uploads.

See `catalog.json` for the machine-readable catalog.
