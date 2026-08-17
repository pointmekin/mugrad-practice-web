export function filterSets(sets, type) {
  return type === "all" ? sets : sets.filter(set => set.type === type);
}

export function setResults(sets, attempts) {
  return sets.map(set => {
    const answered = attempts.filter(attempt => attempt.setId === set.id);
    const correct = answered.filter(attempt => attempt.correct).length;
    return { set, correct, incorrect:answered.length - correct };
  });
}

export function solutionAnswer(question) {
  const id = question.correctChoiceId || question.correctSegmentId;
  const choice = question.choices?.find(item => item.id === id);
  return `${id} — ${question.correction || choice?.text || ""}`;
}

export function solutionChoices(question, definitions) {
  return (question.choices || []).map(choice => ({ ...choice, definition:definitions[choice.text] }));
}
