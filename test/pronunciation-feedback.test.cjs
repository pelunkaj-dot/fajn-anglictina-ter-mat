const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { encodeAssessmentWav, phoneticProgressScore } = require('../pronunciation-feedback');

test('WAV is mono PCM16 at 16 kHz, with valid lengths and clipped samples', async () => {
  const b = Buffer.from(await encodeAssessmentWav(new Float32Array([-2, -1, 0, 1, 2])).arrayBuffer());
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.length, 54); assert.equal(b.readUInt32LE(4), 46);
  assert.equal(b.readUInt16LE(20), 1); assert.equal(b.readUInt16LE(22), 1); assert.equal(b.readUInt32LE(24), 16000);
  assert.equal(b.readUInt16LE(34), 16); assert.equal(b.readUInt32LE(40), 10);
  assert.deepEqual([44, 46, 48, 50, 52].map(i => b.readInt16LE(i)), [-32768, -32768, 0, 32767, 32767]);
});

test('Legacy recognition 100 and unavailable phonetics cannot unlock phonetic achievements', () => {
  assert.equal(phoneticProgressScore({ score: 100 }), 0);
  assert.equal(phoneticProgressScore({ score: 100, pronunciation: { status: 'unavailable' }, feedback: { level: 'content-only' } }), 0);
  assert.equal(phoneticProgressScore({ pronunciation: { status: 'assessed' }, feedback: { level: 'retry' } }), 30);
});

function helper(fetch) {
  const sandbox = { Blob, FormData, AbortController, setTimeout, clearTimeout, window: {}, API_PRON: 'https://test.invalid', fetch,
    esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])) };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../pronunciation-feedback.js'), 'utf8'), sandbox);
  return sandbox;
}

test('Legacy deployment is displayed as unavailable phonetic assessment', async () => {
  const h = helper(async (_url, options) => {
    assert.equal(options.body.get('language'), 'en-GB'); assert.equal(options.body.get('phoneticAssessment'), 'true');
    assert.equal(options.body.get('audio').type, 'audio/mp4');
    return Response.json({ score: 100, transcript: 'frog' });
  });
  const result = await h.assessChildSpeech(new Blob([new Uint8Array(500)], { type: 'audio/mp4' }), 'frog');
  assert.equal(result.feedback.passed, false); assert.equal(result.feedback.level, 'content-only');
});

test('Child feedback contains advice and escapes returned text; never exposes scores', () => {
  const h = helper();
  const html = h.childPronunciationHtml({ score: 94, pronunciationScore: 94,
    feedback: { level: 'retry', passed: false, title: 'Poslechni si vzor znovu.', tip: '<img src=x onerror=alert(1)> Anglické R.' } });
  assert.match(html, /Anglické R/); assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /94|%|<img/);
});

