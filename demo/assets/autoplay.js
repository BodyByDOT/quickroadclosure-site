/* QuickRoadClosure auto-play: the deck plays itself on a loop like a social video.
   Starts muted (browsers block sound without a tap); "Tap for sound" turns on narration + music (narration.js) for
   every later loop. Each slide stays for its narration length + ~1 s; the story slide uses its own caption/VO timing.
   Tap/click on the slide pauses/resumes; swipe, arrows and keys jump and auto-play continues from there.
   Captions = the lines in narration-script.md, split by sentence and timed across the clip. */
(function(){
  var D=window.qrcDeck; if(!D) return;
  var slides=D.slides, S=window.qrcSound||{on:false};
  var music=document.getElementById('qrc-music'), voice=document.getElementById('qrc-voice'), svo=document.getElementById('story-vo'), sndBtn=document.getElementById('sound');
  var GAP=1.0;
  /* clip durations (s) from the mp3s; story slide: muted timing ends 17.0 s, voiced 23.36 s */
  var DUR=[6.24,11.616,12.528,11.616,10.152,12.048,13.128,11.688,12.096,null,11.352,8.232,8.952,8.712,12.456,12.048];
  var STORY_MUTED=17.0, STORY_VO=23.36;
  var TXT=[
    "This is QuickRoadClosure. Drop a pin, and get a compliant closure.",
    "Everything for the closure is in one app. Drop a pin, pick your setup, and get the MUTCD Part 6 layout with your state's rules already applied.",
    "Pin it, pick it, set it. Drop a pin, pick the closure, and the app lays out the cones and signs MUTCD Part 6 calls for, locked to the road when you zoom.",
    "Here's a lane closure on Main Street with a flagger. Hit generate, and the advance warning signs, the cone taper and the flagger station land right on the map.",
    "Out on the shoulder, drop a pin right where you're standing. Pick the closure, direction, flagging and detour, then generate the layout.",
    "The Part 6 layout lays right over the map, with your state's rules applied. Then send it: print it, push it to crew phones, or send it to your local contacts.",
    "Hills, curves and brush can hide your signs. The app checks sight lines while you plan, warns you when a sign is too close for the speed, and suggests a fix, like moving it upstream.",
    "Check the sight line before you set it. If a hill crest hides a sign, move it upstream, and once the crew confirms it from the field, everyone gets the change.",
    "Print a copy for the truck, or push it to every crew member's phone, with your contact info attached. Smart highway systems only see your plan if you switch sharing on.",
    null,
    "Keep track of your trucks, signs, cones and crew across every closure. Equipment in the shop is left out, and built-in item costs help you bid the job.",
    "It's for anyone who closes a lane: DOT, counties, utilities, contractors and lineman crews.",
    "Down the road, more roadway work gets added as modules, like pavement cutting, paving, striping and culvert replacement.",
    "Plans will fit every crew, from a single operator to a state DOT. Plans and pricing will be set before launch.",
    "Before you set it up, verify every layout with your local law enforcement and DOT. The layouts in this demo are concept mock-ups, not engineering drawings.",
    "QuickRoadClosure is coming soon, at quickroadclosure.com. Patent pending. Want early access or updates? Get in touch."
  ];
  /* sentence cues, timed by length across the clip (0.25 s lead-in) */
  function cuesFor(i){
    var t=TXT[i], d=DUR[i]; if(!t||!d) return [];
    var out=t.split(/(?<=[.?!])\s+/).filter(Boolean);
    var total=out.reduce(function(a,p){return a+p.length;},0), t0=0.25, span=d-0.35, acc=0;
    return out.map(function(p){var s=t0+span*acc/total; acc+=p.length; return {s:s,e:t0+span*acc/total,t:p};});
  }
  var CUES=slides.map(function(s,i){return cuesFor(i);});

  /* UI: caption bar, Tap-for-sound button, pause indicator */
  var cap=document.createElement('div'); cap.className='apcap'; cap.setAttribute('aria-live','off'); document.body.appendChild(cap);
  var tfs=document.createElement('button'); tfs.type='button'; tfs.className='aptfs';
  tfs.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><span>Tap for sound</span>';
  tfs.setAttribute('aria-label','Tap for sound: narration and music'); document.body.appendChild(tfs);
  var ind=document.createElement('div'); ind.className='apind'; ind.setAttribute('aria-hidden','true'); document.body.appendChild(ind);
  var ICON_PAUSE='<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" fill="#fff"/><rect x="14" y="5" width="4" height="14" rx="1" fill="#fff"/></svg>';
  var ICON_PLAY='<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="#fff"/></svg>';

  var A=window.qrcAuto={paused:false}, slideIdx=-1, elapsed=0, last=0, raf=0, waitEnd=false, capCue=-1;
  function isStory(i){return !!slides[i].querySelector('#story');}
  function dwell(i){ if(isStory(i)) return (S.on?STORY_VO:STORY_MUTED)+GAP+0.6; return (DUR[i]||8)+GAP; }
  function audioOK(){return S.on && music && !music.paused;}
  function renderTfs(){ tfs.classList.toggle('hide',audioOK()); }
  function setCap(i,t){
    if(isStory(i)){cap.classList.remove('show');return;}
    var c=CUES[i], k=-1; for(var j=0;j<c.length;j++){if(t>=c[j].s)k=j;}
    if(k!==capCue){capCue=k; if(k<0){cap.classList.remove('show');} else {cap.textContent=c[k].t; cap.classList.add('show');}}
  }
  function startSlide(i){ slideIdx=i; elapsed=0; last=performance.now(); waitEnd=false; capCue=-1; cap.classList.remove('show'); setCap(i,0); }
  function tick(now){
    raf=requestAnimationFrame(tick);
    var dt=(now-last)/1000; last=now; if(A.paused) return;
    if(dt>0&&dt<1) elapsed+=dt;
    var i=D.cur(); if(i!==slideIdx){startSlide(i);return;}
    /* with sound on, follow the voice clock so captions stay in sync */
    var t=elapsed;
    if(S.on&&!isStory(i)&&voice&&voice.currentSrc&&!voice.paused&&voice.currentTime>0) t=voice.currentTime;
    setCap(i,t);
    if(elapsed>=dwell(i)){
      /* if the voice started late and is still talking, let it finish first */
      if(S.on&&!isStory(i)&&voice&&!voice.paused&&!voice.ended){return;}
      if(S.on&&isStory(i)&&svo&&!svo.paused&&!svo.ended){return;}
      advance();
    }
    renderTfs();
  }
  function advance(){ var i=D.cur(); if(i>=D.n-1) D.go(0); else D.go(i+1); }
  function flash(html,stay){ind.innerHTML=html; ind.classList.add('show'); ind.classList.toggle('stay',!!stay); clearTimeout(ind._t); if(!stay) ind._t=setTimeout(function(){ind.classList.remove('show');},700);}
  function setAnim(paused){ var s=slides[D.cur()]; if(s) s.classList.toggle('appaused',paused); }
  A.pause=function(){ if(A.paused)return; A.paused=true; document.documentElement.classList.add('ap-paused'); setAnim(true);
    try{if(voice&&!voice.paused){voice.pause();voice._ap=1;}}catch(e){} try{if(svo&&!svo.paused){svo.pause();svo._ap=1;}}catch(e){}
    try{if(music&&!music.paused){music.pause();music._ap=1;}}catch(e){} flash(ICON_PLAY,true); };
  A.resume=function(){ if(!A.paused)return; A.paused=false; document.documentElement.classList.remove('ap-paused'); setAnim(false); last=performance.now();
    [voice,svo,music].forEach(function(el){ if(el&&el._ap){el._ap=0; if(S.on){try{var p=el.play();if(p&&p.catch)p.catch(function(){});}catch(e){}}} });
    flash(ICON_PAUSE,false); };
  A.toggle=function(){ A.paused?A.resume():A.pause(); };
  /* manual navigation (or Replay) re-activates a slide: restart its timer and keep playing */
  slides.forEach(function(s,i){ var wasA=s.classList.contains('active');
    new MutationObserver(function(recs){
      var is=s.classList.contains('active'), re=recs.some(function(r){return !/(^|\s)active(\s|$)/.test(r.oldValue||'');});
      if(is&&(!wasA||re)){ if(s.classList.contains('appaused'))s.classList.remove('appaused'); if(A.paused){A.paused=false;document.documentElement.classList.remove('ap-paused');ind.classList.remove('show','stay');} startSlide(i);}
      else if(!is&&s.classList.contains('appaused')) s.classList.remove('appaused');
      wasA=is;
    }).observe(s,{attributes:true,attributeFilter:['class'],attributeOldValue:true}); });
  /* Tap for sound: uses the existing Sound button (narration.js), inside this tap so it counts as the gesture */
  tfs.addEventListener('click',function(e){ e.stopPropagation();
    if(A.paused) A.resume();
    if(S.on&&music&&music.paused){ sndBtn.click(); } /* on but blocked (e.g. iOS): off then on again inside this tap */
    if(!S.on) sndBtn.click();
    setTimeout(renderTfs,400);
  });
  ['pointerdown','touchstart','touchend','mousedown'].forEach(function(t){tfs.addEventListener(t,function(e){e.stopPropagation();},{passive:true});});
  if(music){music.addEventListener('play',renderTfs);music.addEventListener('pause',renderTfs);}
  if(sndBtn) sndBtn.addEventListener('click',function(){setTimeout(renderTfs,50);});
  startSlide(D.cur()); renderTfs(); raf=requestAnimationFrame(tick);
})();
