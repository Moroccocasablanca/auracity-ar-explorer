// A garden object is opt-in: being a street item or a bench is not sufficient.
export function isGardenObject(node: { kind: string; garden_interactive?: boolean }) {
  return (node.kind === "bench" || node.kind === "tree") && node.garden_interactive === true;
}

export function allowsMessages(node: { kind: string; garden_interactive?: boolean }) {
  return node.kind === "business" || isGardenObject(node);
}