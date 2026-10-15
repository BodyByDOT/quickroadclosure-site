/* QuickRoadClosure optional narration: sound toggle (off by default; auto-on when launched from the splash Play Demo button), per-slide voice, music bed.
   Voice clips: assets/audio/<deck>-NN.mp3 (data-narration on each .slide).
   Live-update story slide: its single voice line (#story-vo) is driven by deck.js, synced to the captions.
   Music level is baked into the file (about 18 dB, roughly 13%, under the voice), so the voice stays on top even on
   phones that ignore element volume. Music: Proud of You by Michael Ramir C. (Mixkit, Mixkit Stock Music Free License). */
(function(){
  var btn=document.getElementById('sound'); if(!btn) return;
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var music=document.getElementById('qrc-music'), voice=document.getElementById('qrc-voice'), svo=document.getElementById('story-vo');
  var S=window.qrcSound={on:false}, playing=null, fadeId=0;
  function safePlay(el){try{var p=el.play();if(p&&p.catch)p.catch(function(){});}catch(e){}}
  function fade(el,to,ms,done){
    var id=++fadeId, from=el.volume, t0=performance.now(), fin=false;
    function end(){ if(fin||id!==fadeId)return; fin=true; try{el.volume=to;}catch(e){} if(done)done(); }
    (function step(){ if(fin||id!==fadeId)return; var k=Math.min(1,(performance.now()-t0)/ms);
      try{el.volume=from+(to-from)*k;}catch(e){} if(k<1)requestAnimationFrame(step); else end(); })();
    setTimeout(end,ms+150);
  }
  function active(){return document.querySelector('.slide.active');}
  function stopVoice(){playing=null;try{if(!voice.paused)voice.pause();}catch(e){}}
  function playVoice(s){
    stopVoice(); if(!S.on||!s)return;
    var src=s.getAttribute('data-narration'); if(!src)return;
    playing=s;
    if(voice.getAttribute('src')!==src){voice.setAttribute('src',src);voice.load();}
    try{voice.currentTime=0;}catch(e){}
    safePlay(voice);
  }
  /* start narration when a slide's animation begins (it becomes .active, incl. Replay); stop when it leaves */
  var mo=new MutationObserver(function(recs){
    var starts=[];
    recs.forEach(function(r){
      var was=/(^|\s)active(\s|$)/.test(r.oldValue||''), is=r.target.classList.contains('active');
      if(was&&!is&&r.target===playing)stopVoice();
      if(!was&&is)starts.push(r.target);
    });
    if(starts.length)playVoice(starts[starts.length-1]);
  });
  slides.forEach(function(s){mo.observe(s,{attributes:true,attributeFilter:['class'],attributeOldValue:true});});
  function render(){
    btn.setAttribute('aria-pressed',S.on?'true':'false');
    btn.classList.toggle('on',S.on);
    btn.setAttribute('aria-label',S.on?'Sound on: narration and music. Tap to turn off':'Sound off. Tap for narration and music');
  }
  function turnOn(){
    S.on=true; render();
    var s=active(), isStory=s&&s.querySelector('#story');
    /* everything below runs inside the tap, so mobile browsers count it as the user gesture */
    try{music.volume=0;}catch(e){} safePlay(music); fade(music,1,900);
    if(svo&&!isStory){svo.muted=true;try{var p=svo.play();if(p&&p.then)p.then(function(){if(!(active()&&active().querySelector('#story'))){svo.pause();}svo.muted=false;},function(){svo.muted=false;});else{svo.pause();svo.muted=false;}}catch(e){svo.muted=false;}}
    if(isStory){ if(window.qrcStory)window.qrcStory.start(); }
    else if(s){
      var src=s.getAttribute('data-narration');
      if(src){voice.setAttribute('src',src);safePlay(voice);}
      /* replay the slide so the narration starts with its animation */
      s.classList.remove('active'); void s.offsetWidth; s.classList.add('active');
    }
  }
  function turnOff(){
    S.on=false; render(); stopVoice();
    if(svo){try{svo.pause();}catch(e){}}
    fade(music,0,700,function(){if(!S.on){try{music.pause();}catch(e){}}});
  }
  function toggle(){S.on?turnOff():turnOn();}
  btn.addEventListener('click',function(e){e.stopPropagation();toggle();});
  btn.addEventListener('keydown',function(e){if(e.key===' '||e.key==='Enter')e.stopPropagation();}); /* let the native click toggle; don't advance the slide */
  document.addEventListener('keydown',function(e){if((e.key==='m'||e.key==='M')&&!e.metaKey&&!e.ctrlKey&&!e.altKey)toggle();});
  render();
  /* Auto-start: the splash page's "Play Demo" click sets a one-shot flag; that click is the user gesture.
     Opening the demo directly (no flag) keeps sound off. */
  var auto=false; try{auto=sessionStorage.getItem('qrcAutoSound')==='1'; sessionStorage.removeItem('qrcAutoSound');}catch(e){}
  if(auto){
    turnOn();
    /* if the browser still blocked playback (e.g. iOS Safari), start on the first touch/click/key; toggle stays ON and still mutes */
    setTimeout(function(){
      if(!S.on||!music.paused)return;
      var evs=['pointerdown','touchstart','keydown'];
      function kick(e){
        evs.forEach(function(t){document.removeEventListener(t,kick,true);});
        if(!S.on||(e&&e.target&&btn.contains(e.target)))return;
        try{music.volume=0;}catch(x){} safePlay(music); fade(music,1,900);
        var s=active(); if(s&&!s.querySelector('#story'))playVoice(s); else if(s&&window.qrcStory)window.qrcStory.start();
      }
      evs.forEach(function(t){document.addEventListener(t,kick,true);});
    },700);
  }
})();
