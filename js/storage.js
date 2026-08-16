const KEY = "mugrad-practice-state-v1";
const EMPTY = { attempts: {}, flags: { questions: [], topics: [] } };

export function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return parsed?.attempts && parsed?.flags ? parsed : structuredClone(EMPTY);
  } catch { return structuredClone(EMPTY); }
}
export function saveState(state) { localStorage.setItem(KEY, JSON.stringify(state)); }
export function toggleFlag(kind, id) {
  const state = loadState();
  const list = state.flags[kind];
  state.flags[kind] = list.includes(id) ? list.filter(value => value !== id) : [...list, id];
  saveState(state); return state.flags[kind].includes(id);
}
export function recordAttempt(question, set, choiceId, correct) {
  const state = loadState();
  state.attempts[question.id] = { questionId:question.id, setId:set.id, type:set.type, choiceId, correct, grammarTopicIds:question.grammarTopicIds, tags:question.tags, answeredAt:new Date().toISOString() };
  saveState(state);
}
export function exportState() {
  const blob = new Blob([JSON.stringify(loadState(), null, 2)], { type:"application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "mugrad-progress.json"; link.click(); URL.revokeObjectURL(link.href);
}
export async function importState(file) {
  const parsed = JSON.parse(await file.text());
  if (!parsed?.attempts || !Array.isArray(parsed?.flags?.questions) || !Array.isArray(parsed?.flags?.topics)) throw new Error("Invalid backup file");
  saveState(parsed);
}
