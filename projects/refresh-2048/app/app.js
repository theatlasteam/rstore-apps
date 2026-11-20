(function(){
 'use strict';
 var UI=window.RefreshUI;
 var KEY='refresh.2048.v1';
 var saved=UI.loadJSON(KEY,null);
 var grid,score=0,best=(saved&&saved.best)||0,prev=null;

 function emptyGrid(){return [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];}
 function cloneGrid(g){return g.map(function(r){return r.slice();});}
 function spawn(g){
  var free=[];
  for(var r=0;r<4;r++)for(var c=0;c<4;c++)if(!g[r][c])free.push([r,c]);
  if(!free.length)return;
  var pick=free[Math.floor(Math.random()*free.length)];
  g[pick[0]][pick[1]]=Math.random()<0.9?2:4;
 }
 function newGame(){grid=emptyGrid();score=0;prev=null;spawn(grid);spawn(grid);save();render();}
 function save(){UI.saveJSON(KEY,{grid:grid,score:score,best:best});}
 function slideRow(row){
  var arr=row.filter(function(x){return x>0;}),gained=0;
  for(var i=0;i<arr.length-1;i++){
   if(arr[i]===arr[i+1]){arr[i]*=2;gained+=arr[i];arr.splice(i+1,1);}
  }
  while(arr.length<4)arr.push(0);
  return {row:arr,gained:gained};
 }
 function move(dir){
  var next=cloneGrid(grid),moved=false,gained=0;
  function getLine(i){
   var line=[];
   for(var j=0;j<4;j++){
    if(dir==='left')line.push(next[i][j]);
    else if(dir==='right')line.push(next[i][3-j]);
    else if(dir==='up')line.push(next[j][i]);
    else line.push(next[3-j][i]);
   }
   return line;
  }
  function setLine(i,line){
   for(var j=0;j<4;j++){
    var r=(dir==='left'||dir==='right')?i:(dir==='up'?j:3-j);
    var c=(dir==='left')?j:(dir==='right'?3-j:i);
    if(next[r][c]!==line[j])moved=true;
    next[r][c]=line[j];
   }
  }
  for(var i=0;i<4;i++){
   var res=slideRow(getLine(i));
   gained+=res.gained;
   setLine(i,res.row);
  }
  if(!moved)return;
  prev={grid:cloneGrid(grid),score:score};
  grid=next;score+=gained;
  if(score>best)best=score;
  spawn(grid);save();render();
 }
 function undo(){
  if(!prev){UI.notice(UI.tr('Nothing to undo','Нечего отменять'));return;}
  grid=prev.grid;score=prev.score;prev=null;save();render();
 }
 function render(){
  UI.setTitle('2048',String(score));
  var h='<div class="card" style="display:flex;justify-content:space-between"><span>'+UI.tr('Score','Счёт')+': <strong>'+score+'</strong></span><span>'+UI.tr('Best','Рекорд')+': <strong>'+best+'</strong></span></div>';
  h+='<div class="board">';
  for(var r=0;r<4;r++)for(var c=0;c<4;c++){
   var v=grid[r][c];
   var cls='tile'+(v?' nz':'')+(v>=64?' hi':'');
   h+='<div class="'+cls+'" style="font-size:'+(v>=1024?13:16)+'px">'+(v||'')+'</div>';
  }
  h+='</div><p class="hint" style="text-align:center;margin-top:8px">'+UI.tr('Use D-pad to slide tiles','Используйте крестовину')+'</p>';
  UI.byId('main').innerHTML=h;
  UI.setSoftkeys(
   UI.tr('New','Новая'),newGame,
   '',null,
   UI.tr('Undo','Отмена'),undo
  );
  UI.byId('main').focus();
 }
 UI.installKeys(function(e){
  if(e.key==='ArrowLeft'){e.preventDefault();move('left');return true;}
  if(e.key==='ArrowRight'){e.preventDefault();move('right');return true;}
  if(e.key==='ArrowUp'){e.preventDefault();move('up');return true;}
  if(e.key==='ArrowDown'){e.preventDefault();move('down');return true;}
  return false;
 });
 if(saved&&saved.grid){grid=saved.grid;score=saved.score||0;render();}else newGame();
})();
