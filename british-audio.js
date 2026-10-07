/* One British model for the whole course; no credentials in the client. */
const britishAudioCache=new Map();
let britishPlayback=null;
let britishPlaybackRequest=0;
function stopBritishAudio(){
  britishPlaybackRequest++;
  if(britishPlayback){britishPlayback.pause();britishPlayback=null;}
  if(window.speechSynthesis) window.speechSynthesis.cancel();
}
function modelAudioNotice(text){
  const panel=document.querySelector('.panel');
  if(!panel) return;
  let notice=panel.querySelector('.model-audio-notice');
  if(!notice){notice=document.createElement('div');notice.className='model-audio-notice';notice.setAttribute('role','status');panel.appendChild(notice);}
  notice.textContent=text;
}
async function playBritishModel(text){
  stopBritishAudio();
  const request=britishPlaybackRequest;
  const panel=document.querySelector('.panel');
  const current=()=>request===britishPlaybackRequest&&(!panel||panel.isConnected);
  modelAudioNotice('');
  const button=document.getElementById('listen')||document.getElementById('quizListen');
  if(button) button.setAttribute('aria-busy','true');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    let url=britishAudioCache.get(text);
    if(!url){
      const response=await fetch(`https://fdc-gateway.vercel.app/api/english-model?text=${encodeURIComponent(text)}`,{signal:controller.signal});
      if(!response.ok) throw new Error('model-unavailable');
      const blob=await response.blob();
      if(!blob.type.startsWith('audio/')) throw new Error('model-unavailable');
      url=URL.createObjectURL(blob);britishAudioCache.set(text,url);
      if(britishAudioCache.size>80){const oldest=britishAudioCache.keys().next().value;URL.revokeObjectURL(britishAudioCache.get(oldest));britishAudioCache.delete(oldest);}
    }
    if(!current()) return;
    const audio=new Audio(url);britishPlayback=audio;
    audio.onended=()=>{if(britishPlayback===audio)britishPlayback=null;};
    await audio.play();
  }catch{
    if(!current()) return;
    const synthesis=window.speechSynthesis;
    const voice=synthesis?.getVoices().find(v=>/^en[-_]GB$/i.test(v.lang));
    if(voice){const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang='en-GB';utterance.rate=.82;synthesis.speak(utterance);}
    else modelAudioNotice('🔊 Vzor se teď nepodařilo přehrát. Zkus tlačítko ještě jednou.');
  }finally{clearTimeout(timer);if(button?.isConnected!==false)button?.removeAttribute('aria-busy');}
}
