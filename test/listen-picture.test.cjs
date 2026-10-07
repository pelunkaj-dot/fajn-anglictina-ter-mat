const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
test('Body recognition offers four distinct illustrations, hides written answers and plays the target',()=>{
 const elements=new Map();let html='',spoken='',advanced=false;
 const s={window:{},esc:x=>x,shuffle:x=>x,shell:x=>{html=x},speak:x=>{spoken=x},scheduleLessonAdvance:()=>{advanced=true},youngVisual:()=>'',renderRecognize:()=>{},gameVisualPrompt:()=>'',storyScene:()=>'',document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id)},querySelectorAll:()=>[]}};
 vm.createContext(s);vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),s);
 s.currentTopic=s.window.FAJN_DATA.topics.find(t=>t.id==='body');s.currentIndex=0;
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');vm.runInContext(app.slice(app.indexOf('function recognitionListenControl'),app.indexOf('function renderRecognize')),s);
 vm.runInContext(fs.readFileSync(path.join(root,'topic-expansion.js'),'utf8'),s);s.renderRecognize();
 assert.match(html,/aria-label="Poslechnout slovo"/);assert.match(html,/<svg/);
 assert.doesNotMatch(html,/class="bigword"|<strong>/);
 const images=[...html.matchAll(/src="(assets\/body\/[^" ]+)"/g)].map(x=>x[1]);assert.equal(new Set(images).size,4);
 for(const image of images)assert.ok(fs.statSync(path.join(root,image)).size>1000);
 elements.get('listen').onclick();assert.equal(spoken,s.currentTopic.words[0].en);assert.equal(advanced,false);
});
