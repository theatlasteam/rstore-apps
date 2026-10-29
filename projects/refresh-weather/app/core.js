/* Pure ES5 weather logic, compatible with Gecko 48. */
(function(g){'use strict';
 function finite(v){return typeof v==='number'&&isFinite(v);}
 function coordinate(lat,lon){return finite(lat)&&finite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;}
 function rounded(v){return Math.round(v*100)/100;}
 function number(v,d){return finite(v)?v.toFixed(d||0):'—';}
 function temperature(v,u){return finite(v)?Math.round(u==='f'?v*9/5+32:v)+'°':'—';}
 function condition(code,day){var key='unknown',icon='cloudy';
  if(code===0){key='clear';icon=day?'sunny':'clear_night';}
  else if(code===1){key='mostly';icon=day?'mostly_sunny':'mostly_clear_night';}
  else if(code===2){key='partly';icon=day?'partly_cloudy':'partly_cloudy_night';}
  else if(code===3){key='cloudy';}
  else if(code===45||code===48){key='fog';}
  else if(code===51||code===53||code===55){key='drizzle';icon='drizzle';}
  else if(code===56||code===57||code===66||code===67){key='freezing';icon='icy';}
  else if(code===61||code===63){key='rainy';icon='drizzle';}
  else if(code===65){key='heavyRain';icon='heavy_rain';}
  else if(code===71||code===73||code===77||code===85){key='snow';icon='flurries';}
  else if(code===75||code===86){key='heavySnow';icon='heavy_snow';}
  else if(code===80||code===81||code===82){key='showers';icon=code===82?'heavy_rain':'drizzle';}
  else if(code===95||code===97){key='thunder';icon='strong_thunderstorms';}
  else if(code===96||code===99){key='hail';icon='strong_thunderstorms';}
  return {key:key,icon:icon};
 }
 function url(loc){if(!coordinate(loc.lat,loc.lon))throw new Error('invalid');return 'https://api.open-meteo.com/v1/forecast?latitude='+loc.lat+'&longitude='+loc.lon+'&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto&wind_speed_unit=ms&forecast_days=7&forecast_hours=24';}
 function validate(r){
  if(!r||!r.current||!r.daily||!r.hourly||!finite(r.current.temperature_2m)||typeof r.current.time!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(r.current.time))throw new Error('invalid');
  function arrays(obj,keys,max){if(!Array.isArray(obj.time)||!obj.time.length||obj.time.length>max)throw new Error('invalid');keys.forEach(function(k){if(!Array.isArray(obj[k])||obj[k].length!==obj.time.length)throw new Error('invalid');});}
  arrays(r.daily,['weather_code','temperature_2m_max','temperature_2m_min','sunrise','sunset','uv_index_max','precipitation_probability_max'],16);
  arrays(r.hourly,['temperature_2m','precipitation_probability','weather_code','is_day'],384);return r;
 }
 function hours(d){var cutoff=d.current.time.slice(0,13);return d.hourly.time.map(function(t,i){return {time:t,index:i};}).filter(function(h){return h.time.slice(0,13)>=cutoff;}).slice(0,24);}
 function place(r){if(!r||!coordinate(r.latitude,r.longitude)||typeof r.name!=='string')return null;return {id:'city-'+String(r.id||r.latitude+','+r.longitude),name:r.name,region:[r.admin1,r.country].filter(function(v,i,a){return v&&a.indexOf(v)===i;}).join(', '),lat:r.latitude,lon:r.longitude};}
 function parseCoordinates(text){var a=String(text).split(',');if(a.length!==2||!a[0].trim()||!a[1].trim())return null;var lat=Number(a[0]),lon=Number(a[1]);return coordinate(lat,lon)?{lat:lat,lon:lon}:null;}
 g.WeatherCore={finite:finite,coordinate:coordinate,rounded:rounded,number:number,temperature:temperature,condition:condition,url:url,validate:validate,hours:hours,place:place,parseCoordinates:parseCoordinates};
})(window);
