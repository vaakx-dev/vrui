import { isIdent, isPunct } from "./tokens.mjs";

const OPEN = new Set(["(", "[", "{"]);
const CLOSE = new Set([")", "]", "}"]);

function secondArgument(tokens, open) {
  let depth = 0;
  let start;
  for (let index = open + 1; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== "punct") continue;
    if (OPEN.has(token.value)) depth++;
    else if (CLOSE.has(token.value) && depth > 0) depth--;
    else if ((CLOSE.has(token.value) || token.value === ",") && depth === 0) {
      if (start !== undefined) return tokens.slice(start, index);
      if (token.value !== ",") return [];
      start = index + 1;
    }
  }
  return [];
}

const isEntry = (tokens, index) => isPunct(tokens[index - 1], "{") || isPunct(tokens[index - 1], ",");
const isEnd = (token) => isPunct(token, ",") || isPunct(token, "}");

function sizeLiteral(argument) {
  if (argument.length === 1 && argument[0].type === "number") return argument[0];
  if (!isPunct(argument[0], "{")) return;
  const at = argument.findIndex((token, index) => isIdent(token, "size") && isEntry(argument, index) && isPunct(argument[index + 1], ":"));
  const value = argument[at + 2];
  if (at >= 0 && value?.type === "number" && isEnd(argument[at + 3])) return value;
}

export function iconFindings(tokens, sizes) {
  return tokens.flatMap((token, index) => {
    if (!isIdent(token, "icon") || !isPunct(tokens[index + 1], "(")) return [];
    const size = sizeLiteral(secondArgument(tokens, index + 1));
    if (!size || sizes.includes(Number(size.value))) return [];
    return [{ start: size.start, rule: "icon-size", message: `icon size ${size.value} is off the icon sizes ${sizes.join(", ")} in package.json "vrui.iconSizes"; use one of them` }];
  });
}
