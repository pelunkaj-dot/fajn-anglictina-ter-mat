/* Vrstva pro nejmladší: obraz + poslech + vlastní hlas */
const previousRenderLearn = renderLearn;

function youngVisual(topic, word){
  if(topic.id === "colours") return colorVisualHtml(word);
  if(topic.id === "animals" || topic.id === "food") return '<div class="picture-visual"><img src="assets/' + topic.id + '/' + word.en + '.svg" alt="' + esc(word.cz) + '"></div>';
  return '<div class="young-symbol" aria-hidden="true">✨</div>';
}

function wordPronState(topicId){
  const ts = topicState(topicId);
  ts.wordPronunciation ||= {};
  return ts.wordPronunciation;
}

renderLearn = function(){
  const w = currentTopic.words[currentIndex];
  const wp = wordPronState(currentTopic.id);
  const best = Number(wp[w.en] || 0);
  shell(`
    <h2>👋 Nauč mě to</h2>
    <div class="young-instruction" aria-label="Podívej se, poslechni a řekni">
      <div><span>👀</span><b>Podívej se</b></div>
      <div class="instruction-arrow">→</div>
      <div><span>🔊</span><b>Poslechni</b></div>
      <div class="instruction-arrow">→</div>
      <div><span>🎙️</span><b>Řekni</b></div>
    </div>
    <div class="word-card young-word-card">
      ${youngVisual(currentTopic,w)}
      <div class="bigword">${esc(w.en)}</div>
      <div class="translation">${esc(w.cz)}</div>
      <div class="speak-actions">
        <button class="big-action listen-action" id="listen"><span class="action-icon">🔊</span><span>Poslechni</span></button>
        <button class="big-action say-action" id="sayWord"><span class="action-icon">🎙️</span><span>Řekni to</span></button>
      </div>
      <div id="wordPronResult">${best >= 80 ? '<div class="kid-feedback great">🌟 Tohle už umíš krásně!</div>' : best >= 60 ? '<div class="kid-feedback good">🙂 Už to jde!</div>' : ''}</div>
      <div class="controls young-next"><button class="btn primary" id="nextWord">${currentIndex===currentTopic.words.length-1 ? "Mám všechna slova" : "Další slovo"} →</button></div>
    </div>`);
  document.getElementById("listen").onclick = ()=>speak(w.en);
  document.getElementById("sayWord").onclick = ()=>recordYoungWord(w.en);
  document.getElementById("nextWord").onclick = ()=>{
    if(currentIndex < currentTopic.words.length-1){ currentIndex++; renderLearn(); } else nextStage();
  };
};

async function recordYoungWord(expected){
  const btn = document.getElementById("sayWord");
  const out = document.getElementById("wordPronResult");
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    const localChunks = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e=>{ if(e.data.size) localChunks.push(e.data); };
    recorder.onstop = async ()=>{
      stream.getTracks().forEach(t=>t.stop());
      const blob = new Blob(localChunks,{type:"audio/webm"});
      const fd = new FormData();
      fd.append("audio",blob,"audio.webm");
      fd.append("expectedText",expected);
      fd.append("language","en-GB");
      out.innerHTML = '<div class="kid-feedback listening"><span class="pulse-ear">👂</span> Poslouchám…</div>';
      try{
        const res = await fetch(API_PRON,{method:"POST",body:fd});
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || "Chyba");
        const score = Number(data.score) || 0;
        const wp = wordPronState(currentTopic.id);
        wp[expected] = Math.max(Number(wp[expected] || 0),score);
        saveState();
        if(score >= 80){
          kidSound("success");
          out.innerHTML = '<div class="kid-feedback great"><div class="feedback-face">🌟</div><strong>Paráda!</strong><span>Zní to moc dobře.</span></div>';
          tinyCelebrate();
        } else if(score >= 60){
          kidSound("success");
          out.innerHTML = '<div class="kid-feedback good"><div class="feedback-face">🙂</div><strong>Dobře!</strong><span>Zkus to ještě jednou.</span><div class="micro-actions"><button class="btn speak" id="hearAgain">🔊 Ještě jednou</button><button class="btn good" id="sayAgain">🎙️ Zkusím znovu</button></div></div>';
          document.getElementById("hearAgain").onclick=()=>speak(expected);
          document.getElementById("sayAgain").onclick=()=>recordYoungWord(expected);
        } else {
          kidSound("try");
          out.innerHTML = '<div class="kid-feedback try"><div class="feedback-face">👂</div><strong>Poslechni ještě jednou.</strong><span>A pak to zkus znovu.</span><div class="micro-actions"><button class="btn speak" id="hearAgain">🔊 Poslechnout</button><button class="btn good" id="sayAgain">🎙️ Řeknu to</button></div></div>';
          document.getElementById("hearAgain").onclick=()=>speak(expected);
          document.getElementById("sayAgain").onclick=()=>recordYoungWord(expected);
          speak(expected);
        }
      }catch(err){
        out.innerHTML = '<div class="kid-feedback try">🎙️ Teď se mi nepodařilo hlas zkontrolovat. Zkus to ještě jednou.</div>';
      }finally{
        btn.disabled=false;
        btn.innerHTML='<span class="action-icon">🎙️</span><span>Řekni to</span>';
      }
    };
    recorder.start();
    btn.disabled=true;
    btn.innerHTML='<span class="action-icon recording-dot">🔴</span><span>Mluv teď</span>';
    out.innerHTML='<div class="kid-feedback listening">🎙️ Poslouchám tvůj hlas…</div>';
    setTimeout(()=>{ if(recorder.state === "recording") recorder.stop(); },2200);
  }catch(err){
    out.innerHTML='<div class="kid-feedback try">🎙️ Mikrofon není povolený.<span>Povol ho v prohlížeči a zkus to znovu.</span></div>';
  }
}

function tinyCelebrate(){
  const box=document.getElementById("wordPronResult");
  if(!box) return;
  const burst=document.createElement("div");
  burst.className="tiny-burst";
  burst.textContent="✨ ⭐ ✨";
  box.appendChild(burst);
  setTimeout(()=>burst.remove(),1100);
}