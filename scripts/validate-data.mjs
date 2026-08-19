import { readFile, readdir } from "node:fs/promises";

const root = new URL("../data/", import.meta.url);
const grammar = JSON.parse(await readFile(new URL("grammar-topics.json", root)));
const glossary = JSON.parse(await readFile(new URL("choice-definitions.json", root))).definitions;
const manifest = JSON.parse(await readFile(new URL("manifest.json", root)));
const topicIds = new Set();
const setIds = new Set();
const questionIds = new Set();
const errors = [];
const generatedSynonymPrompts = new Set();
const generatedSynonymTargets = new Set();
const normalizedQuestions = new Map();

for (const topic of grammar.topics) {
  if (topicIds.has(topic.id)) errors.push(`duplicate topic ${topic.id}`);
  topicIds.add(topic.id);
}

const files = (await readdir(new URL("problem-sets/", root)))
  .filter(file => file.endsWith(".json"))
  .sort();
const manifestFiles = new Set(manifest.sets);
for (const file of files) if (!manifestFiles.has(file)) errors.push(`${file}: missing from manifest`);
for (const file of manifestFiles) if (!files.includes(file)) errors.push(`${file}: manifest entry has no problem-set file`);

const normalize = value => value
  .toLowerCase()
  .replace(/\*\*/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

for (const file of files) {
  let set;
  try {
    set = JSON.parse(await readFile(new URL(`problem-sets/${file}`, root)));
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error.message})`);
    continue;
  }

  if (setIds.has(set.id)) errors.push(`${file}: duplicate set id ${set.id}`);
  setIds.add(set.id);
  if (set.questions?.length !== 20) errors.push(`${file}: expected 20 questions, got ${set.questions?.length}`);

  const number = Number(set.id.match(/-(\d+)$/)?.[1]);
  const generatedSynonym = set.type === "synonym" && number >= 22;
  const newBatch = (set.type === "synonym" && number >= 30)
    || (set.type === "fill-in" && number >= 24)
    || (set.type === "error-recognition" && number >= 24);
  const answerIds = [];
  const errorTopicCounts = { tenses:0, prepositions:0, adjectives:0 };

  for (const question of set.questions || []) {
    if (questionIds.has(question.id)) errors.push(`${file}: duplicate question id ${question.id}`);
    questionIds.add(question.id);
    if (!question.explanationTh) errors.push(`${question.id}: missing Thai explanation`);
    for (const id of question.grammarTopicIds || []) {
      if (!topicIds.has(id)) errors.push(`${question.id}: unknown grammar topic ${id}`);
    }

    const questionText = set.type === "error-recognition"
      ? question.segments?.map(segment => segment.text).join("")
      : question.prompt;
    const normalizedQuestion = normalize(questionText || "");
    const earlier = normalizedQuestions.get(normalizedQuestion);
    if (normalizedQuestion && earlier && (newBatch || earlier.newBatch)) {
      errors.push(`${question.id}: duplicates normalized question ${earlier.id}`);
    } else if (normalizedQuestion) {
      normalizedQuestions.set(normalizedQuestion, { id:question.id, newBatch });
    }

    if (set.type === "error-recognition") {
      const underlined = question.segments?.filter(segment => segment.underlined) || [];
      if (underlined.length !== 4) errors.push(`${question.id}: expected 4 underlined candidates`);
      if (!underlined.some(segment => segment.id === question.correctSegmentId)) {
        errors.push(`${question.id}: correct segment is not underlined`);
      }
      if (underlined.some(segment => segment.text.trim().split(/\s+/).length > 5)) {
        errors.push(`${question.id}: underlined candidate exceeds 5 words`);
      }
      if (newBatch && underlined.some(segment => segment.text.trim().split(/\s+/).length > 3)) {
        errors.push(`${question.id}: new error-recognition candidate exceeds 3 words`);
      }
      if (newBatch && (questionText?.trim().split(/\s+/).length || 0) < 22) {
        errors.push(`${question.id}: new error-recognition sentence is shorter than 22 words`);
      }
      if (!question.correction?.trim()) errors.push(`${question.id}: missing correction`);
      if (newBatch && /\bif\b/i.test(questionText)) errors.push(`${question.id}: new error-recognition item uses an if-clause`);
      if (question.grammarTopicIds?.includes("tenses")) errorTopicCounts.tenses += 1;
      if (question.grammarTopicIds?.includes("prepositions")) errorTopicCounts.prepositions += 1;
      if (question.grammarTopicIds?.some(id => id === "word-forms" || id === "participles")) errorTopicCounts.adjectives += 1;
      answerIds.push(question.correctSegmentId);
    } else {
      if (question.choices?.length !== 4) errors.push(`${question.id}: expected 4 choices`);
      if (!question.choices?.some(choice => choice.id === question.correctChoiceId)) {
        errors.push(`${question.id}: correct choice missing`);
      }
      for (const choice of question.choices || []) {
        const definition = glossary[choice.text];
        if (!definition) errors.push(`${question.id}: missing definition for ${choice.text}`);
        if (newBatch && (!/[\u0E00-\u0E7F]/.test(definition || "") || /คำหรือวลีสำหรับพิจารณา/.test(definition || ""))) {
          errors.push(`${question.id}: incomplete or generic Thai definition for ${choice.text}`);
        }
      }
      if (set.type === "fill-in" && (question.prompt.match(/__/g) || []).length !== 1) {
        errors.push(`${question.id}: expected exactly one fill-in blank`);
      }
      answerIds.push(question.correctChoiceId);
    }

    if (generatedSynonym) {
      const prompt = question.prompt?.trim().toLowerCase();
      const targets = [...(question.prompt || "").matchAll(/\*\*(.+?)\*\*/g)];
      const target = targets[0]?.[1]?.trim().toLowerCase();
      const questionChoices = new Set();
      if (!prompt || targets.length !== 1) errors.push(`${question.id}: expected exactly one bold synonym target`);
      else {
        if (generatedSynonymPrompts.has(prompt)) errors.push(`${question.id}: reused generated synonym prompt`);
        if (generatedSynonymTargets.has(target)) errors.push(`${question.id}: reused generated synonym target`);
        generatedSynonymPrompts.add(prompt);
        generatedSynonymTargets.add(target);
      }
      for (const choice of question.choices || []) {
        const text = choice.text.trim().toLowerCase();
        if (questionChoices.has(text)) errors.push(`${question.id}: duplicate synonym choice ${choice.text}`);
        if (newBatch && text.split(/\s+/).length > 3) errors.push(`${question.id}: synonym choice is definition-like: ${choice.text}`);
        questionChoices.add(text);
      }
    }
  }

  if (generatedSynonym || newBatch) {
    for (const id of ["A", "B", "C", "D"]) {
      const count = answerIds.filter(answer => answer === id).length;
      if (count !== 5) errors.push(`${file}: expected 5 correct ${id} answers, got ${count}`);
    }
    if (/(.)\1{2}/.test(answerIds.join(""))) errors.push(`${file}: correct answers repeat in a run longer than two`);
  }

  if (newBatch && set.type === "error-recognition") {
    if (errorTopicCounts.tenses < 5) errors.push(`${file}: expected at least 5 non-conditional tense questions`);
    if (errorTopicCounts.prepositions < 4) errors.push(`${file}: expected at least 4 preposition questions`);
    if (errorTopicCounts.adjectives < 4) errors.push(`${file}: expected at least 4 adjective/form questions`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${files.length} sets, ${questionIds.size} questions, and ${topicIds.size} grammar topics.`);
