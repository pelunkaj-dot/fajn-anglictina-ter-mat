const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('Game picture mistakes enter review and eventual success stays helped without duplicate credit',()=>{
  const calls=[],wrong={disabled:false,dataset:{a:'kočka'},classList:{add(){}}},right={disabled:false,dataset:{a:'žába'},classList:{add(){}}};
  const q={type:'picturePick',word:{en:'frog',cz:'žába'},answer:'žába',speak:'frog'};
  const s={game:{topic:{id:'animals'},score:0,combo:0,bestCombo:0,round:0},recordPictureChoice:(...args)=>calls.push(args),document:{querySelectorAll:()=>[wrong,right],getElementById:()=>({}),querySelector:()=>({isConnected:true})},kidSound(){},speak(){},setTimeout(){},renderAdventure(){},gameVisualPrompt(){},buildGameQuestions(){},renderAdventureFinish(){}};
  vm.createContext(s);vm.runInContext(fs.readFileSync(require.resolve('../game-voice.js'),'utf8'),s);
  s.answerYoungGame(wrong,q);s.answerYoungGame(right,q);s.answerYoungGame(right,q);
  assert.equal(calls.length,2);assert.equal(calls[0][2],false);assert.equal(calls[1][2],true);assert.equal(calls[1][3],false);assert.equal(s.game.score,1);
});
