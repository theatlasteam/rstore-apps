# Refresh Weather — KaiOS Refresh

An independent, native-style weather application for KaiOS 2.5 / Gecko 48. Not affiliated with KaiOS Technologies or Google.

- No API key or account. Open-Meteo's free endpoint is for non-commercial use; attribution is included in the app.
- Current weather, feels-like, humidity, wind, precipitation probability, UV, sunrise/sunset, 24 hourly forecasts and 7 daily forecasts.
- My location requires an explicit user action and the normal OS geolocation permission. GPS coordinates are rounded to 0.01 degrees before storage or transmission. Denial/timeout leaves manual city selection available.
- Search cities by name, save up to 10, add coordinates, remove saved cities. No preselected personal location.
- Celsius/Fahrenheit, RU/EN, native D-pad and softkeys, bundled forecast icons, last-forecast offline cache and a visible timestamp. No background polling or analytics.
- Coordinates and IP reach Open-Meteo; city queries reach its GeoNames-based geocoder. Open-Meteo's privacy policy states that logs are deleted within 90 days. The application does not promise anonymity.

## Controls
Left softkey: Cities. Center: Refresh/Select. Right: Menu. Left/right arrows: Now / 24 hours / 7 days. Up/down: scroll or focus. Back: return/exit. Add city opens a normal keyboard-compatible input.

## Assets and licences
Our code, UI and original launcher icon are MIT-licensed. Forecast data is CC BY 4.0 (Open-Meteo); city data is GeoNames via Open-Meteo.

Forecast symbols are the requested Google set-6/light from mrdarrengriffin/google-weather-icons, pinned to revision 7b6464bbf98273d69ae2c2bf8022b9b4ac1981c2. Google retains all rights; upstream supplies no open redistribution licence. These SVGs are explicitly excluded from the MIT grant. Review asset rights before public/commercial redistribution. See THIRD-PARTY-NOTICES.txt.

## Build and tests
Run `python3 scripts/localize.py`, `python3 scripts/prepare.py`, `python3 scripts/fetch-assets.py`, then `python3 scripts/package.py`.
For DOM regression tests install jsdom@22 and acorn@8 under tests/tools, then run `node tests/weather.test.cjs`. Tests use saved public-city API fixtures, never the user's real location. No screenshots/visual QA are performed.

### Network fallback (1.0.1)
The phone's network could reach geocoding and the Worker but not api.open-meteo.com. The app tries the direct endpoint, then a small JSON-only Cloudflare fallback after 7 seconds, and remembers the working route. The fallback validates and rounds coordinates to 0.01 degrees, allows only the fixed Open-Meteo request, limits the response to 12 KB and caches for 10 minutes. Cloudflare also receives the IP/rounded coordinates; this is disclosed in-app. RStore package downloads remain direct GitHub.
