/* Rodičovská sekce s jednoduchým PIN zámkem */
const PARENT_PIN_KEY="fajn-anglictina-parent-pin-v1";

document.getElementById("parentBtn").addEventListener("click",openParentGate);

async function hashPin(pin){
  try{
    const bytes=new TextEncoder().encode(pin);
    const digest=await crypto.subtle.digest("SHA-256",bytes);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }catch{
    return btoa(pin);
  }
}

function parentOverlay(html){
  let el=document.getElementById("parentOverlay");
  if(!el){
    el=document.createElement("div");
    el.id="parentOverlay";
    el.className="parent-overlay";
    document.body.appendChild(el);
  }
  el.innerHTML=`<div class="parent-modal">${html}</div>`;
  el.classList.add("show");
  const close=el.querySelector("[data-close-parent]");
  if(close) close.onclick=()=>el.classList.remove("show");
}

function pinForm(title,text,mode){
  parentOverlay(`
    <button class="parent-close" data-close-parent>✕</button>
    <div class="parent-lock-icon">🔐</div>
    <h2>${title}</h2>
    <p>${text}</p>
    <form id="pinForm" class="pin-form">
      <input id="parentPin" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="Čtyřmístný PIN" placeholder="••••">
      ${mode==="create"?'<input id="parentPin2" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="Zopakujte PIN" placeholder="••••">':""}
      <button class="btn primary" type="submit">${mode==="create"?"Nastavit PIN":"Odemknout"}</button>
    </form>
    <div id="pinFeedback" class="parent-feedback"></div>`);
  document.getElementById("pinForm").onsubmit=async e=>{
    e.preventDefault();
    const p1=document.getElementById("parentPin").value.trim();
    const fb=document.getElementById("pinFeedback");
    if(!/^\d{4}$/.test(p1)){fb.textContent="PIN musí mít čtyři číslice.";return;}
    if(mode==="create"){
      const p2=document.getElementById("parentPin2").value.trim();
      if(p1!==p2){fb.textContent="PINy se neshodují.";return;}
      localStorage.setItem(PARENT_PIN_KEY,await hashPin(p1));
      renderParentDashboard();
    }else{
      const ok=(await hashPin(p1))===localStorage.getItem(PARENT_PIN_KEY);
      if(ok) renderParentDashboard(); else fb.textContent="Nesprávný PIN.";
    }
  };
}

function openParentGate(){
  if(localStorage.getItem(PARENT_PIN_KEY)){
    pinForm("Pro rodiče","Zadejte čtyřmístný PIN.","unlock");
  }else{
    pinForm("Pro rodiče","Při prvním otevření si nastavte čtyřmístný PIN. Dítě se pak do této části omylem nedostane.","create");
  }
}

function phoneticParentLabel(score){
  return score>=80 ? "🌟 výslovnost ověřena" : score>=60 ? "🙂 výslovnost se daří" : "🌱 výslovnost ještě trénuje";
}

function pronunciationLabel(score){
  const n=Number(score)||0;
  if(n>=80)return "🌟 dobře rozpoznáno";
  if(n>=60)return "🙂 většinou rozpoznáno";
  if(n>0)return "🌱 ještě trénuje";
  return "— bez pokusu";
}

function renderParentDashboard(){
  const rows=FAJN_DATA.topics.map(topic=>{
    const ts=topicState(topic.id);
    const done=(ts.stages||[]).filter(Boolean).length;
    return `<tr>
      <td><strong>${topic.emoji} ${esc(topic.cz)}</strong><small>${esc(topic.title)}</small></td>
      <td>${done}/5</td>
      <td>${ts.mastered?"🏅 Umím":ts.stages?.every(Boolean)?"✅ Dokončeno":"—"}</td>
      <td>${ts.bestPhoneticPronunciation ? phoneticParentLabel(ts.bestPhoneticPronunciation) : pronunciationLabel(ts.bestPronunciation)}</td>
    </tr>`;
  }).join("");
  const mastered=FAJN_DATA.topics.filter(t=>topicState(t.id).mastered).length;
  const completed=FAJN_DATA.topics.filter(t=>topicState(t.id).stages.every(Boolean)).length;
  const attempted=FAJN_DATA.topics.filter(t=>topicState(t.id).stages.some(Boolean)).length;
  const games=state.games||{plays:0,best:0};
  parentOverlay(`
    <button class="parent-close" data-close-parent>✕</button>
    <div class="parent-head">
      <div><p class="eyebrow">PRO RODIČE</p><h2>Jak se dítěti daří</h2></div>
      <div class="parent-summary">
        <span><b>${mastered}</b><small>zvládnutých témat</small></span>
        <span><b>${completed}</b><small>dokončených témat</small></span>
        <span><b>${attempted}</b><small>vyzkoušených témat</small></span>
        <span><b>${games.best||0}</b><small>herní rekord</small></span>
      </div>
    </div>
    <div class="parent-note">🎙️ Hodnocení mluvení ukazuje, jak dobře systém rozpoznal vyslovené slovo nebo větu. Není to odborná fonetická známka.</div>
    <div class="parent-table-wrap"><table class="parent-table"><thead><tr><th>Téma</th><th>Kroky</th><th>Stav</th><th>Mluvení</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="parent-actions">
      <button class="btn" id="changePin">🔐 Změnit PIN</button>
      <button class="btn danger-parent" id="resetProgress">🗑️ Smazat postup</button>
    </div>`);
  document.getElementById("changePin").onclick=()=>{localStorage.removeItem(PARENT_PIN_KEY);pinForm("Nový rodičovský PIN","Nastavte nový čtyřmístný PIN.","create");};
  document.getElementById("resetProgress").onclick=()=>{
    const btn=document.getElementById("resetProgress");
    if(btn.dataset.confirm!=="yes"){btn.dataset.confirm="yes";btn.textContent="Opravdu smazat celý postup?";return;}
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };
}