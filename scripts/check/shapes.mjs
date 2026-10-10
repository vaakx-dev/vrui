// Class lists that repeat, or nearly repeat, an earlier one in the same group.
// Each shape is { at, group, tokens }; the group is the whole tree or one project.
// A shape is reported once, against the first earlier list it matches.
export function repeatedShapes(shapes) {
  const findings = [];
  const sets = shapes.map((shape) => new Set(shape.tokens));
  for (let right = 1; right < shapes.length; right++) {
    const b = sets[right];
    for (let left = 0; left < right; left++) {
      if (shapes[left].group !== shapes[right].group) continue;
      const a = sets[left];
      if (Math.abs(a.size - b.size) > 2) continue;
      let shared = 0;
      for (const token of a) if (b.has(token)) shared++;
      const distance = a.size + b.size - 2 * shared;
      const near = shared >= 8 && distance <= 2;
      if (distance !== 0 && !near) continue;
      const how = distance === 0 ? "repeats" : "nearly repeats";
      findings.push({ at: shapes[right].at, rule: "repeated-shape", message: `${how} the class list at ${shapes[left].at}; extract an app-owned VRUI component` });
      break;
    }
  }
  return findings;
}
