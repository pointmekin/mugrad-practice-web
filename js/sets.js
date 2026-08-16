export function filterSets(sets, type) {
  return type === "all" ? sets : sets.filter(set => set.type === type);
}
