/* British English curriculum: word -> meaning in a phrase -> a useful reply.
   Pictures describe the complete meaning. Personal choices have no single
   'correct preference'; only the reply to the child's chosen picture is checked. */
const COURSE_LEVELS=[
  {id:1,name:'Objevuji',icon:'🌱',description:'Poslouchám, poznávám a říkám slova.'},
  {id:2,name:'Spojuji',icon:'🌿',description:'Rozumím krátkým větám a spojuji slova.'},
  {id:3,name:'Domluvím se',icon:'🌳',description:'Vyberu si a odpovím v malé situaci.'}
];
function courseScene(topic,word,extra={}){return {objects:[{topic,word,...extra}]};}
function coursePhrase(id,en,cz,scene){return {id,en,cz,scene,answers:[en]};}
function courseReply(id,prompt,promptCz,en,cz,scene,answers=[]){return {id,prompt,promptCz,en,cz,scene,answers:[en,...answers]};}
const COURSE_CURRICULUM={};
function phrase(topic,id,en,cz,word,extra={}){return coursePhrase(id,en,cz,courseScene(topic,word,extra));}
function reply(topic,id,prompt,promptCz,en,cz,word,extra={},answers=[]){return courseReply(id,prompt,promptCz,en,cz,courseScene(topic,word,extra),answers);}

