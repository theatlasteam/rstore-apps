from pathlib import Path
import subprocess,concurrent.futures,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent.parent
names=['sunny','clear_night','mostly_sunny','mostly_clear_night','partly_cloudy','partly_cloudy_night','cloudy','drizzle','heavy_rain','flurries','heavy_snow','icy','strong_thunderstorms']
def download(n):
 p=P/'app/icons/weather'/(n+'.svg');url='https://raw.githubusercontent.com/mrdarrengriffin/google-weather-icons/7b6464bbf98273d69ae2c2bf8022b9b4ac1981c2/sets/set-6/light/'+n+'.svg'
 subprocess.run(['curl','-fLsS','--retry','1','--connect-timeout','8','--max-time','20',url,'-o',str(p)],check=True)
 root=ET.parse(p).getroot();assert root.tag.endswith('svg');assert not any(x.tag.endswith('script') for x in root.iter());print('ICON',n,p.stat().st_size,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:list(ex.map(download,names))
for n in [56,112,128]:subprocess.run(['rsvg-convert','-w',str(n),'-h',str(n),'-o',str(P/'app/icons'/f'icon-{n}.png'),str(P/'app/icons/launcher.svg')],check=True)
print('PASS 13 upstream weather icons + original launcher PNGs',flush=True)
