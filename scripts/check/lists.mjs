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

export const listChecker = ({ utilityKey }) => (token, words) => conflictFindings(token, words, utilityKey);
