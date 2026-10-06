/* Obrázkový příběh + roleplay pro nejmladší */

function storyScene(topic,line){
  const t=(line.en||"").toLowerCase();
  if(topic.id==="animals"){
    const keys=["dog","cat","bird","fish","rabbit","horse","mouse","frog"];
    const key=keys.find(k=>t.includes(k)) || "dog";
    return `<img src="assets/animals/${key}.svg" alt="">`;
  }
  if(topic.id==="food"){
    const keys=["apple","bread","milk","water","cheese","banana","egg","cake"];
    const key=keys.find(k=>t.includes(k)) || "apple";
    return `<img src="assets/food/${key}.svg" alt="">`;
  }
  if(topic.id==="colours"){
    const palette=currentTopic.words.filter(w=>t.includes(w.en));
    if(palette.length){
      return `<div class="story-colours">${palette.map(w=>`<span style="background:${w.color}" title="${esc(w.cz)}">${w.visual||""}</span>`).join("")}</div>`;
    }
    return `<div class="story-rainbow">🌈</div>`;
  }
  return `<div class="story-rainbow">${topic.emoji}</div>`;
}

renderStory = function(){
  shell(`
    <h2>📖 Příběh Terezky a Matýska</h2>
    <div class="story-guide">
      <div>👀 <b>Dívej se</b></div>
      <div>🔊 <b>Poslouchej</b></div>
      <div>🎙️ <b>Zahraj si roli</b></div>
    </div>
    <p class="mini story-intro">Nemusíš přečíst všechno. Obrázek a hlas ti napoví, co se děje.</p>
    <div class="comic-strip">
      ${currentTopic.story.map((line,i)=>`
        <article class="comic-card ${line.speaker==="Terezka"?"terezka-card":"matysek-card"}">
          <div class="comic-picture">${storyScene(currentTopic,line)}</div>
          <div class="comic-speaker"><span class="speaker-avatar">${line.speaker==="Terezka"?"T":"M"}</span><strong>${esc(line.speaker)}</strong></div>
          <div class="speech-bubble">
            <div class="story-en">${esc(line.en)}</div>
            <div class="story-cz">${esc(line.cz)}</div>
          </div>
          <div class="comic-actions">
            <button class="btn speak storySpeak" data-i="${i}">🔊 Poslechni</button>
            <button class="btn good storyRole" data-i="${i}">🎙️ Řekni repliku</button>
          </div>
          <div class="storyPronResult" id="storyPron-${i}"></div>
        </article>`).join("")}
    </div>
    ${navButton("Pokračovat")}`);

  document.querySelectorAll(".storySpeak").forEach(b=>b.onclick=()=>speak(currentTopic.story[Number(b.dataset.i)].en));
  document.querySelectorAll(".storyRole").forEach(b=>b.onclick=()=>recordStoryLine(Number(b.dataset.i)));
  document.getElementById("nextStage").onclick=nextStage;
};

async function recordStoryLine(index){
  const line=currentTopic.story[index];
  const out=document.getElementById(`storyPron-${index}`);
  const btn=document.querySelector(`.storyRole[data-i="${index}"]`);
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
      fd.append("expectedText",line.en);
      fd.append("language","en-GB");
      out.innerHTML='<div class="kid-feedback listening">👂 Poslouchám repliku…</div>';
      try{
        const res=await fetch(API_PRON,{method:"POST",body:fd});
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||"Chyba");
        const score=Number(data.score)||0;
        if(score>=80){
          out.innerHTML='<div class="kid-feedback great"><div class="feedback-face">🌟</div><strong>Skvělá replika!</strong><span>Tohle by Terezka s Matýskem brali.</span></div>';
        }else if(score>=60){
          out.innerHTML='<div class="kid-feedback good"><div class="feedback-face">🙂</div><strong>Dobré!</strong><span>Zkus ji ještě jednou jako opravdový herec.</span></div>';
        }else{
          out.innerHTML='<div class="kid-feedback try"><div class="feedback-face">👂</div><strong>Poslechni vzor.</strong><span>A pak repliku zopakuj.</span></div>';
          speak(line.en);
        }
      }catch(err){
        out.innerHTML='<div class="kid-feedback try">🎙️ Hlas se teď nepodařilo zkontrolovat. Zkus to znovu.</div>';
      }finally{
        btn.disabled=false; btn.textContent="🎙️ Řekni repliku";
      }
    };
    recorder.start();
    btn.disabled=true; btn.textContent="🔴 Mluv teď";
    out.innerHTML='<div class="kid-feedback listening">🎙️ Poslouchám tvůj hlas…</div>';
    const duration=Math.min(5000,Math.max(2800,line.en.split(/\s+/).length*650));
    setTimeout(()=>{if(recorder.state==="recording")recorder.stop();},duration);
  }catch(err){
    out.innerHTML='<div class="kid-feedback try">🎙️ Potřebuji povolit mikrofon.</div>';
  }
}