/* Klikací svět: odemčená místa vedou přímo do tématu */
const baseRenderHomeWorld = renderHome;

renderHome = function(){
  baseRenderHomeWorld();
  setTimeout(initWorldMap,0);
};

function initWorldMap(){
  const scene=document.getElementById("worldScene");
  if(!scene) return;
  const tip=document.getElementById("worldTip");
  document.querySelectorAll(".world-place").forEach(place=>{
    const id=place.dataset.topic;
    const ts=topicState(id);
    const unlocked=Boolean(ts.mastered);
    place.classList.toggle("is-unlocked",unlocked);
    place.classList.toggle("is-locked",!unlocked);
    place.setAttribute("aria-disabled",String(!unlocked));
    place.onclick=()=>{
      if(unlocked){
        openTopic(id);
        return;
      }
      const topic=FAJN_DATA.topics.find(t=>t.id===id);
      tip.innerHTML=`<div class="world-tip-card"><span>🔒</span><strong>${esc(topic?.cz||"Téma")}</strong><small>Nejdřív toto téma zvládni.</small><button id="goLearnLocked">Jdu se učit →</button></div>`;
      tip.classList.add("show");
      const go=document.getElementById("goLearnLocked");
      if(go) go.onclick=()=>openTopic(id);
      setTimeout(()=>tip.classList.remove("show"),3200);
    };
  });
}

// Pokud byl script načten až po prvním vykreslení, aktivuj mapu hned.
initWorldMap();