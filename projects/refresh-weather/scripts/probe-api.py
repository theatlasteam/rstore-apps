from pathlib import Path
import subprocess,json
P=Path(__file__).resolve().parent.parent
base='https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.62&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto&wind_speed_unit=ms&forecast_days=7&forecast_hours=24'
for name,url in [('forecast',base),('geocoding','https://geocoding-api.open-meteo.com/v1/search?name=Moscow&count=3&language=ru&format=json')]:
 p=P/'research'/(name+'.json');subprocess.run(['curl','-fsSL','--connect-timeout','8','--max-time','25',url,'-o',str(p)],check=True);r=json.loads(p.read_text());assert not r.get('error');print(name,p.stat().st_size,'bytes',flush=True)
 if name=='forecast':assert len(r['daily']['time'])==7;assert len(r['hourly']['time'])==24;print('PASS current + 24 hours + 7 days; timezone',r['timezone'],flush=True)
 else:assert r['results'];print('PASS public city search',flush=True)