COURSE_CURRICULUM.animals={
  phrases:[phrase('animals','dog','It is a dog.','Je to pes.','dog'),phrase('animals','small-cat','The cat is small.','Kočka je malá.','cat',{size:'small'}),phrase('animals','big-cat','The cat is big.','Kočka je velká.','cat',{size:'big'}),phrase('animals','two-rabbits','Two rabbits.','Dva králíci.','rabbit',{count:2}),phrase('animals','three-rabbits','Three rabbits.','Tři králíci.','rabbit',{count:3}),phrase('animals','one-bird','I can see a bird.','Vidím ptáka.','bird')],
  replies:['dog','cat','rabbit','frog'].map((word,i)=>reply('animals','like-'+word,'What is your favourite animal?','Které zvíře máš nejraději?',`I like ${word+'s'}.`,['Líbí se mi psi.','Líbí se mi kočky.','Líbí se mi králíci.','Líbí se mi žáby.'][i],word,{},[`My favourite animal is a ${word}.`,`I like ${word+'s'} best.`,`A ${word}.`,`${word[0].toUpperCase()+word.slice(1)}s.`])),
  story:[['Look! A small cat.','Podívej! Malá kočka.','small-cat'],['I can see two rabbits.','Vidím dva králíky.','two-rabbits'],['What is your favourite animal?','Které zvíře máš nejraději?',null],['I like dogs.','Líbí se mi psi.','like-dog']]
};
COURSE_CURRICULUM.colours={
  phrases:['red','blue','green','yellow','pink','purple'].map((w,i)=>phrase('colours',w,`It is ${w}.`,['Je to červené.','Je to modré.','Je to zelené.','Je to žluté.','Je to růžové.','Je to fialové.'][i],w)),
  replies:['red','blue','green','yellow'].map((w,i)=>reply('colours','choose-'+w,'What colour would you like?','Kterou barvu si vybereš?',`${w[0].toUpperCase()+w.slice(1)}, please.`,['Červenou, prosím.','Modrou, prosím.','Zelenou, prosím.','Žlutou, prosím.'][i],w,{},[`I would like ${w}, please.`,`I'd like ${w}, please.`])),
  story:[['What colour would you like?','Kterou barvu si vybereš?',null],['Red, please.','Červenou, prosím.','choose-red'],['Here you are.','Tady máš.','choose-red'],['Thank you!','Děkuji!',null]]
};
COURSE_CURRICULUM.food={
  phrases:[phrase('food','apple','I have an apple.','Mám jablko.','apple'),phrase('food','two-apples','Two apples.','Dvě jablka.','apple',{count:2}),phrase('food','three-apples','Three apples.','Tři jablka.','apple',{count:3}),phrase('food','water','I drink water.','Piju vodu.','water'),phrase('food','milk','I drink milk.','Piju mléko.','milk'),phrase('food','bread','This is bread.','Tohle je chléb.','bread')],
  replies:[reply('food','want-water','What would you like?','Co si dáš?','Can I have some water, please?','Můžu dostat trochu vody, prosím?','water',{},['Some water, please.','I would like some water, please.']),reply('food','want-milk','What would you like?','Co si dáš?','Can I have some milk, please?','Můžu dostat trochu mléka, prosím?','milk',{},['Some milk, please.','I would like some milk, please.']),reply('food','want-apple','What would you like?','Co si dáš?','Can I have an apple, please?','Můžu dostat jablko, prosím?','apple',{},['An apple, please.','I would like an apple, please.']),reply('food','want-banana','What would you like?','Co si dáš?','Can I have a banana, please?','Můžu dostat banán, prosím?','banana',{},['A banana, please.','I would like a banana, please.'])],
  story:[['I am hungry.','Mám hlad.',null],['What would you like?','Co si dáš?',null],['An apple, please.','Jablko, prosím.','want-apple'],['Here you are.','Tady máš.','want-apple']]
};
COURSE_CURRICULUM.numbers={
  phrases:[1,2,3,4,5,6].map((n,i)=>phrase('food','apples-'+n,`${['One apple','Two apples','Three apples','Four apples','Five apples','Six apples'][i]}.`,['Jedno jablko.','Dvě jablka.','Tři jablka.','Čtyři jablka.','Pět jablek.','Šest jablek.'][i],'apple',{count:n})),
  replies:[1,2,3,4].map((n,i)=>reply('food','please-'+n,'How many apples would you like?','Kolik jablek si dáš?',`${['One apple','Two apples','Three apples','Four apples'][i]}, please.`,['Jedno jablko, prosím.','Dvě jablka, prosím.','Tři jablka, prosím.','Čtyři jablka, prosím.'][i],'apple',{count:n},[`I would like ${['one apple','two apples','three apples','four apples'][i]}, please.`])),
  story:[['How many apples would you like?','Kolik jablek si dáš?',null],['Two apples, please.','Dvě jablka, prosím.','please-2'],['One, two. Here you are.','Jedno, dvě. Tady máš.','please-2'],['Thank you!','Děkuji!',null]]
};
COURSE_CURRICULUM.body={
  phrases:[['head','This is my head.','Tohle je moje hlava.'],['nose','This is my nose.','Tohle je můj nos.'],['mouth','This is my mouth.','Tohle jsou moje ústa.'],['eyes','These are my eyes.','Tohle jsou moje oči.'],['ears','These are my ears.','Tohle jsou moje uši.'],['hands','These are my hands.','Tohle jsou moje ruce.']].map(([w,en,cz])=>phrase('body',w,en,cz,w)),
  replies:[['head','This is my head.','Tohle je moje hlava.'],['nose','This is my nose.','Tohle je můj nos.'],['hands','These are my hands.','Tohle jsou moje ruce.'],['feet','These are my feet.','Tohle jsou moje chodidla.']].map(([w,en,cz])=>reply('body','show-'+w,'What can you show me?','Kterou část těla mi ukážeš?',en,cz,w,{},[en.replace('This is','It is').replace('These are','They are')])),
  story:[['This is my head.','Tohle je moje hlava.','head'],['And this is my nose.','A tohle je můj nos.','nose'],['These are my hands.','Tohle jsou moje ruce.','hands'],['These are my feet.','Tohle jsou moje chodidla.','show-feet']]
};
COURSE_CURRICULUM.family={
  phrases:[['mum','maminka'],['dad','tatínek'],['sister','sestra'],['brother','bratr'],['grandma','babička'],['grandpa','dědeček']].map(([w,cz])=>phrase('family',w,`This is my ${w}.`,`Tohle je ${['dad','brother','grandpa'].includes(w)?'můj':'moje'} ${cz}.`,w)),
  replies:[['mum','maminka'],['dad','tatínek'],['grandma','babička'],['grandpa','dědeček']].map(([w,cz])=>reply('family','who-'+w,'Who is this?','Kdo to je?',`This is my ${w}.`,`Tohle je ${['dad','grandpa'].includes(w)?'můj':'moje'} ${cz}.`,w,{},[`It is my ${w}.`,`It's my ${w}.`])),
  story:[['Look at this family picture.','Podívej se na obrázek rodiny.',null],['Who is this?','Kdo to je?',null],['This is my grandma.','Tohle je moje babička.','who-grandma'],['And this is my grandpa.','A tohle je můj dědeček.','who-grandpa']]
};
COURSE_CURRICULUM.clothes={
  phrases:[['hat','I need my hat.','Potřebuji čepici.'],['coat','I need my coat.','Potřebuji kabát.'],['shoes','I need my shoes.','Potřebuji boty.'],['socks','I need my socks.','Potřebuji ponožky.'],['gloves','I need my gloves.','Potřebuji rukavice.'],['T-shirt','This is my T-shirt.','Tohle je moje tričko.']].map(([w,en,cz])=>phrase('clothes',w,en,cz,w)),
  replies:[['hat','čepici'],['coat','kabát'],['shoes','boty'],['gloves','rukavice']].map(([w,cz])=>reply('clothes','need-'+w,'What do you need?','Co potřebuješ?',`I need my ${w}.`,`Potřebuji ${cz}.`,w,{},[`I need ${w==='hat'||w==='coat'?'a ':''}${w}.`])),
  story:[['It is cold.','Je zima.',null],['What do you need?','Co potřebuješ?',null],['I need my coat.','Potřebuji kabát.','need-coat'],['And I need my gloves.','A potřebuji rukavice.','need-gloves']]
};
COURSE_CURRICULUM.house={
  phrases:[phrase('house','house','This is a house.','Tohle je dům.','house'),phrase('house','kitchen','This is the kitchen.','Tohle je kuchyně.','kitchen'),phrase('house','garden','This is the garden.','Tohle je zahrada.','garden'),phrase('house','one-chair','One chair.','Jedna židle.','chair'),phrase('house','two-chairs','Two chairs.','Dvě židle.','chair',{count:2}),phrase('house','bed','This is my bed.','Tohle je moje postel.','bed')],
  replies:[['kitchen','kuchyně'],['garden','zahrady']].map(([w,cz])=>reply('house','go-'+w,'Where shall we go?','Kam půjdeme?',`Let's go to the ${w}.`,`Pojďme do ${cz}.`,w,{},[`We can go to the ${w}.`])).concat([reply('house','see-chair','What can you see?','Co vidíš?','I can see a chair.','Vidím židli.','chair',{},['There is a chair.']),reply('house','see-table','What can you see?','Co vidíš?','I can see a table.','Vidím stůl.','table',{},['There is a table.'])]),
  story:[['Where shall we go?','Kam půjdeme?',null],["Let's go to the garden.",'Pojďme do zahrady.','go-garden'],['What can you see?','Co vidíš?',null],['I can see a chair.','Vidím židli.','see-chair']]
};
COURSE_CURRICULUM.school={
  phrases:[phrase('school','book','I have a book.','Mám knihu.','book'),phrase('school','pencil','I have a pencil.','Mám tužku.','pencil'),phrase('school','two-pencils','I have two pencils.','Mám dvě tužky.','pencil',{count:2}),phrase('school','three-pencils','I have three pencils.','Mám tři tužky.','pencil',{count:3}),phrase('school','bag','This is my bag.','Tohle je moje taška.','bag'),phrase('school','ruler','I have a ruler.','Mám pravítko.','ruler')],
  replies:[['pencil','a pencil','tužku'],['book','a book','knihu'],['ruler','a ruler','pravítko'],['bag','a bag','tašku']].map(([w,n,cz])=>reply('school','borrow-'+w,'What do you need?','Co potřebuješ?',`Can I have ${n}, please?`,`Můžu dostat ${cz}, prosím?`,w,{},[`I need ${n}, please.`,`${n[0].toUpperCase()+n.slice(1)}, please.`])),
  story:[['What do you need?','Co potřebuješ?',null],['Can I have a pencil, please?','Můžu dostat tužku, prosím?','borrow-pencil'],['Here you are.','Tady máš.','borrow-pencil'],['Thank you!','Děkuji!',null]]
};
COURSE_CURRICULUM.weather={
  phrases:[['sun','The sun is shining.','Slunce svítí.'],['rain','It is raining.','Prší.'],['snow','It is snowing.','Sněží.'],['wind','It is windy.','Fouká vítr.'],['fog','It is foggy.','Je mlha.'],['rainbow','I can see a rainbow.','Vidím duhu.']].map(([w,en,cz])=>phrase('weather',w,en,cz,w)),
  replies:[['sun','It is sunny.','Je slunečno.'],['rain','It is raining.','Prší.'],['snow','It is snowing.','Sněží.'],['wind','It is windy.','Fouká vítr.']].map(([w,en,cz])=>reply('weather','today-'+w,'What is the weather like?','Jaké je počasí?',en,cz,w,{},[en.replace('It is',"It's")])),
  story:[['What is the weather like?','Jaké je počasí?',null],['It is raining.','Prší.','today-rain'],['Now the sun is shining.','Teď svítí slunce.','sun'],['Look! A rainbow!','Podívej! Duha!','rainbow']]
};
COURSE_CURRICULUM.transport={
  phrases:[phrase('transport','car','It is a car.','Je to auto.','car'),phrase('transport','two-cars','Two cars.','Dvě auta.','car',{count:2}),phrase('transport','three-cars','Three cars.','Tři auta.','car',{count:3}),phrase('transport','bus','I go by bus.','Jedu autobusem.','bus'),phrase('transport','train','I go by train.','Jedu vlakem.','train'),phrase('transport','bike','I go by bike.','Jedu na kole.','bike')],
  replies:[['bus','autobusem'],['train','vlakem'],['bike','na kole'],['boat','lodí']].map(([w,cz])=>reply('transport','travel-'+w,'How shall we travel?','Jak pojedeme?',`Let's go by ${w}.`,`Pojeďme ${cz}.`,w,{},[`We can go by ${w}.`,`I would like to go by ${w}.`])),
  story:[['How shall we travel?','Jak pojedeme?',null],["Let's go by bus.",'Pojeďme autobusem.','travel-bus'],['Look! A train!','Podívej! Vlak!','train'],['We can go by train too.','Můžeme jet také vlakem.','travel-train']]
};
COURSE_CURRICULUM.emotions={
  phrases:[['happy','I am happy.','Mám radost.'],['sad','I am sad.','Je mi smutno.'],['angry','I am angry.','Zlobím se.'],['scared','I am scared.','Mám strach.'],['tired','I am tired.','Jsem unavený/unavená.'],['excited','I am excited.','Jsem nadšený/nadšená.']].map(([w,en,cz])=>phrase('emotions',w,en,cz,w)),
  replies:[['happy','Mám radost.'],['sad','Je mi smutno.'],['tired','Jsem unavený/unavená.'],['excited','Jsem nadšený/nadšená.']].map(([w,cz])=>reply('emotions','feel-'+w,'How do you feel?','Jak se cítíš?',`I am ${w}.`,cz,w,{},[`I'm ${w}.`,`I feel ${w}.`])),
  story:[['How do you feel?','Jak se cítíš?',null],['I am sad.','Je mi smutno.','feel-sad'],['Would you like to play?','Chceš si hrát?',null],['Yes, please.','Ano, prosím.',null]]
};

