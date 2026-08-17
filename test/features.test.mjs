import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key)
};

test("filterSets returns all sets or only the selected type", async () => {
  const { filterSets } = await import("../js/sets.js");
  const sets = [{ type:"synonym" }, { type:"fill-in" }, { type:"error-recognition" }, { type:"synonym" }];
  assert.equal(filterSets(sets, "all").length, 4);
  assert.deepEqual(filterSets(sets, "synonym"), [sets[0], sets[3]]);
  assert.deepEqual(filterSets(sets, "fill-in"), [sets[1]]);
});

test("setResults reports correct and incorrect attempts for each set", async () => {
  const { setResults } = await import("../js/sets.js");
  const sets = [{ id:"set-a" }, { id:"set-b" }];
  const results = setResults(sets, [
    { setId:"set-a", correct:true }, { setId:"set-a", correct:false }, { setId:"set-b", correct:false }
  ]);
  assert.deepEqual(results.map(({ set, correct, incorrect }) => ({ id:set.id, correct, incorrect })), [
    { id:"set-a", correct:1, incorrect:1 }, { id:"set-b", correct:0, incorrect:1 }
  ]);
});

test("resetState clears attempts and question and topic flags", async () => {
  const { saveState, loadState, resetState } = await import("../js/storage.js");
  saveState({ attempts:{ q1:{ correct:true } }, flags:{ questions:["q1"], topics:["tenses"] } });
  resetState();
  assert.deepEqual(loadState(), { attempts:{}, flags:{ questions:[], topics:[] } });
});

test("solutionAnswer resolves multiple-choice and corrected error answers", async () => {
  const { solutionAnswer } = await import("../js/sets.js");
  assert.equal(solutionAnswer({ choices:[{ id:"A", text:"clarify" }], correctChoiceId:"A" }), "A — clarify");
  assert.equal(solutionAnswer({ segments:[{ id:"B", text:"has", underlined:true }], correctSegmentId:"B", correction:"have" }), "B — have");
});

test("solutionChoices includes a definition for every vocabulary choice", async () => {
  const { solutionChoices } = await import("../js/sets.js");
  const question = { choices:[{ id:"A", text:"clarify" }, { id:"B", text:"conceal" }] };
  assert.deepEqual(solutionChoices(question, { clarify:"อธิบายให้ชัดเจน", conceal:"ปกปิด" }), [
    { id:"A", text:"clarify", definition:"อธิบายให้ชัดเจน" },
    { id:"B", text:"conceal", definition:"ปกปิด" }
  ]);
});

test("entry assets are versioned so deployments replace cached files", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /href="assets\/styles\.css\?v=[^"]+"/);
  assert.match(html, /src="js\/app\.js\?v=[^"]+"/);
});
