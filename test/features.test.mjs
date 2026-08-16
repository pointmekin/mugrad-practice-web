import test from "node:test";
import assert from "node:assert/strict";

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
