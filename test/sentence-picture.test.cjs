const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function picture(en,topicId='colours'){
 const s={window:{},esc:x=>x,smallVisual:(topic,word)=>`${topic.id}/${word.en}`};
 vm.createContext(s);vm.runInContext(fs.readFileSync(require.resolve('../data.js'),'utf8'),s);
 const code=fs.readFileSync(require.resolve('../final-polish.js'),'utf8');
 vm.runInContext(code.slice(code.indexOf('function sentencePicture('),code.indexOf('\nrenderSpeak')),s);
 return s.sentencePicture(s.window.FAJN_DATA.topics.find(t=>t.id===topicId),{en});
}
test('Blue bag sentence illustrates the bag across topic boundaries',()=>{
 assert.equal(picture('My bag is blue.'),'school/bag');
});
test('Sentence objects take priority over colour icons',()=>{
 assert.equal(picture('The sun is yellow.'),'weather/sun');
 assert.equal(picture('My hat is red.','clothes'),'clothes/hat');
 assert.equal(picture('The frog is green.','animals'),'animals/frog');
});
test('Whole words prevent red from matching scared; plurals identify objects',()=>{
 assert.equal(picture('I am scared.','emotions'),'emotions/scared');
 assert.equal(picture('I have five pencils.','numbers'),'school/pencil');
 assert.equal(picture('It is red.'),'colours/red');
});
