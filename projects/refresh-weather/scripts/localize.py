from pathlib import Path
import json
P=Path(__file__).resolve().parent.parent
d={lang:json.loads((P/'app/locales'/f'{lang}.json').read_text()) for lang in ['ru','en']}
assert d['ru'].keys()==d['en'].keys()
(P/'app/l10n.js').write_text('window.WEATHER_STRINGS='+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n')
print('Locales:',len(d['ru']),'messages each')
