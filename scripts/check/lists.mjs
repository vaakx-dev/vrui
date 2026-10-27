const COLOR = /^(bg|text|border|ring|accent)-([a-z][a-z0-9-]*)-(\d+)(?:\/\d+)?$/;

function conflictFindings(token, words, utilityKey) {
  const findings = [];
  const earlier = new Map();
  for (const word of words) {
    const key = utilityKey(word);
    if (key === undefined) continue;
    const previous = earlier.get(key);
    earlier.set(key, word);
    if (previous === undefined) continue;
    const message = previous === word
      ? `"${word}" is listed twice; remove one`
      : `"${previous}" and "${word}" set the same property, so "${previous}" does nothing; keep one`;
    findings.push({ start: token.start, rule: "conflicting-class", message });
  }
  return findings;
}

function shadeFindings(token, words, shades) {
  return words.flatMap((word) => {
    const [, kind, role, shade] = COLOR.exec(word.split(":").pop()) ?? [];
    const budget = shades[`${kind}-${role}`];
    if (!budget || budget.includes(Number(shade))) return [];
    return [{ start: token.start, rule: "shade", message: `"${word}" is off the ${kind}-${role} shades ${budget.join(", ")} in package.json "vrui.shades"; use one of them` }];
  });
}

export const listChecker = ({ utilityKey, shades }) => (token, words) => [
  ...conflictFindings(token, words, utilityKey),
  ...shadeFindings(token, words, shades),
];
