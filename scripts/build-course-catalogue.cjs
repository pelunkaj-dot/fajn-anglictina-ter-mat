// Publish the same reviewed phrases and reply groups to the server allowlist.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),gateway=path.resolve(root,'../fdc-gateway');
const s={window:{}};vm.createContext(s);vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),s);s.FAJN_DATA=s.window.FAJN_DATA;vm.runInContext(fs.readFileSync(path.join(root,'curriculum.js'),'utf8'),s);
const old=fs.readFileSync(path.join(gateway,'lib/english-model-texts.js'),'utf8');
const existing=JSON.parse(old.slice(old.indexOf('['),old.lastIndexOf(']')+1));
const texts=new Set(existing),responseGroups={};
for(const topic of s.FAJN_DATA.topics)for(const level of [1,2,3]){
  for(const unit of s.courseUnits(topic,level)){
    texts.add(unit.en);if(unit.prompt)texts.add(unit.prompt);for(const answer of unit.answers)texts.add(answer);
    if(level===3)responseGroups[s.courseResponseGroup(topic,unit)]=unit.answers;
  }
  for(const line of s.courseStory(topic,level))texts.add(line.en);
}
const catalogue={version:1,texts:[...texts],responseGroups};
fs.writeFileSync(path.join(root,'course-catalogue.json'),JSON.stringify(catalogue,null,2)+'\n');
fs.writeFileSync(path.join(gateway,'lib/course-response-groups.json'),JSON.stringify(responseGroups,null,2)+'\n');
fs.writeFileSync(path.join(gateway,'lib/english-model-texts.js'),'// Fixed reviewed British course phrases. Generated from the course catalogue.\nexport const englishModelTexts = new Set('+JSON.stringify([...texts],null,2)+');\n');
console.log(`${s.FAJN_DATA.topics.length} topics, ${texts.size} British models, ${Object.keys(responseGroups).length} response groups`);
