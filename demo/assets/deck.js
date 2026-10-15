(function(){
  var NS='http://www.w3.org/2000/svg';
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var n=slides.length, cur=0;
  var bar=document.getElementById('bar'), count=document.getElementById('count'), hint=document.getElementById('hint');
  function pad(x){return (x<10?'0':'')+x;}

  /* demo map: build signs and cones */
  function el(tag,attrs,parent){var e=document.createElementNS(NS,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);parent&&parent.appendChild(e);return e;}
  var signs=document.getElementById('signs');
  if(signs){[70,160,250].forEach(function(x,i){
    var g=el('g',{transform:'translate('+x+' 366)'},signs);
    var inner=el('g',{'class':'a pop',style:'--d:'+(3.9+i*.3).toFixed(2)+'s'},g);
    el('line',{x1:0,y1:-30,x2:0,y2:-14,stroke:'#bbb','stroke-width':3},inner);
    el('path',{d:'M0 -16L16 0 0 16 -16 0z',fill:'#FF6A00',stroke:'#111','stroke-width':2.5},inner);
    el('path',{d:'M0 -11L11 0 0 11 -11 0z',fill:'none',stroke:'#111','stroke-width':1.2},inner);
  });}
  var cones=document.getElementById('cones');
  if(cones){
    var pts=[],i;
    for(i=0;i<7;i++){pts.push([392+i*(530-392)/6, 324-i*(324-297)/6]);}
    for(i=0;i<11;i++){pts.push([556+i*25,297]);}
    pts.push([832,304],[858,314],[884,324]);
    pts.forEach(function(p,k){
      var g=el('g',{transform:'translate('+p[0].toFixed(1)+' '+p[1].toFixed(1)+')'},cones);
      var c=el('g',{'class':'a pop c',style:'--d:'+(4.8+k*.06).toFixed(2)+'s'},g);
      el('circle',{r:7.5,fill:'#FF6A00',stroke:'#111','stroke-width':1.5},c);
      el('circle',{r:3.4,fill:'#fff'},c);
    });
  }

  function go(i,instant){
    i=Math.max(0,Math.min(n-1,i));
    slides.forEach(function(s,k){s.classList.toggle('active',k===i);s.classList.toggle('prev',k<i);});
    cur=i;
    bar.style.width=((i+1)/n*100)+'%';
    count.innerHTML='<b>'+pad(i+1)+'</b> / '+n;
    if(history.replaceState)history.replaceState(null,'','#'+(i+1));
    if(i>0&&hint)hint.classList.add('hide');
  }
  function next(){go(cur+1);} function prev(){go(cur-1);}
  document.getElementById('next').addEventListener('click',function(e){e.stopPropagation();next();});
  document.getElementById('prev').addEventListener('click',function(e){e.stopPropagation();prev();});
  var rp=document.getElementById('replay');
  if(rp)rp.addEventListener('click',function(e){e.stopPropagation();var s=rp.closest('.slide');s.classList.remove('active');void s.offsetWidth;s.classList.add('active');});
  [].slice.call(document.querySelectorAll('.replay[data-replay]')).forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();var s=b.closest('.slide');s.classList.remove('active');void s.offsetWidth;s.classList.add('active');});});
  document.addEventListener('keydown',function(e){
    if(['ArrowRight','ArrowDown','PageDown',' ','Enter'].indexOf(e.key)>-1){e.preventDefault();next();}
    else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].indexOf(e.key)>-1){e.preventDefault();prev();}
    else if(e.key==='Home'){go(0);} else if(e.key==='End'){go(n-1);}
  });
  var touched=false;
  document.getElementById('deck').addEventListener('click',function(e){
    if(touched){touched=false;return;}
    if(e.target.closest('a,button'))return;
    if(e.clientX<window.innerWidth*0.2)prev();else next();
  });
  var sx=0,sy=0,st=0;
  document.addEventListener('touchstart',function(e){var t=e.changedTouches[0];sx=t.clientX;sy=t.clientY;st=Date.now();},{passive:true});
  document.addEventListener('touchend',function(e){
    var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2){touched=true;setTimeout(function(){touched=false;},400);if(dx<0)next();else prev();}
    else if(Math.abs(dy)>60&&Math.abs(dy)>Math.abs(dx)*1.5){touched=true;setTimeout(function(){touched=false;},400);if(dy<0)next();else prev();}
  },{passive:true});
  var h=parseInt((location.hash||'').replace('#',''),10);
  go(isNaN(h)?0:h-1);
  setTimeout(function(){hint&&hint.classList.add('hide');},6000);
})();

