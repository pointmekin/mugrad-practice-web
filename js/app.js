import { loadState, toggleFlag, recordAttempt, exportState, importState, resetState, resetSetProgress } from "./storage.js?v=20260818-7";
import { filterSets, setResults, solutionAnswer, solutionChoices } from "./sets.js?v=20260818-7";

const app = document.querySelector("#app");
const data = { sets:[], topics:[], definitions:{} };
let practice = { set:null, index:0, selected:null, submitted:false };
let activeSetFilter = "all";

const versioned = path => `${path}?v=20260818-8`;
const escapeHtml = value => String(value).replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
const typeLabel = { synonym:"Synonyms", "fill-in":"Fill in the blank", "error-recognition":"Error recognition" };
const questionPrompt = question => question.prompt
  ? escapeHtml(question.prompt).replace(/\*\*(.+?)\*\*/g, '<span class="target-word">$1</span>').replace("__", '<span class="target-word">________</span>')
  : question.segments.map(segment => segment.underlined ? `<u data-segment="${segment.id}">${escapeHtml(segment.text)}</u>` : escapeHtml(segment.text)).join("");

async function boot() {
  try {
    const [manifest, grammar, glossary] = await Promise.all([fetch(versioned("data/manifest.json")).then(ok), fetch(versioned("data/grammar-topics.json")).then(ok), fetch(versioned("data/choice-definitions.json")).then(ok)]);
    data.topics = grammar.topics;
    data.definitions = glossary.definitions;
    data.sets = await Promise.all(manifest.sets.map(file => fetch(versioned(`data/problem-sets/${file}`)).then(ok)));
    window.addEventListener("hashchange", route); route();
  } catch (error) { app.innerHTML = `<div class="empty"><h2>Could not load practice data</h2><p>${escapeHtml(error.message)}. Open this app through a local web server, not as a file.</p></div>`; }
}
function ok(response) { if (!response.ok) throw new Error(`${response.status} ${response.statusText}`); return response.json(); }
function route() {
  const [page="sets", param] = location.hash.slice(2).split("/");
  document.querySelectorAll("[data-nav]").forEach(link => link.classList.toggle("active", link.dataset.nav === (["practice","solutions"].includes(page) ? "sets" : page)));
  if (page === "practice") renderPractice(param); else if (page === "solutions") renderSolutions(param); else if (page === "grammar") renderGrammar(param); else if (page === "dashboard") renderDashboard(); else renderSets();
  app.focus({preventScroll:true}); window.scrollTo({top:0,behavior:"instant"});
}
function progressFor(set, state=loadState()) { return set.questions.filter(q => state.attempts[q.id]).length; }
function renderSets() {
  const state = loadState(); const totalDone = data.sets.reduce((n,set) => n + progressFor(set,state),0); const total = data.sets.reduce((n,set) => n + set.questions.length,0);
  const visibleSets = filterSets(data.sets, activeSetFilter);
  const filters = [["all","All sets"],["synonym","Synonyms"],["fill-in","Fill in"],["error-recognition","Error recognition"]];
  app.innerHTML = `<section class="hero"><div class="eyebrow">MUGRAD English practice</div><h1>Make every answer count.</h1><p class="lede">Focused B2–C1 practice sets. Answer one question at a time, understand the reason in Thai, and return to the exact grammar that needs work.</p><div class="chips"><span class="chip">${total} questions</span><span class="chip">${totalDone} completed</span><span class="chip">Saved on this device</span></div></section><section><div class="section-head"><div><div class="eyebrow">Choose your session</div><h2>Problem sets</h2></div><p class="lede">Choose a focused set for each MUGRAD question type.</p></div><div class="filter-bar" role="group" aria-label="Filter problem sets by type">${filters.map(([value,label])=>`<button class="filter-button" data-set-filter="${value}" aria-pressed="${activeSetFilter===value}">${label}</button>`).join("")}</div><div class="set-grid">${visibleSets.map(set => setCard(set,data.sets.indexOf(set),state)).join("")}</div></section>`;
  document.querySelectorAll("[data-set-filter]").forEach(button=>button.addEventListener("click",()=>{activeSetFilter=button.dataset.setFilter;renderSets()}));
}
function setCard(set,index,state) {
  const done=progressFor(set,state), percent=Math.round(done/set.questions.length*100);
  return `<article class="set-card"><div class="meta"><span>${typeLabel[set.type]}</span><span>•</span><span>${set.difficulty}</span></div><div class="number">${String(index+1).padStart(2,"0")}</div><h3>${escapeHtml(set.title)}</h3><div class="progress-track" aria-label="${percent}% complete"><span style="width:${percent}%"></span></div><div class="set-actions"><a class="button" href="#/practice/${set.id}">${done ? "Continue set" : "Start set"} <span aria-hidden="true">→</span></a><a class="solution-link" href="#/solutions/${set.id}">Review solutions</a></div></article>`;
}
function answerOptions(question) {
  if (question.choices) return question.choices;
  return question.segments.filter(segment => segment.underlined).map(segment => ({id:segment.id,text:segment.text}));
}
function correctId(question) { return question.correctChoiceId || question.correctSegmentId; }
function choiceDefinitionsMarkup(question) {
  if (!question.choices) return "";
  return `<dl class="choice-definitions">${solutionChoices(question,data.definitions).map(choice=>`<div><dt>${choice.id}. ${escapeHtml(choice.text)}</dt><dd lang="th">${escapeHtml(choice.definition)}</dd></div>`).join("")}</dl>`;
}
function renderSolutions(setId) {
  const set = data.sets.find(item => item.id === setId); if (!set) { location.hash="#/sets"; return; }
  app.innerHTML=`<section class="solution-header"><a href="#/sets">← All sets</a><div class="eyebrow">Complete solutions</div><h1>${escapeHtml(set.title)}</h1><p class="lede">All ${set.questions.length} questions, answers, and explanations in one place for quick review.</p></section><ol class="solutions-list">${set.questions.map((question,index)=>`<li class="solution-item"><div class="meta">Question ${index+1}</div><h2>${questionPrompt(question)}</h2>${choiceDefinitionsMarkup(question)}<p class="solution-answer"><strong>Answer:</strong> ${escapeHtml(solutionAnswer(question))}</p><p lang="th"><strong>Explanation:</strong> ${escapeHtml(question.explanationTh)}</p></li>`).join("")}</ol>`;
}
function renderPractice(setId) {
  const set = data.sets.find(item => item.id === setId); if (!set) { location.hash="#/sets"; return; }
  if (practice.set?.id !== set.id) practice={set,index:0,selected:null,submitted:false}; else practice.set=set;
  const q=set.questions[practice.index], state=loadState(), attempt=state.attempts[q.id], flagged=state.flags.questions.includes(q.id);
  if (attempt && !practice.selected) { practice.selected=attempt.choiceId; practice.submitted=true; }
  const answer=correctId(q), options=answerOptions(q);
  app.innerHTML=`<div class="practice-shell"><section><div class="practice-top"><a href="#/sets">← All sets</a><div class="meta"><span>${escapeHtml(set.title)}</span><span>•</span><span>Question ${practice.index+1} of ${set.questions.length}</span></div></div><article class="question-card"><button class="flag-button ${flagged?"flagged":""}" id="flag-question" aria-pressed="${flagged}">${flagged?"★ Flagged":"☆ Flag"}</button><div class="eyebrow">Choose the best answer</div><h1>${questionPrompt(q)}</h1><fieldset class="choices"><legend class="visually-hidden">Answer choices</legend>${options.map(option=>choiceButton(option,answer)).join("")}</fieldset><button class="button" id="submit-answer" ${!practice.selected||practice.submitted?"disabled":""}>Check answer</button>${practice.submitted?feedback(q,practice.selected===answer):""}</article><div class="practice-actions"><button class="button secondary" id="previous" ${practice.index===0?"disabled":""}>← Previous</button><button class="button" id="next" ${practice.index===set.questions.length-1?"disabled":""}>Next →</button><button class="button danger" id="retake-set">Retake this set</button></div></section><aside class="question-map"><h2>Your route</h2><p class="meta">Answered questions have a green mark.</p><div class="number-grid">${set.questions.map((item,index)=>`<button data-jump="${index}" class="${index===practice.index?"current":""} ${state.attempts[item.id]?"done":""} ${state.flags.questions.includes(item.id)?"flagged":""}" aria-label="Question ${index+1}">${index+1}</button>`).join("")}</div></aside></div>`;
  bindPractice(q,set);
}
function choiceButton(option,answer) {
  const classes=["choice",practice.selected===option.id?"selected":"",practice.submitted&&option.id===answer?"correct":"",practice.submitted&&practice.selected===option.id&&option.id!==answer?"incorrect":""].join(" ");
  return `<button type="button" class="${classes}" data-choice="${option.id}" ${practice.submitted?"disabled":""}><span class="letter">${option.id}</span><span>${escapeHtml(option.text)}</span></button>`;
}
function feedback(q,isCorrect) {
  const answer=answerOptions(q).find(option=>option.id===correctId(q));
  return `<div class="feedback ${isCorrect?"":"incorrect"}" role="status"><h3>${isCorrect?"✓ Correct — nicely reasoned.":"✕ Not quite. Review this one."}</h3><p><strong>Answer:</strong> ${answer.id} — ${escapeHtml(q.correction||answer.text)}</p><p lang="th">${escapeHtml(q.explanationTh)}</p>${q.choices?`<h4>Choice meanings</h4>${choiceDefinitionsMarkup(q)}`:""}${q.grammarTopicIds.map(id=>{const t=data.topics.find(x=>x.id===id);return t?`<a class="topic-link" href="#/grammar/${id}">${escapeHtml(t.name)} →</a>`:""}).join("")}</div>`;
}
function bindPractice(q,set) {
  document.querySelectorAll("[data-choice]").forEach(button=>button.addEventListener("click",()=>{practice.selected=button.dataset.choice;renderPractice(set.id)}));
  document.querySelector("#submit-answer").addEventListener("click",()=>{practice.submitted=true;recordAttempt(q,set,practice.selected,practice.selected===correctId(q));renderPractice(set.id)});
  document.querySelector("#flag-question").addEventListener("click",()=>{toggleFlag("questions",q.id);renderPractice(set.id)});
  document.querySelector("#retake-set").addEventListener("click",()=>{if(window.confirm(`Clear all answers in ${set.title} and start again? Flags will be kept.`)){resetSetProgress(set.id);practice={set,index:0,selected:null,submitted:false};renderPractice(set.id)}});
  document.querySelector("#previous").addEventListener("click",()=>move(-1)); document.querySelector("#next").addEventListener("click",()=>move(1));
  document.querySelectorAll("[data-jump]").forEach(button=>button.addEventListener("click",()=>jump(Number(button.dataset.jump))));
  function move(delta){jump(practice.index+delta)} function jump(index){practice.index=index;practice.selected=null;practice.submitted=false;renderPractice(set.id);window.scrollTo({top:0,behavior:"instant"})}
}
function renderGrammar(focusId="") {
  const state=loadState(); const topics=focusId?[...data.topics].sort((a,b)=>a.id===focusId?-1:b.id===focusId?1:0):data.topics;
  app.innerHTML=`<section><div class="eyebrow">Reference library</div><h1>Grammar, made useful.</h1><p class="lede">Short Thai explanations for the rules behind your answers. Search by rule name or Thai keyword.</p><label class="visually-hidden" for="topic-search">Search grammar topics</label><input class="search" id="topic-search" type="search" placeholder="Search grammar topics…"></section><div class="grammar-layout"><nav class="topic-nav" aria-label="Grammar topic navigation">${data.topics.map(t=>`<a href="#/grammar/${t.id}">${escapeHtml(t.name)}</a>`).join("")}</nav><div class="topic-list" id="topic-list">${topics.map(t=>topicCard(t,state,focusId)).join("")}</div></div>`;
  document.querySelector("#topic-search").addEventListener("input",event=>{const query=event.target.value.toLowerCase();document.querySelectorAll(".topic-card").forEach(card=>card.hidden=!card.textContent.toLowerCase().includes(query))});
  document.querySelectorAll("[data-topic-flag]").forEach(button=>button.addEventListener("click",()=>{toggleFlag("topics",button.dataset.topicFlag);renderGrammar(button.dataset.topicFlag)}));
  if(focusId) setTimeout(()=>document.querySelector(`#topic-${CSS.escape(focusId)}`)?.scrollIntoView({block:"start"}),0);
}
function topicCard(t,state,focusId) { const flagged=state.flags.topics.includes(t.id); return `<article class="topic-card" id="topic-${t.id}" ${focusId===t.id?'style="border-color:var(--accent)"':""}><button class="flag-button ${flagged?"flagged":""}" data-topic-flag="${t.id}" aria-pressed="${flagged}">${flagged?"★ Flagged":"☆ Flag"}</button><div class="eyebrow">${escapeHtml(t.nameTh)}</div><h2>${escapeHtml(t.name)}</h2><p lang="th">${escapeHtml(t.explanationTh)}</p><p><strong>Rule:</strong> ${escapeHtml(t.rule)}</p>${t.correctExamples.map(e=>`<p class="example">✓ ${escapeHtml(e)}</p>`).join("")}${t.incorrectExamples.map(e=>`<p class="example bad">✕ ${escapeHtml(e)}</p>`).join("")}</article>`; }
function renderDashboard() {
  const state=loadState(), attempts=Object.values(state.attempts), correct=attempts.filter(a=>a.correct).length, accuracy=attempts.length?Math.round(correct/attempts.length*100):0;
  const results=setResults(data.sets,attempts);
  const groups={}; attempts.forEach(a=>{[typeLabel[a.type],...a.grammarTopicIds.map(id=>data.topics.find(t=>t.id===id)?.name||id)].forEach(key=>{groups[key]??={total:0,correct:0};groups[key].total++;groups[key].correct+=a.correct?1:0})});
  const areas=Object.entries(groups).map(([name,g])=>({...g,name,accuracy:Math.round(g.correct/g.total*100),status:g.total<3?"Building evidence":g.correct/g.total<.6?"Needs review":g.correct/g.total>=.8?"Proficient":"Developing"})).sort((a,b)=>a.accuracy-b.accuracy);
  const flaggedQuestions=data.sets.flatMap(set=>set.questions.map((q,i)=>({q,set,i}))).filter(x=>state.flags.questions.includes(x.q.id));
  app.innerHTML=`<section><div class="eyebrow">Your learning record</div><h1>Progress, without pressure.</h1><p class="lede">Areas receive a label only after three attempts. One answer is a clue; a pattern is useful.</p></section><div class="stats"><div class="stat">Questions answered<strong>${attempts.length}</strong></div><div class="stat">Correct answers<strong>${correct}</strong></div><div class="stat">Overall accuracy<strong>${accuracy}%</strong></div><div class="stat">Flagged items<strong>${state.flags.questions.length+state.flags.topics.length}</strong></div></div><div class="dashboard-grid"><section class="panel"><h3>Accuracy by area</h3>${areas.length?areas.map(a=>`<div class="data-row"><span>${escapeHtml(a.name)}<small class="meta">${a.status} · ${a.total} attempt${a.total===1?"":"s"}</small></span><strong>${a.accuracy}%</strong></div>`).join(""):'<div class="empty">Answer a few questions to reveal patterns.</div>'}</section><section class="panel"><h3>Flagged for review</h3>${flaggedQuestions.map(x=>`<div class="data-row"><a href="#/practice/${x.set.id}">${escapeHtml(x.set.title)} · Q${x.i+1}</a><span>★</span></div>`).join("")}${state.flags.topics.map(id=>{const t=data.topics.find(x=>x.id===id);return t?`<div class="data-row"><a href="#/grammar/${id}">${escapeHtml(t.name)}</a><span>★</span></div>`:""}).join("")}${!flaggedQuestions.length&&!state.flags.topics.length?'<div class="empty">Flag a question or grammar topic to collect it here.</div>':""}</section></div><section class="panel set-results" style="margin-top:20px"><h3>Results by problem set</h3>${results.map(result=>`<div class="data-row"><a href="#/practice/${result.set.id}">${escapeHtml(result.set.title)}</a><span><strong class="result-correct">${result.correct} correct</strong> · <strong class="result-incorrect">${result.incorrect} incorrect</strong></span></div>`).join("")}</section><section class="panel" style="margin-top:20px"><h3>Manage progress</h3><p class="lede">Export your progress before changing device or clearing browser data. Importing replaces the progress currently stored here.</p><div class="backup"><button class="button" id="export">Export JSON</button><label class="button secondary" for="import">Import JSON</label><input class="visually-hidden" id="import" type="file" accept="application/json"><button class="button danger" id="reset-progress">Reset progress</button><span id="import-status" role="status"></span></div></section>`;
  document.querySelector("#export").addEventListener("click",exportState); document.querySelector("#import").addEventListener("change",async event=>{try{await importState(event.target.files[0]);renderDashboard()}catch(error){document.querySelector("#import-status").textContent=error.message}});
  document.querySelector("#reset-progress").addEventListener("click",()=>{if(window.confirm("Reset all answers and flags? This cannot be undone.")){resetState();renderDashboard()}});
}
boot();
