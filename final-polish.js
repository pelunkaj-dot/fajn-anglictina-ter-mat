/* Finální UX vrstva pro nejmenší děti */

function smallVisual(topic,word,compact=false){
  if(topic.id==="colours"){
    const border=word.en==="white" ? "border:2px solid #ccc;" : "";
    return `<div class="${compact?"mini-colour":"quiz-colour"}" style="background:${word.color};${border}">${word.visual||""}</div>`;
  }
  if(topic.id==="animals" || topic.id==="food"){
    return `<div class="${compact?"mini-quiz-picture":"quiz-picture"}"><img src="assets/${topic.id}/${word.en}.svg" alt="${esc(word.cz)}"></div>`;
  }
  if(topic.id==="numbers") return numberVisual(word,compact);
  if(topic.id==="body") return bodyVisual(word,compact);
  if(topic.id==="family") return familyVisual(word,compact);
  if(["clothes","house","school"].includes(topic.id)) return topicPictureVisual(topic,word,compact);
  if(["weather","transport","emotions"].includes(topic.id)) return iconTopicVisual(word,compact);
  return `<div class="fallback-visual">${topic.emoji}</div>`;
}

function sentencePicture(topic,sentence){
  const text=(sentence.en||"").toLowerCase();
  const word=topic.words.find(w=>text.includes(w.en.toLowerCase()));
  return word ? smallVisual(topic,word,false) : `<div class="sentence-topic-icon">${topic.emoji}</div>`;
}

renderSpeak = function(){
  const sentence=currentTopic.sentences[currentIndex];
  const ts=topicState(currentTopic.id);
  shell(`
    <h2>🎙️ Mluvím</h2>
    <div class="young-instruction"><div><span>👀</span><b>Dívej se</b></div><div class="instruction-arrow">→</div><div><span>🔊</span><b>Poslechni</b></div><div class="instruction-arrow">→</div><div><span>🎙️</span><b>Řekni</b></div></div>
    <div class="sentence-visual">${sentencePicture(currentTopic,sentence)}</div>
    <div class="sentence">${esc(sentence.en)}</div>
    <p class="sentence-cz">${esc(sentence.cz)}</p>
    <div class="speak-actions">
      <button class="big-action listen-action" id="listen"><span class="action-icon">🔊</span><span>Poslechni</span></button>
      <button class="big-action say-action" id="record"><span class="action-icon">🎙️</span><span>Řeknu to</span></button>
    </div>
    <div id="pronResult"></div>`);
  document.getElementById("listen").onclick=()=>speak(sentence.en);
  document.getElementById("record").onclick=()=>recordPronunciation(sentence.en);
};

recordPronunciation = async function(expected){
  const btn=document.getElementById("record");
  const out=document.getElementById("pronResult");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const localChunks=[];
    const recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size)localChunks.push(e.data);};
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(localChunks,{type:"audio/webm"});
      const fd=new FormData();
      fd.append("audio",blob,"audio.webm");
      fd.append("expectedText",expected);
      fd.append("language","en-GB");
      out.innerHTML='<div class="kid-feedback listening">👂 Poslouchám…</div>';
      try{
        const res=await fetch(API_PRON,{method:"POST",body:fd});
        const data=await res.json();
        if(!res.ok) throw new Error(data.error||"Chyba");
        const score=Number(data.score)||0;
        const ts=topicState(currentTopic.id);
        ts.bestPronunciation=Math.max(ts.bestPronunciation||0,score);
        saveState();
        let message="";
        if(score>=80){ kidSound("success"); message='<div class="kid-feedback great"><div class="feedback-face">🌟</div><strong>Výborně!</strong><span>Bylo ti krásně rozumět.</span></div>';
        } else if(score>=60){ kidSound("success"); message='<div class="kid-feedback good"><div class="feedback-face">🙂</div><strong>Dobře!</strong><span>Ještě jednou a bude to jistější.</span></div>';
        } else { kidSound("try"); message='<div class="kid-feedback try"><div class="feedback-face">👂</div><strong>Poslechni ještě jednou.</strong><span>A pak větu zopakuj.</span></div>';
        } out.innerHTML=message+`<div class="controls"><button class="btn speak" id="hearSentenceAgain">🔊 Poslechnout</button><button class="btn good" id="saySentenceAgain">🎙️ Znovu</button><button class="btn primary" id="continueSentence">${currentIndex===currentTopic.sentences.length-1?"Pokračovat":"Další věta"} →</button></div>`;
        document.getElementById("hearSentenceAgain").onclick=()=>speak(expected);
        document.getElementById("saySentenceAgain").onclick=()=>renderSpeak();
        document.getElementById("continueSentence").onclick=()=>{
          if(currentIndex<currentTopic.sentences.length-1){currentIndex++;renderSpeak();}else nextStage();
        };
        if(score<60) speak(expected);
      }catch(err){
        out.innerHTML='<div class="kid-feedback try">🎙️ Teď se mi nepodařilo hlas zkontrolovat.<div class="controls"><button class="btn" id="skipPron">Pokračovat →</button></div></div>';
        const skip=document.getElementById("skipPron");
        if(skip) skip.onclick=()=>{if(currentIndex<currentTopic.sentences.length-1){currentIndex++;renderSpeak();}else nextStage();};
      }finally{
        btn.disabled=false;
        btn.innerHTML='<span class="action-icon">🎙️</span><span>Řeknu to</span>';
      }
    };
    recorder.start();
    btn.disabled=true;
    btn.innerHTML='<span class="action-icon recording-dot">🔴</span><span>Mluv teď</span>';
    out.innerHTML='<div class="kid-feedback listening">🎙️ Poslouchám tvůj hlas…</div>';
    const duration=Math.min(5200,Math.max(3000,expected.split(/\s+/).length*650));
    setTimeout(()=>{if(recorder.state==="recording")recorder.stop();},duration);
  }catch(err){
    out.innerHTML='<div class="kid-feedback try"><div class="feedback-face">🎙️</div><strong>Mikrofon není dostupný.</strong><span>Můžeš pokračovat a mluvení zkusit později.</span><div class="controls"><button class="btn primary" id="continueNoMic">Pokračovat →</button></div></div>';
    const next=document.getElementById("continueNoMic");
    if(next) next.onclick=()=>{if(currentIndex<currentTopic.sentences.length-1){currentIndex++;renderSpeak();}else nextStage();};
  }
};

