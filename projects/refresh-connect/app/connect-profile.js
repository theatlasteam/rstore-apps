/* Strict, local VLESS/REALITY/TCP import. Never log or persist the original URI. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RefreshProfile=factory();})(this,function(){'use strict';
 function fail(){throw new Error('unsupported_profile');}
 function dec(s){try{return decodeURIComponent(s.replace(/\+/g,'%20'));}catch(e){fail();}}
 function parse(uri){
  if(typeof uri!=='string'||uri.length>4096)fail();
  var m=/^vless:\/\/([^@/?#]+)@(\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.-]+):(\d{1,5})\?([^#]*)(?:#([^\r\n]*))?$/.exec(uri.trim());if(!m)fail();
  var uuid=dec(m[1]),host=m[2].replace(/^\[|\]$/g,''),port=Number(m[3]),q=Object.create(null);
  m[4].split('&').forEach(function(part){var at=part.indexOf('=');if(at<1)fail();var k=dec(part.slice(0,at)),v=dec(part.slice(at+1));if(Object.prototype.hasOwnProperty.call(q,k))fail();q[k]=v;});
  var allowed=['security','type','encryption','sni','pbk','sid','fp','flow','spx','headerType'];Object.keys(q).forEach(function(k){if(allowed.indexOf(k)<0)fail();});
  if(q.security!=='reality'||['tcp','raw'].indexOf(q.type)<0||(q.encryption&&q.encryption!=='none')||(q.headerType&&q.headerType!=='none'))fail();
  if(!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)||!host||host.length>253||port<1||port>65535)fail();
  if(!/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?$/.test(q.sni||'')||!/^[A-Za-z0-9_-]{43}$/.test(q.pbk||''))fail();
  if(!/^(?:[a-fA-F0-9]{2}){0,8}$/.test(q.sid||''))fail();
  var fp=q.fp||'chrome',flow=q.flow||'',spx=q.spx||'/';
  if(['chrome','firefox','safari','ios','android','edge','random','randomized'].indexOf(fp)<0||['','xtls-rprx-vision'].indexOf(flow)<0||spx.length>256||/[^/a-zA-Z0-9._~!$&'()*+,;=:@%?-]/.test(spx)||spx.charAt(0)!=='/')fail();
  return {server:host,port:port,uuid:uuid.toLowerCase(),sni:q.sni,publicKey:q.pbk,shortId:(q.sid||'').toLowerCase(),fingerprint:fp,flow:flow,spiderX:spx};
 }
 return {parse:parse};
});