/* Four real situations, independent of any assumed family or real mood. */
const COURSE_SITUATIONS=[
  {id:'hello',title:'Hello, friends!',cz:'Seznamujeme se',emoji:'👋',words:[['hello','Ahoj!','hello'],['goodbye','Na shledanou!','goodbye'],['girl','dívka','terezka'],['boy','chlapec','matysek']],
   phrases:[['hello','Hello, Terezka!','Ahoj, Terezko!'],['goodbye','Goodbye, Matýsek!','Na shledanou, Matýsku!'],['thanks','Thank you!','Děkuji!'],['please','Yes, please.','Ano, prosím.']],
   replies:[['name-lily','What is your name?','Jak se jmenuješ?',"My name is Lily.",'Jmenuji se Lily.','terezka',["I am Lily.","I'm Lily."]],['name-tom','What is your name?','Jak se jmenuješ?',"My name is Tom.",'Jmenuji se Tom.','matysek',["I am Tom.","I'm Tom."]],['greet','Hello!','Ahoj!','Hello!','Ahoj!','hello',['Hi!']],['bye','Goodbye!','Na shledanou!','Goodbye!','Na shledanou!','goodbye',['Bye!']]],
   story:[['Hello!','Ahoj!','hello'],['What is your name?','Jak se jmenuješ?',null],['My name is Lily.','Jmenuji se Lily.','name-lily'],['Nice to meet you.','Těší mě.',null]]},
  {id:'snack',title:'Snack time',cz:'Svačina',emoji:'🧺',words:[['apple','jablko','apple'],['banana','banán','banana'],['water','voda','water'],['milk','mléko','milk']],
   phrases:[['apple','An apple, please.','Jablko, prosím.'],['banana','A banana, please.','Banán, prosím.'],['water','Some water, please.','Trochu vody, prosím.'],['milk','Some milk, please.','Trochu mléka, prosím.']],
   replies:[['apple','What would you like?','Co si dáš?','Can I have an apple, please?','Můžu dostat jablko, prosím?','apple',['An apple, please.']],['banana','What would you like?','Co si dáš?','Can I have a banana, please?','Můžu dostat banán, prosím?','banana',['A banana, please.']],['water','What would you like?','Co si dáš?','Can I have some water, please?','Můžu dostat trochu vody, prosím?','water',['Some water, please.']],['milk','What would you like?','Co si dáš?','Can I have some milk, please?','Můžu dostat trochu mléka, prosím?','milk',['Some milk, please.']]],
   story:[['What would you like?','Co si dáš?',null],['Some water, please.','Trochu vody, prosím.','water'],['Here you are.','Tady máš.','water'],['Thank you!','Děkuji!',null]]},
  {id:'playtime',title:'Let’s play!',cz:'Hra s kamarádem',emoji:'🪁',words:[['ball','míč','ball'],['teddy bear','plyšový medvídek','teddy'],['kite','drak','kite'],['blocks','kostky','blocks']],
   phrases:[['ball','I have a ball.','Mám míč.'],['teddy','I have a teddy bear.','Mám plyšového medvídka.'],['kite','I have a kite.','Mám draka.'],['blocks','I have some blocks.','Mám kostky.']],
   replies:[['ball','What shall we play with?','S čím si budeme hrát?',"Let's play with the ball.",'Pojďme si hrát s míčem.','ball',['We can play with the ball.']],['teddy','What shall we play with?','S čím si budeme hrát?',"Let's play with the teddy bear.",'Pojďme si hrát s medvídkem.','teddy',['We can play with the teddy bear.']],['kite','What shall we do?','Co budeme dělat?',"Let's fly the kite.",'Pojďme pouštět draka.','kite',['We can fly the kite.']],['blocks','What shall we play with?','S čím si budeme hrát?',"Let's play with the blocks.",'Pojďme si hrát s kostkami.','blocks',['We can play with the blocks.']]],
   story:[['Would you like to play?','Chceš si hrát?',null],['Yes, please.','Ano, prosím.',null],["Let's play with the ball.",'Pojďme si hrát s míčem.','ball'],['Good idea!','To je dobrý nápad!',null]]},
  {id:'classroom',title:'In the classroom',cz:'Ve třídě',emoji:'🏫',words:[['pencil','tužka','pencil'],['book','kniha','book'],['ruler','pravítko','ruler'],['bag','taška','bag']],
   phrases:[['pencil','I need a pencil.','Potřebuji tužku.'],['book','I need a book.','Potřebuji knihu.'],['ruler','I need a ruler.','Potřebuji pravítko.'],['bag','I need my bag.','Potřebuji tašku.']],
   replies:[['pencil','What do you need?','Co potřebuješ?','Can I have a pencil, please?','Můžu dostat tužku, prosím?','pencil',['A pencil, please.']],['book','What do you need?','Co potřebuješ?','Can I have a book, please?','Můžu dostat knihu, prosím?','book',['A book, please.']],['ruler','What do you need?','Co potřebuješ?','Can I have a ruler, please?','Můžu dostat pravítko, prosím?','ruler',['A ruler, please.']],['bag','What are you looking for?','Co hledáš?','I am looking for my bag.','Hledám svou tašku.','bag',["I'm looking for my bag."]]],
   story:[['What do you need?','Co potřebuješ?',null],['A pencil, please.','Tužku, prosím.','pencil'],['Here you are.','Tady máš.','pencil'],['Thank you!','Děkuji!',null]]}
];
function situationScene(id,key){
  if(id==='snack')return courseScene('food',key);
  if(id==='classroom')return courseScene('school',key);
  return {situation:id,prop:key};
}
for(const situation of COURSE_SITUATIONS){
  COURSE_CURRICULUM[situation.id]={
    phrases:situation.phrases.map(([id,en,cz])=>coursePhrase(id,en,cz,situationScene(situation.id,id))),
    replies:situation.replies.map(([id,prompt,promptCz,en,cz,key,answers])=>courseReply(id,prompt,promptCz,en,cz,situationScene(situation.id,key),answers)),story:situation.story
  };
  FAJN_DATA.topics.push({id:situation.id,title:situation.title,cz:situation.cz,emoji:situation.emoji,situation:true,words:situation.words.map(([en,cz,key])=>({en,cz,scene:situationScene(situation.id,key)})),sentences:[],story:[]});
}
function courseUnits(topic,level){
  if(level===1)return topic.words.map((word,i)=>({id:'word-'+i,en:word.en,cz:word.cz,scene:word.scene||courseScene(topic.id,word.en),answers:[word.en]}));
  return COURSE_CURRICULUM[topic.id][level===2?'phrases':'replies'];
}
function courseStory(topic,level){
  if(level===1){
    const plans={
      colours:[['Look! Red.','Podívej! Červená.','red'],['Blue!','Modrá!','blue'],['Yellow!','Žlutá!','yellow'],['A rainbow!','Duha!','weather/rainbow']],
      animals:[['Look! A dog!','Podívej! Pes!','dog'],['Hello, dog!','Ahoj, pejsku!','dog'],['Look! A cat!','Podívej! Kočka!','cat'],['Hello, cat!','Ahoj, kočko!','cat']],
      food:[['An apple!','Jablko!','apple'],['Yum!','Mňam!','apple'],['Some water.','Trochu vody.','water'],['Thank you!','Děkuji!',null]],
      numbers:[['One apple.','Jedno jablko.','food/apple',1],['Two apples.','Dvě jablka.','food/apple',2],['Three apples.','Tři jablka.','food/apple',3],['Four apples.','Čtyři jablka.','food/apple',4]],
      body:[['My head.','Moje hlava.','head'],['My nose.','Můj nos.','nose'],['My hands.','Moje ruce.','hands'],['My feet.','Moje chodidla.','feet']],
      family:[['My mum.','Moje maminka.','mum'],['Hello, Mum!','Ahoj, mami!','mum'],['My dad.','Můj tatínek.','dad'],['Hello, Dad!','Ahoj, tati!','dad']],
      clothes:[['My hat.','Moje čepice.','hat'],['My coat.','Můj kabát.','coat'],['My shoes.','Moje boty.','shoes'],['Ready!','Hotovo!',null]],
      house:[['My house.','Můj dům.','house'],['The door.','Dveře.','door'],['Hello!','Ahoj!',null],['Come in!','Pojď dál!',null]],
      school:[['My bag.','Moje taška.','bag'],['A book.','Kniha.','book'],['A pencil.','Tužka.','pencil'],['Ready!','Hotovo!',null]],
      weather:[['Sun!','Slunce!','sun'],['Rain!','Déšť!','rain'],['A rainbow!','Duha!','rainbow'],['Wow!','Jé!',null]],
      transport:[['A bus!','Autobus!','bus'],['A train!','Vlak!','train'],['A plane!','Letadlo!','plane'],['Wow!','Jé!',null]],
      emotions:[['I am sad.','Je mi smutno.','sad'],['Hello!','Ahoj!',null],["Let's play!",'Pojďme si hrát!',null],['I am happy.','Mám radost.','happy']],
      hello:[['Hello!','Ahoj!','hello'],['Hi!','Ahoj!','hello'],['Bye!','Ahoj!','goodbye'],['Goodbye!','Na shledanou!','goodbye']],
      snack:[['An apple?','Jablko?','apple'],['Yes, please.','Ano, prosím.','apple'],['Here you are.','Tady máš.','apple'],['Thank you!','Děkuji!',null]],
      playtime:[['A ball!','Míč!','ball'],["Let's play!",'Pojďme si hrát!','ball'],['Yes!','Ano!',null],['Great!','Paráda!',null]],
      classroom:[['A pencil?','Tužku?','pencil'],['Yes, please.','Ano, prosím.','pencil'],['Here you are.','Tady máš.','pencil'],['Thank you!','Děkuji!',null]]
    };
    return plans[topic.id].map(([en,cz,key,count],i)=>{let scene={characters:true};if(key){if(topic.situation)scene=situationScene(topic.id,key);else{const [other,word]=key.includes('/')?key.split('/'):[topic.id,key];scene=courseScene(other,word,count?{count}:{});}}return {id:'story-'+i,en,cz,scene,speaker:i%2?'Matýsek':'Terezka',answers:[en]};});
  }
  const plan=COURSE_CURRICULUM[topic.id];
  return plan.story.map(([en,cz,id],i)=>({id:'story-'+i,en,cz,speaker:i%2?'Matýsek':'Terezka',scene:[...plan.phrases,...plan.replies].find(u=>u.id===id)?.scene||{characters:true},answers:[en]}));
}
function courseResponseGroup(topic,unit){return `${topic.id}:${unit.id}`;}
function courseSpeakingUnits(topic,level){
  const units=courseUnits(topic,level);
  return level===3?units.filter((unit,i)=>units.findIndex(other=>other.prompt===unit.prompt)===i):units;
}
