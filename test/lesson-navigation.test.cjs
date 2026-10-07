const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function navigation(){
 let panel={isConnected:true};const timers=[];let correct=false;
 const s={window:{},document:{querySelector:()=>panel,getElementById:()=>({classList:{contains:()=>correct}}),querySelectorAll:()=>[]},
 topicState:()=>({stages:[true,false,false,false,false]}),setTimeout:fn=>timers.push(fn),renderStage:()=>{panel.isConnected=false;panel={isConnected:true};}};
 vm.createContext(s);
 const code=fs.readFileSync(require.resolve('../app.js'),'utf8');
 vm.runInContext('let currentTopic={id:"colours",words:Array(10)};let currentStage=0;let currentIndex=3;let quizScore=0;let lessonBusy=false;const lessonPositions=new Map();'+code.slice(code.indexOf('function pathHtml(){'),code.indexOf('function shell(body){')),s);
 return {s,timers,run:code=>vm.runInContext(code,s),correct:()=>{correct=true;}};
}
test('All five lesson sections are buttons and jumping preserves position without awarding completion',()=>{
 const h=navigation();assert.equal((h.s.pathHtml().match(/<button /g)||[]).length,5);assert.match(h.s.pathHtml(),/aria-current="step"/);
 h.s.navigateLessonStage(3);assert.equal(h.run('currentStage'),3);assert.equal(h.run('currentIndex'),0);
 h.s.navigateLessonStage(0);assert.equal(h.run('currentIndex'),3);
 assert.equal(h.s.topicState().stages.filter(Boolean).length,1);
});
test('Recording prevents section switching; navigation resumes after recording',()=>{
 const h=navigation();h.s.setLessonBusy(true);h.s.navigateLessonStage(4);assert.equal(h.run('currentStage'),0);
 h.s.setLessonBusy(false);h.s.navigateLessonStage(4);assert.equal(h.run('currentStage'),4);
});
test('A pending old answer cannot advance a different section or double-count a quiz answer',()=>{
 const h=navigation();h.s.navigateLessonStage(4);h.run('currentIndex=2;quizScore=2');h.correct();
 h.s.scheduleLessonAdvance(()=>h.run('currentIndex++'),550);h.s.navigateLessonStage(0);
 h.timers[0]();assert.equal(h.run('currentIndex'),3);
 h.s.navigateLessonStage(4);assert.equal(h.run('currentIndex'),3);assert.equal(h.run('quizScore'),2);
});
