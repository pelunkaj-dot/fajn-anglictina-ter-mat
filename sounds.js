/* Jemné herní zvuky bez externích souborů */
let _kidAudioCtx=null;
function kidSound(type="success"){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    _kidAudioCtx ||= new Ctx();
    if(_kidAudioCtx.state==="suspended")_kidAudioCtx.resume();
    const ctx=_kidAudioCtx;
    const now=ctx.currentTime;
    const notes=type==="reward"?[523.25,659.25,783.99]:type==="try"?[330,293.66]:[523.25,659.25];
    notes.forEach((freq,i)=>{
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type="sine"; osc.frequency.value=freq;
      gain.gain.setValueAtTime(0.0001,now+i*.09);
      gain.gain.exponentialRampToValueAtTime(type==="try"?.045:.07,now+i*.09+.015);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+i*.09+.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now+i*.09); osc.stop(now+i*.09+.18);
    });
  }catch{}
}