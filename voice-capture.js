/* Jasné nahrávání pro děti: odpočet, start, detekce konce řeči */
async function captureChildSpeech({button,out,maxMs=4500,minMs=450,silenceMs=750}){
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  let audioCtx=null;
  let analyser=null;
  let source=null;
  let raf=0;
  let recorder=null;
  let chunks=[];
  let hasSpoken=false;
  let lastVoiceAt=0;
  let startedAt=0;
  let stopped=false;

  const setOut=html=>{ if(out) out.innerHTML=html; };
  const setButton=html=>{ if(button) button.innerHTML=html; };

  const cleanup=()=>{
    if(raf) cancelAnimationFrame(raf);
    try{source?.disconnect();}catch{}
    try{analyser?.disconnect();}catch{}
    try{audioCtx?.close();}catch{}
    stream.getTracks().forEach(t=>t.stop());
  };

  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  if(button) button.disabled=true;
  for(const n of [3,2,1]){
    setButton(`<span class="voice-countdown">${n}</span><span>Připrav se</span>`);
    setOut(`<div class="voice-state preparing"><div class="voice-big">${n}</div><strong>Připrav se…</strong></div>`);
    await wait(360);
  }

  try{ kidReadyBeep(); }catch{}
  setButton('<span class="action-icon recording-dot">🔴</span><span>Mluv teď</span>');
  setOut('<div class="voice-state recording"><div class="voice-big mic-pulse">🎙️</div><strong>MLUV TEĎ</strong><span>Až domluvíš, samo se to zastaví.</span><div class="voice-level"><i id="voiceLevelBar"></i></div></div>');
  await wait(120);

  return await new Promise((resolve,reject)=>{
    try{
      recorder=new MediaRecorder(stream);
      recorder.ondataavailable=e=>{ if(e.data.size) chunks.push(e.data); };
      recorder.onstop=()=>{
        if(stopped) return;
        stopped=true;
        cleanup();
        if(!hasSpoken){
          setOut('<div class="voice-state no-speech"><div class="voice-big">👂</div><strong>Neslyšela jsem tě.</strong><span>Zkus to ještě jednou.</span></div>');
          reject(Object.assign(new Error("no-speech"),{code:"no-speech"}));
          return;
        }
        setOut('<div class="voice-state judging"><div class="voice-big">✅</div><strong>Hotovo!</strong><span>Teď hodnotím…</span></div>');
        resolve(new Blob(chunks,{type:"audio/webm"}));
      };

      recorder.start();
      startedAt=performance.now();
      lastVoiceAt=startedAt;

      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(Ctx){
        audioCtx=new Ctx();
        analyser=audioCtx.createAnalyser();
        analyser.fftSize=512;
        source=audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        const data=new Uint8Array(analyser.fftSize);
        const tick=()=>{
          if(!recorder || recorder.state!=="recording") return;
          analyser.getByteTimeDomainData(data);
          let sum=0;
          for(let i=0;i<data.length;i++){ const v=(data[i]-128)/128; sum+=v*v; }
          const rms=Math.sqrt(sum/data.length);
          const now=performance.now();
          const level=Math.min(100,Math.max(3,Math.round(rms*900)));
          const bar=document.getElementById("voiceLevelBar");
          if(bar) bar.style.width=level+"%";
          if(rms>0.022){
            hasSpoken=true;
            lastVoiceAt=now;
          }
          const elapsed=now-startedAt;
          const silentFor=now-lastVoiceAt;
          if(hasSpoken && elapsed>minMs && silentFor>silenceMs){
            recorder.stop();
            return;
          }
          if(elapsed>maxMs){ recorder.stop(); return; }
          raf=requestAnimationFrame(tick);
        };
        raf=requestAnimationFrame(tick);
      }else{
        setTimeout(()=>{if(recorder.state==="recording")recorder.stop();},maxMs);
      }
    }catch(err){ cleanup(); reject(err); }
  });
}

function kidReadyBeep(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx) return;
    const ctx=new Ctx();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type="sine"; osc.frequency.value=740;
    gain.gain.setValueAtTime(.0001,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.08,ctx.currentTime+.01);
    gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.13);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime+.14);
    setTimeout(()=>ctx.close(),250);
  }catch{}
}