// Class lists that repeat, nearly repeat, or swap one class of an earlier one in the same group.
// Each shape is { at, group, tokens }; the group is the whole tree or one project.
// A shape is reported once, against the first earlier list it matches.

const VISUAL = /^-?(p|px|py|pt|pr|pb|pl|text|font|leading|tracking|bg|border|rounded|shadow|ring|opacity|underline|no-underline|uppercase|lowercase|italic)(-|$)/;
const isShape = (tokens) => {
  const visual = tokens.filter((token) => VISUAL.test(token.split(":").pop())).length;
  return visual >= 3 || (visual >= 1 && tokens.length >= 6);
};

function compare(a, b, utilityKey) {
  const onlyA = [...a].filter((token) => !b.has(token));
  const onlyB = [...b].filter((token) => !a.has(token));
  if (!onlyA.length && !onlyB.length) return { how: "repeats" };
  const key = onlyA.length === 1 && onlyB.length === 1 ? utilityKey(onlyA[0]) : undefined;
  if (key !== undefined && key === utilityKey(onlyB[0])) return { swap: [onlyA[0], onlyB[0]] };
  if (onlyA.length + onlyB.length <= 2 && a.size - onlyA.length >= 6) return { how: "nearly repeats" };
}

function finding(at, earlier, match) {
  if (match.swap) {
    const [theirs, ours] = match.swap;
    return { at, rule: "inconsistent-shape", message: `uses "${ours}" where the class list at ${earlier} uses "${theirs}"; pick one, or extract an app-owned VRUI component` };
  }
  return { at, rule: "repeated-shape", message: `${match.how} the class list at ${earlier}; extract an app-owned VRUI component` };
}

export function repeatedShapes(shapes, { utilityKey }) {
  const findings = [];
  const sets = shapes.map((shape) => new Set(shape.tokens));
  for (let right = 1; right < shapes.length; right++) {
    if (!isShape(shapes[right].tokens)) continue;
    for (let left = 0; left < right; left++) {
      if (shapes[left].group !== shapes[right].group || !isShape(shapes[left].tokens)) continue;
      const match = compare(sets[left], sets[right], utilityKey);
      if (!match) continue;
      findings.push(finding(shapes[right].at, shapes[left].at, match));
      break;
    }
  }
  return findings;
}