test('All active speaking paths use the shared assessment and feedback', () => {
  for (const file of ['young-learners.js', 'final-polish.js', 'story-roleplay.js', 'game-voice.js']) {
    const s = fs.readFileSync(require.resolve(`../${file}`), 'utf8');
    assert.match(s, /assessChildSpeech\(blob,/); assert.match(s, /childPronunciationHtml\(data/);
    assert.doesNotMatch(s, /Number\(data.score\)/);
  }
});

test('Mixed frog result shows each sound and three progress bands without percentages', () => {
  const h = helper();
  const html = h.childPronunciationHtml({words:[{word:'frog',ok:true}], pronunciation:{status:'assessed',words:[{word:'frog',accuracyScore:82,phonemes:[100,72,93,91].map(accuracyScore=>({accuracyScore}))}],issues:[{word:'frog',expected:'g',accuracyScore:54}]},feedback:{level:'retry',passed:false,title:'Poslechni si vzor znovu.',tip:'Zkus G s hlasem.'}});
  assert.match(html, /✓ Správné slovo/);
  assert.match(html, /<b>F<\/b><small>[^<]*<\/small><span>🌟 Povedlo se/);
  assert.match(html, /<b>R<\/b><small>[^<]*<\/small><span>🙂 Už to jde/);
  assert.match(html, /<b>G<\/b><small>[^<]*<\/small><span>👂 Zkus ještě/);
  assert.doesNotMatch(html, /82|100|72|93|91|54|%/);
});
test('Unknown or differently sized phoneme sequences are not assigned guessed letters', () => {
  const h = helper();
  const html = h.childPronunciationParts({pronunciation:{status:'assessed',words:[{word:'frog',accuracyScore:70,phonemes:[{accuracyScore:60}]}]}});
  assert.match(html, /1\. hláska/); assert.doesNotMatch(html, /<b>F<\/b>/);
  assert.equal(h.childPronunciationParts({pronunciation:{status:'unavailable',words:[{word:'frog',accuracyScore:100}]}}), '');
});
test('Confirmed TH substitution stays a correction even at the middle score threshold', () => {
  const h=helper();
  const html=h.childPronunciationParts({pronunciation:{status:'assessed',words:[{word:'this',accuracyScore:85,phonemes:[85,90,95].map(accuracyScore=>({accuracyScore}))}],issues:[{type:'th-substitution',word:'this',expected:'ð',accuracyScore:65}]}});
  assert.match(html, /<b>TH<\/b><small>[^<]*<\/small><span>👂 Zkus ještě/);
});
test('Accepted clear sounds have consistent praise in the word row and parts heading', () => {
  const h = helper();
  const html = h.childPronunciationHtml({ words: [{ word: 'blue', ok: true }],
    pronunciation: { status: 'assessed', words: [{ word: 'blue', accuracyScore: 68, phonemes: [95,90,94].map(accuracyScore => ({ accuracyScore })) }], issues: [] },
    feedback: { level: 'good', passed: true, needsPractice: false, title: 'Dobře, povedlo se!', tip: 'Můžeš pokračovat.' } });
  assert.match(html, /<b>Co se povedlo<\/b>/);
  assert.match(html, /<b>blue<\/b><span class="clear"><small>Výslovnost celého slova<\/small>🌟 Povedlo se/);
  assert.doesNotMatch(html, /Už to jde|zkusit|Zkus ještě|68|95|90|94|%/);
});

test('Blue explains content, whole-word pronunciation and B/L/long vowel separately', () => {
  const h = helper();
  const html = h.childPronunciationParts({words:[{word:'blue',ok:true}], pronunciation:{status:'assessed',words:[{word:'blue',accuracyScore:90,phonemes:[90,90,90].map(accuracyScore=>({accuracyScore}))}],issues:[]}});
  assert.match(html, /Řekl\/a jsi správné slovo/);
  assert.match(html, /Výslovnost celého slova/);
  assert.match(html, /Jak zněly jednotlivé hlásky/);
  assert.match(html, /<b>B<\/b>/); assert.match(html, /<b>L<\/b>/);
  assert.match(html, /<b>dlouhé U<\/b>/);
  assert.match(html, /britským vzorem/);
  assert.doesNotMatch(html, /1\. hláska|90|%/);
});
test('TH distinguishes voiced and voiceless articulation descriptions', () => {
  const h = helper();
  assert.match(h.childSoundDescription('θ',0), /TH bez hlasu/);
  assert.match(h.childSoundDescription('ð',0), /TH s hlasem/);
  assert.match(h.childSoundDescription(null,1), /název se nepodařilo spolehlivě určit/);
});
test('Sentence recognition uncertainty is visible separately from good phonemes',()=>{
 const h=helper();
 const html=h.childPronunciationParts({contentScore:75,words:[{word:'my',ok:true},{word:'bag',ok:false}],pronunciation:{status:'assessed',words:[{word:'my',accuracyScore:95,phonemes:[95,95].map(accuracyScore=>({accuracyScore}))},{word:'bag',accuracyScore:95,phonemes:[95,95,95].map(accuracyScore=>({accuracyScore}))}],issues:[]}});
 assert.match(html,/Rozpoznání celé věty/); assert.match(html,/Výsledky hlásek jsou uvedené zvlášť/);
 assert.match(html,/<b>M<\/b>/); assert.doesNotMatch(html,/75|95|%/);
});
