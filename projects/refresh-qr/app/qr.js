/* Compact ES5 QR Code Matrix Generator (Byte mode, EC Level L, Versions 1-6). */
(function(global){
 'use strict';
 var EXP=new Array(512),LOG=new Array(256);
 (function(){
  var x=1;
  for(var i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=285;}
  for(i=255;i<512;i++)EXP[i]=EXP[i-255];
 })();
 function gfMul(a,b){return (a===0||b===0)?0:EXP[LOG[a]+LOG[b]];}
 function rsGen(deg){
  var p=[1];
  for(var i=0;i<deg;i++){
   var next=new Array(p.length+1);for(var k=0;k<next.length;k++)next[k]=0;
   var f=EXP[i];
   for(var j=0;j<p.length;j++){next[j]^=p[j];next[j+1]^=gfMul(p[j],f);}
   p=next;
  }
  return p;
 }
 function rsEncode(data,ecLen){
  var gen=rsGen(ecLen),res=data.slice();
  for(var i=0;i<ecLen;i++)res.push(0);
  for(i=0;i<data.length;i++){
   var coef=res[i];
   if(coef!==0)for(var j=1;j<gen.length;j++)res[i+j]^=gfMul(gen[j],coef);
  }
  return res.slice(data.length);
 }
 // Version 1..6 Level L: [totalCodewords, ecPerBlock, blocks, alignPositions]
 var SPECS=[
  null,
  [19,7,1,[]],
  [34,10,1,[6,18]],
  [55,15,1,[6,22]],
  [80,20,1,[6,26]],
  [108,26,1,[6,30]],
  [136,18,2,[6,34]]
 ];
 function utf8Bytes(str){
  var out=[];
  for(var i=0;i<str.length;i++){
   var c=str.charCodeAt(i);
   if(c<128)out.push(c);
   else if(c<2048){out.push(192|(c>>6),128|(c&63));}
   else{out.push(224|(c>>12),128|((c>>6)&63),128|(c&63));}
  }
  return out;
 }
 function makeMatrix(text){
  var bytes=utf8Bytes(text);
  var ver=0;
  for(var v=1;v<=6;v++){if(bytes.length+2<=SPECS[v][0]){ver=v;break;}}
  if(!ver)throw new Error('Text too long (max ~134 bytes)');
  var spec=SPECS[ver],totalData=spec[0],ecPer=spec[1],blocks=spec[2],align=spec[3];
  var size=17+ver*4;
  var bits=[];
  function pushBits(val,len){for(var b=len-1;b>=0;b--)bits.push((val>>b)&1);}
  pushBits(4,4); // Byte mode
  pushBits(bytes.length,8);
  for(var i=0;i<bytes.length;i++)pushBits(bytes[i],8);
  while(bits.length<totalData*8&&bits.length%8!==0)bits.push(0);
  var cw=[];
  for(i=0;i<bits.length;i+=8){
   var b=0;for(var k=0;k<8;k++)b=(b<<1)|(bits[i+k]||0);
   cw.push(b);
  }
  var padBytes=[236,17],pi=0;
  while(cw.length<totalData){cw.push(padBytes[pi%2]);pi++;}
  var finalCw=[];
  if(blocks===1){
   finalCw=cw.concat(rsEncode(cw,ecPer));
  }else{
   var half=totalData/2,b1=cw.slice(0,half),b2=cw.slice(half);
   var e1=rsEncode(b1,ecPer),e2=rsEncode(b2,ecPer);
   for(i=0;i<half;i++){finalCw.push(b1[i],b2[i]);}
   for(i=0;i<ecPer;i++){finalCw.push(e1[i],e2[i]);}
  }
  var m=[],res=[];
  for(i=0;i<size;i++){m.push(new Array(size));res.push(new Array(size));}
  function setMod(r,c,v,isRes){m[r][c]=v?1:0;if(isRes)res[r][c]=1;}
  function finder(r,c){
   for(var dr=-1;dr<=7;dr++)for(var dc=-1;dc<=7;dc++){
    var rr=r+dr,cc=c+dc;
    if(rr<0||rr>=size||cc<0||cc>=size)continue;
    var on=(dr>=0&&dr<=6&&dc>=0&&dc<=6)&&(dr===0||dr===6||dc===0||dc===6||(dr>=2&&dr<=4&&dc>=2&&dc<=4));
    setMod(rr,cc,on,true);
   }
  }
  finder(0,0);finder(0,size-7);finder(size-7,0);
  for(i=8;i<size-8;i++){setMod(6,i,i%2===0,true);setMod(i,6,i%2===0,true);}
  setMod(size-8,8,1,true);
  if(align.length){
   var pos=align[1];
   for(var dr=-2;dr<=2;dr++)for(var dc=-2;dc<=2;dc++){
    var on=Math.abs(dr)===2||Math.abs(dc)===2||(dr===0&&dc===0);
    setMod(pos+dr,pos+dc,on,true);
   }
  }
  // Reserve format info
  for(i=0;i<9;i++){if(i!==6){res[8][i]=1;res[i][8]=1;}}
  for(i=size-8;i<size;i++){res[8][i]=1;res[i][8]=1;}
  // Place data bits
  var allBits=[];
  for(i=0;i<finalCw.length;i++)for(var b2=7;b2>=0;b2--)allBits.push((finalCw[i]>>b2)&1);
  var bitIdx=0,dir=-1,col=size-1;
  while(col>0){
   if(col===6)col--;
   for(var row=(dir===-1?size-1:0);row>=0&&row<size;row+=dir){
    for(var dc2=0;dc2<2;dc2++){
     var cc=col-dc2;
     if(!res[row][cc]){
      var bit=bitIdx<allBits.length?allBits[bitIdx++]:0;
      if((row+cc)%2===0)bit^=1; // Mask 0: (r+c)%2==0
      m[row][cc]=bit;
     }
    }
   }
   dir=-dir;col-=2;
  }
  // Format string for EC L (01), Mask 0 (000) -> 111011111000100
  var fmt=[1,1,1,0,1,1,1,1,1,0,0,0,1,0,0];
  for(i=0;i<6;i++){setMod(8,i,fmt[i],true);setMod(size-1-i,8,fmt[i],true);}
  setMod(8,7,fmt[6],true);setMod(size-7,8,fmt[6],true);
  setMod(8,8,fmt[7],true);setMod(8,size-8,fmt[7],true);
  setMod(7,8,fmt[8],true);setMod(8,size-7,fmt[8],true);
  for(i=9;i<15;i++){setMod(14-i,8,fmt[i],true);setMod(8,size-15+i,fmt[i],true);}
  return m;
 }
 global.RefreshQR={makeMatrix:makeMatrix};
})(window);
