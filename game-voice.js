/* Herní režim pro nejmladší: obrazové cíle + mluvené výzvy */

function gameVisualPrompt(topic, word){
  if(topic.id === "colours"){
    const border = word.en === "white" ? "border:3px solid #d8d8d8;" : "";
    return `<div class="game-target colour-target" style="background:${word.color};${border}"><span>${word.visual || ""}</span></div>`;
  }
  if(topic.id === "animals" || topic.id === "food"){
    return `<div class="game-target picture-target"><img src="assets/${topic.id}/${word.en}.svg" alt="${esc(word.cz)}"></div>`;
  }
  return `<div class="game-target generic-target">${topic.emoji}</div>`;
}

buildGameQuestions = function(topic){
  const qs=[];
  const words=[...topic.words];
  shuffle(words);
  for(let i=0;i<8;i++){
    const w=words[i%words.length];
    const mode=i%4;
    if(mode===0){
      const opts=[w,...shuffle(topic.words.filter(x=>x!==w)).slice(0,3)]; shuffle(opts);
      qs.push({type:"picturePick",word:w,prompt:"Najdi správný obrázek",answer:w.cz,options:opts,speak:w.en});
    }else if(mode===1){
      const opts=[w,...shuffle(topic.words.filter(x=>x!==w)).slice(0,3)]; shuffle(opts);
      qs.push({type:"listen",word:w,prompt:"Co slyšíš?",answer:w.en,options:opts.map(x=>x.en),speak:w.en});
    }else if(mode===2){
      const opts=[w,...shuffle(topic.words.filter(x=>x!==w)).slice(0,3)]; shuffle(opts);
      qs.push({type:"reverse",word:w,prompt:`Jak je anglicky „${w.cz}“?`,answer:w.en,options:opts.map(x=>x.en)});
    }else{
      qs.push({type:"speak",word:w,prompt:"Co je to? Řekni to anglicky.",answer:w.en,speak:w.en});
    }
  }
  return qs;
};

