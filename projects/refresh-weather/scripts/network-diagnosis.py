from pathlib import Path
import subprocess,concurrent.futures
P=Path(__file__).resolve().parent.parent
urls={'forecast':'https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.62&current=temperature_2m','geocoder':'https://geocoding-api.open-meteo.com/v1/search?name=Moscow&count=1','worker':'https://rstore.holy-voice-dd33.workers.dev/health'}
def check(pair):
 name,url=pair;command='curl --cacert /data/local/rstore/weather-test-ca.pem -4 -sS -L --connect-timeout 5 --max-time 12 -o /data/local/rstore/weather-probe-'+name+'.json -w "HTTP %{http_code}; bytes %{size_download}; time %{time_total}s\\n" "'+url+'"';r=subprocess.run(['adb','shell',command],capture_output=True,text=True,timeout=17);return name,r.returncode,r.stdout.strip(),r.stderr.strip()
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
 for r in ex.map(check,urls.items()):print(*r,flush=True)