renderQuiz = function(){
  const total=5;
  if(currentIndex>=total){
    const passed=quizScore>=4;
    shell(`
      <h2>✅ Ověřím si, co umím</h2>
      <div class="quiz-result-visual">${passed?"🏆":"🌱"}</div>
      <div class="score">${quizScore}/${total}</div>
      <p class="quiz-result-text">${passed?"Paráda! Tohle téma už opravdu poznáš.":"Ještě trochu potrénujeme. Každý pokus se počítá."}</p>
      <div class="controls">${passed?'<button class="btn primary" id="finish">Dokončit téma →</button>':'<button class="btn" id="retry">Zkusit znovu</button>'}</div>`);
    if(passed) document.getElementById("finish").onclick=()=>{completeStage(4);renderFinish();};
    else document.getElementById("retry").onclick=()=>{currentIndex=0;quizScore=0;renderQuiz();};
    return;
  }

  const w=currentTopic.words[currentIndex%currentTopic.words.length];
  const choices=[w,...shuffle(currentTopic.words.filter(x=>x!==w)).slice(0,3)]; shuffle(choices);
  const listenMode=currentIndex%2===1;

  if(!listenMode){
    shell(`
      <h2>✅ Ověřím si, co umím</h2>
      <div class="quiz-progress">⭐ ${currentIndex+1}/${total}</div>
      <div class="game-instruction-icons">👀 → 👆</div>
      <div class="quiz-main-visual">${smallVisual(currentTopic,w,false)}</div>
      <h3 class="quiz-question">Jak se to řekne anglicky?</h3>
      <div class="options">${choices.map(c=>`<button class="option quiz-word-option" data-a="${esc(c.en)}">${esc(c.en)}</button>`).join("")}</div>
      <div id="feedback"></div>`);
  }else{
    shell(`
      <h2>✅ Ověřím si, co umím</h2>
      <div class="quiz-progress">⭐ ${currentIndex+1}/${total}</div>
      <div class="game-instruction-icons">🔊 → 👆</div>
      <div class="controls"><button class="big-action listen-action" id="quizListen"><span class="action-icon">🔊</span><span>Poslechni</span></button></div>
      <h3 class="quiz-question">Který obrázek patří ke slovu?</h3>
      <div class="visual-options quiz-picture-options">${choices.map(c=>`<button class="visual-option quiz-picture-option" data-a="${esc(c.en)}">${smallVisual(currentTopic,c,true)}<strong>${esc(c.cz)}</strong></button>`).join("")}</div>
      <div id="feedback"></div>`);
    document.getElementById("quizListen").onclick=()=>speak(w.en);
    setTimeout(()=>speak(w.en),250);
  }

  document.querySelectorAll("[data-a]").forEach(btn=>btn.onclick=()=>{
    const fb=document.getElementById("feedback");
    if(btn.dataset.a===w.en){
      quizScore++;
      kidSound("success"); fb.className="feedback ok"; fb.textContent="⭐ Správně!";
      document.querySelectorAll("[data-a]").forEach(x=>x.disabled=true);
      setTimeout(()=>{currentIndex++;renderQuiz();},550);
    }else{
      kidSound("try"); btn.disabled=true;
      fb.className="feedback bad"; fb.textContent="🙂 Zkus jinou možnost.";
      if(listenMode) speak(w.en);
    }
  });
};

const oldRenderFinishFinal=renderFinish;
renderFinish=function(){
  const ts=topicState(currentTopic.id);
  if(ts.stages.every(Boolean) && ts.bestPronunciation>=60) ts.mastered=true;
  saveState();
  shell(`
    <div class="finish-characters"><img src="assets/characters/terezka.svg" alt="Terezka"><img src="assets/characters/matysek.svg" alt="Matýsek"></div>
    <h2 class="finish-title">${ts.mastered?"🏅 Téma opravdu umíš!":"⭐ Téma jsi prošel/prošla"}</h2>
    <p class="finish-copy">${ts.mastered?"Skvělé! Ve světě Terezky a Matýska se ti odemklo nové místo.":"Cestu jsi prošel/prošla. Pro odznak „Umím“ si ještě zkus mluvení tak, aby ti bylo dobře rozumět."}</p>
    <div class="controls"><button class="btn" id="repeat">Projít znovu</button><button class="btn primary" id="home">Do našeho světa →</button></div>`);
  document.getElementById("repeat").onclick=()=>{currentStage=0;currentIndex=0;renderStage();};
  document.getElementById("home").onclick=renderHome;
};