renderAdventure = function(){
  const q=game.questions[game.round];
  if(!q){ renderAdventureFinish(); return; }
  const progress=(game.round/game.questions.length)*100;
  const visual = gameVisualPrompt(game.topic,q.word);
  let answerArea="";

  if(q.type==="picturePick"){
    answerArea = `<div class="game-options visual-game-options">${q.options.map(o=>`<button class="game-option visual-game-option" data-a="${esc(o.cz)}">${gameVisualPrompt(game.topic,o)}<strong>${esc(o.cz)}</strong></button>`).join("")}</div>`;
  }else if(q.type==="speak"){
    answerArea = `<div class="voice-challenge"><button class="game-mic" id="gameMic"><span>🎙️</span><b>Řeknu to</b></button><button class="btn speak" id="gameModel">🔊 Poslechnout vzor</button></div>`;
  }else{
    answerArea = `<div class="game-options">${q.options.map(o=>`<button class="game-option" data-a="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  }

  app.innerHTML=`
    <div class="lesson-head">
      <button class="back" id="leaveGame">← Zpět</button>
      <div class="lesson-title"><h1>🗺️ Výprava za hvězdami</h1><p>${game.topic.emoji} ${esc(game.topic.title)} · herní režim</p></div>
    </div>
    <section class="panel game-panel">
      <div class="game-hud">
        <div class="hud-box"><small>Hvězdy</small>⭐ <span id="gScore">${game.score}</span></div>
        <div class="hud-box"><small>Série</small>🔥 <span id="gCombo">${game.combo}</span></div>
        <div class="hud-box"><small>Cesta</small>${game.round+1}/${game.questions.length}</div>
      </div>
      <div class="adventure-map">
        <div class="stars-bg"></div><div class="moon">🌙</div><div class="trail"></div>
        ${game.questions.map((_,i)=>`<div class="checkpoint ${i<game.round?"done":""}" style="left:${8+i*(80/(game.questions.length-1))}%">${i<game.round?"★":""}</div>`).join("")}
        <div class="hero-token character-token" style="left:${6+progress*.8}%"><img src="assets/characters/terezka.svg" alt=""><img src="assets/characters/matysek.svg" alt=""></div>
        <div class="treasure">🎁</div>
      </div>
      <div class="game-question young-game-question">
        <div class="combo">${game.combo>=2?`🔥 Série ${game.combo}! + bonus`:""}</div>
        <div class="game-instruction-icons">${q.type==="speak"?"👀 → 🎙️":q.type==="listen"?"🔊 → 👆":"👀 → 👆"}</div>
        ${q.type==="listen"?'<div class="controls"><button class="btn speak" id="gameListen">🔊 Poslechnout</button></div>':""}
        <h3>${esc(q.prompt)}</h3>
        ${q.type==="picturePick" ? "" : visual}
        ${answerArea}
        <div id="gameFeedback"></div>
      </div>
    </section>`;

  document.getElementById("leaveGame").onclick=renderHome;
  if(document.getElementById("gameListen")){
    document.getElementById("gameListen").onclick=()=>speak(q.speak);
    setTimeout(()=>speak(q.speak),250);
  }
  if(document.getElementById("gameModel")) document.getElementById("gameModel").onclick=()=>speak(q.speak);
  if(document.getElementById("gameMic")) document.getElementById("gameMic").onclick=()=>recordGameWord(q);
  document.querySelectorAll(".game-option").forEach(btn=>btn.onclick=()=>answerYoungGame(btn,q));
};

function answerYoungGame(btn,q){
  const all=[...document.querySelectorAll(".game-option")];
  const ok=btn.dataset.a===q.answer;
  if(ok){
    game.combo++;
    game.bestCombo=Math.max(game.bestCombo,game.combo);
    const gain=game.combo>=4?3:game.combo>=2?2:1;
    game.score+=gain;
    kidSound("success");
    btn.classList.add("correct");
    all.forEach(x=>x.disabled=true);
    document.getElementById("gameFeedback").innerHTML=`<div class="feedback ok">⭐ Správně! ${gain>1?`Bonus: +${gain}`:""}</div>`;
    setTimeout(()=>{game.round++;renderAdventure();},650);
  }else{
    game.combo=0;
    kidSound("try");
    btn.classList.add("wrong");
    btn.disabled=true;
    document.getElementById("gameFeedback").innerHTML='<div class="feedback bad">🙂 Zkus jinou možnost.</div>';
    if(q.speak) speak(q.speak);
  }
}

async function recordGameWord(q){
  const btn=document.getElementById("gameMic");
  const out=document.getElementById("gameFeedback");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const localChunks=[];
    const recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{ if(e.data.size) localChunks.push(e.data); };
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(localChunks,{type:"audio/webm"});
      const fd=new FormData();
      fd.append("audio",blob,"audio.webm");
      fd.append("expectedText",q.answer);
      fd.append("language","en-GB");
      out.innerHTML='<div class="feedback">👂 Poslouchám…</div>';
      try{
        const res=await fetch(API_PRON,{method:"POST",body:fd});
        const data=await res.json();
        if(!res.ok) throw new Error(data.error||"Chyba");
        const score=Number(data.score)||0;
        if(score>=60){
          game.combo++;
          game.bestCombo=Math.max(game.bestCombo,game.combo);
          const gain=score>=80?3:2;
          game.score+=gain;
          kidSound(score>=80?"reward":"success");
          out.innerHTML=`<div class="voice-game-result goodvoice"><div>🌟</div><strong>${score>=80?"Paráda!":"Dobře!"}</strong><span>Brána se otevřela.</span></div>`;
          setTimeout(()=>{game.round++;renderAdventure();},900);
        }else{
          game.combo=0;
          kidSound("try");
          out.innerHTML='<div class="voice-game-result tryvoice"><div>👂</div><strong>Ještě jednou.</strong><span>Poslechni vzor a zkus to znovu.</span></div>';
          speak(q.answer);
          btn.disabled=false;
          btn.innerHTML="<span>🎙️</span><b>Řeknu to</b>";
        }
      }catch(err){
        out.innerHTML='<div class="feedback bad">🎙️ Mikrofon teď zlobí.<div class="controls"><button class="btn" id="skipGameVoice">Pokračovat bez mikrofonu →</button></div></div>';
        btn.disabled=false;
        btn.innerHTML="<span>🎙️</span><b>Řeknu to</b>";
        const skip=document.getElementById("skipGameVoice");
        if(skip) skip.onclick=()=>{game.combo=0;game.round++;renderAdventure();};
      }
    };
    recorder.start();
    btn.disabled=true;
    btn.innerHTML="<span class=\"recording-dot\">🔴</span><b>Mluv teď</b>";
    out.innerHTML='<div class="feedback">🎙️ Poslouchám tvůj hlas…</div>';
    setTimeout(()=>{ if(recorder.state==="recording") recorder.stop(); },2200);
  }catch(err){
    out.innerHTML='<div class="feedback bad">🎙️ Mikrofon není dostupný.<div class="controls"><button class="btn" id="skipGameVoice">Pokračovat bez mikrofonu →</button></div></div>';
    const skip=document.getElementById("skipGameVoice");
    if(skip) skip.onclick=()=>{game.combo=0;game.round++;renderAdventure();};
  }
}