/* story timeline: captions + scene beats, optional voiceover sync */
(function(){
  var st=document.getElementById('story'); if(!st) return;
  var slide=st.closest('.slide'), cap=document.getElementById('storyCaption');
  var cues=[].slice.call(slide.querySelectorAll('.cues li')).map(function(li){return {s:+li.dataset.start,e:+li.dataset.end,vs:+(li.dataset.voStart||li.dataset.start),ve:+(li.dataset.voEnd||li.dataset.end),b:li.dataset.beat,t:li.textContent};});
  var beats=[].slice.call(slide.querySelectorAll('.beats li'));
  var events=[[0,'b1'],[1.0,'warn'],[4.5,'b2'],[5.6,'drag'],[7.4,'push'],[9.0,'b3'],[9.4,'send'],[10.6,'office'],[11.9,'notify'],[14.0,'open'],[15.0,'move']];
  var all=events.map(function(e){return e[1];});
  var vo=document.getElementById('story-vo');
  var t0=0, raf=0, curCue=-1, fired={}, voiced=false;
  /* voiceover timing: the spoken lines run longer than the silent captions, so with sound on the beat times
     are stretched piecewise between cue starts (data-start -> data-vo-start). Sound off keeps the original timing. */
  var last=cues[cues.length-1], knots=[[0,0]].concat(cues.map(function(c){return [c.s,c.vs];}),[[last.e,last.ve]]);
  function vt(x){for(var k=1;k<knots.length;k++){var a=knots[k-1],b=knots[k];if(x<=b[0])return a[1]+(x-a[0])*(b[1]-a[1])/((b[0]-a[0])||1);}return last.ve+(x-last.e);}
  function ET(e){return voiced?vt(e[0]):e[0];} function CS(c){return voiced?c.vs:c.s;} function CE(c){return voiced?c.ve:c.e;}
  function now(){return voiced&&vo&&vo.currentSrc&&!vo.paused? vo.currentTime : (performance.now()-t0)/1000;}
  function reset(){all.forEach(function(c){st.classList.remove(c);});fired={};curCue=-1;cap.textContent='';beats.forEach(function(b){b.classList.remove('on','done');});}
  function tick(){
    var t=now();
    events.forEach(function(e){ if(t>=ET(e)&&!fired[e[1]]){fired[e[1]]=1;st.classList.add(e[1]);
      if(e[1]==='send'){['m1','m2'].forEach(function(id){var m=document.getElementById(id);try{m.beginElement();}catch(x){}});}
      if(e[1]==='b3')st.classList.remove('warn'); }});
    var ci=-1; cues.forEach(function(c,i){if(t>=CS(c)&&t<CE(c))ci=i;});
    if(ci===-1&&t>=CE(last))ci=cues.length-1;
    if(ci!==curCue&&ci>-1){curCue=ci;cap.classList.add('swap');setTimeout(function(){cap.textContent=cues[ci].t;cap.classList.remove('swap');},180);
      beats.forEach(function(b){var n=+b.dataset.beat,cb=+cues[ci].b;b.classList.toggle('on',n===cb);b.classList.toggle('done',n<cb);});}
    if(slide.classList.contains('active')&&t<(voiced?CE(last)+3:20))raf=requestAnimationFrame(tick);
  }
  function start(){cancelAnimationFrame(raf);reset();t0=performance.now();
    voiced=!!(vo&&vo.getAttribute('src')&&window.qrcSound&&window.qrcSound.on);
    if(voiced){try{vo.currentTime=0;var p=vo.play();if(p&&p.catch)p.catch(function(){});}catch(x){}}
    else if(vo&&!vo.paused){try{vo.pause();}catch(x){}}
    raf=requestAnimationFrame(tick);}
  function stop(){cancelAnimationFrame(raf);if(vo&&!vo.paused)vo.pause();reset();}
  new MutationObserver(function(){ if(slide.classList.contains('active')){ if(!st._on){st._on=1;start();} } else { if(st._on){st._on=0;stop();} } }).observe(slide,{attributes:true,attributeFilter:['class']});
  if(slide.classList.contains('active')){st._on=1;start();}
  document.getElementById('storyReplay').addEventListener('click',function(e){e.stopPropagation();start();});
  window.qrcStory={start:start,stop:stop};
  /* cones for the wide shot */
  var g=document.getElementById('sceneCones'),NS='http://www.w3.org/2000/svg';
  var pts=[];for(var i=0;i<6;i++)pts.push([262+i*28,452-i*9]);for(i=0;i<12;i++)pts.push([430+i*28,407]);pts.push([766,420],[790,436],[812,452]);
  pts.forEach(function(p){var u=document.createElementNS(NS,'use');u.setAttribute('href','#cone');u.setAttribute('x',p[0]-10);u.setAttribute('y',p[1]-26);u.setAttribute('width',20);u.setAttribute('height',26);g.appendChild(u);});
})();
