import { readFile, readdir } from "node:fs/promises";
const root=new URL("../data/",import.meta.url), grammar=JSON.parse(await readFile(new URL("grammar-topics.json",root))), glossary=JSON.parse(await readFile(new URL("choice-definitions.json",root))).definitions, topicIds=new Set(), setIds=new Set(), questionIds=new Set();
const errors=[];
for(const topic of grammar.topics){if(topicIds.has(topic.id))errors.push(`duplicate topic ${topic.id}`);topicIds.add(topic.id)}
const files=(await readdir(new URL("problem-sets/",root))).filter(file=>file.endsWith(".json"));
for(const file of files){let set;try{set=JSON.parse(await readFile(new URL(`problem-sets/${file}`,root)))}catch(error){errors.push(`${file}: invalid JSON (${error.message})`);continue}
  if(setIds.has(set.id))errors.push(`${file}: duplicate set id ${set.id}`);setIds.add(set.id);
  if(set.questions?.length!==20)errors.push(`${file}: expected 20 questions, got ${set.questions?.length}`);
  for(const q of set.questions||[]){if(questionIds.has(q.id))errors.push(`${file}: duplicate question id ${q.id}`);questionIds.add(q.id);
    if(!q.explanationTh)errors.push(`${q.id}: missing Thai explanation`);
    for(const id of q.grammarTopicIds||[])if(!topicIds.has(id))errors.push(`${q.id}: unknown grammar topic ${id}`);
    if(set.type==="error-recognition"){const underlined=q.segments?.filter(s=>s.underlined)||[];if(underlined.length!==4)errors.push(`${q.id}: expected 4 underlined candidates`);if(!underlined.some(s=>s.id===q.correctSegmentId))errors.push(`${q.id}: correct segment is not underlined`);if(underlined.some(s=>s.text.trim().split(/\s+/).length>5))errors.push(`${q.id}: underlined candidate exceeds 5 words`)}
    else{if(q.choices?.length!==4)errors.push(`${q.id}: expected 4 choices`);if(!q.choices?.some(c=>c.id===q.correctChoiceId))errors.push(`${q.id}: correct choice missing`);for(const choice of q.choices||[])if(!glossary[choice.text])errors.push(`${q.id}: missing definition for ${choice.text}`)}
  }
}
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`Validated ${files.length} sets, ${questionIds.size} questions, and ${topicIds.size} grammar topics.`);
