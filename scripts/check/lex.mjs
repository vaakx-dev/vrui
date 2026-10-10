const REGEX_BEFORE = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^", "=>", "&&", "||", "??", "+=", "-=", "||=", "&&=", "??="]);
const REGEX_KEYWORDS = new Set(["return", "typeof", "case", "do", "else", "in", "of", "void", "yield", "await"]);
const LONG_PUNCT = ["===", "!==", "...", "||=", "&&=", "??=", "=>", "==", "!=", "<=", ">=", "?.", "&&", "||", "??", "+=", "-="];

// Splits TypeScript into identifiers, punctuation and string literals, skipping comments.
// A template literal with substitutions becomes a "template" token; `parts` holds its
// static text between substitutions, and the substitutions are lexed in place before it.
export function lex(text) {
  const tokens = [];
  let i = 0;
  const previous = () => tokens[tokens.length - 1];

  const readString = (quote) => {
    const start = i++;
    let value = "";
    while (i < text.length && text[i] !== quote) {
      if (text[i] === "\\") { value += text[i + 1]; i += 2; continue; }
      if (text[i] === "\n") break;
      value += text[i++];
    }
    i++;
    return { start, value };
  };

  // Advances past a `${...}` substitution; `i` points just after `${` on entry.
  const skipSubstitution = () => {
    let depth = 1;
    while (i < text.length && depth) {
      const char = text[i];
      if (char === "`") { skipTemplate(); continue; }
      if (char === "'" || char === '"') { readString(char); continue; }
      if (char === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
      if (char === "/" && text[i + 1] === "*") { i = text.indexOf("*/", i + 2); i = i < 0 ? text.length : i + 2; continue; }
      if (char === "{") depth++;
      if (char === "}") depth--;
      i++;
    }
  };

  const skipTemplate = () => {
    i++;
    while (i < text.length && text[i] !== "`") {
      if (text[i] === "\\") { i += 2; continue; }
      if (text[i] === "$" && text[i + 1] === "{") { i += 2; skipSubstitution(); continue; }
      i++;
    }
    i++;
  };

  const readTemplate = () => {
    const start = i++;
    const parts = [""];
    while (i < text.length && text[i] !== "`") {
      if (text[i] === "\\") { parts[parts.length - 1] += text[i + 1]; i += 2; continue; }
      if (text[i] === "$" && text[i + 1] === "{") {
        const inner = i + 2;
        i = inner;
        skipSubstitution();
        tokens.push(...lex(text.slice(inner, i - 1)).map((token) => ({ ...token, start: token.start + inner })));
        parts.push("");
        continue;
      }
      parts[parts.length - 1] += text[i++];
    }
    i++;
    return { start, parts };
  };

  while (i < text.length) {
    const char = text[i];
    if (/\s/.test(char)) { i++; continue; }
    if (char === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (char === "/" && text[i + 1] === "*") { i = text.indexOf("*/", i + 2); i = i < 0 ? text.length : i + 2; continue; }
    if (char === "'" || char === '"') { const { start, value } = readString(char); tokens.push({ type: "string", value, start }); continue; }
    if (char === "`") {
      const { start, parts } = readTemplate();
      if (parts.length === 1) tokens.push({ type: "string", value: parts[0], start });
      else tokens.push({ type: "template", value: parts.join(""), parts, start });
      continue;
    }
    if (char === "/") {
      const before = previous();
      const regex = !before || (before.type === "punct" && REGEX_BEFORE.has(before.value)) ||
        (before.type === "ident" && REGEX_KEYWORDS.has(before.value));
      if (regex) {
        const start = i;
        let inClass = false;
        i++;
        while (i < text.length && text[i] !== "\n") {
          if (text[i] === "\\") { i += 2; continue; }
          if (text[i] === "[") inClass = true;
          else if (text[i] === "]") inClass = false;
          else if (text[i] === "/" && !inClass) break;
          i++;
        }
        i++;
        while (/[a-z]/i.test(text[i] ?? "")) i++;
        tokens.push({ type: "regex", value: "", start });
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(char)) {
      const start = i;
      while (/[\w$]/.test(text[i] ?? "")) i++;
      tokens.push({ type: "ident", value: text.slice(start, i), start });
      continue;
    }
    if (/\d/.test(char)) { const start = i; while (/[\w.]/.test(text[i] ?? "")) i++; tokens.push({ type: "number", value: text.slice(start, i), start }); continue; }
    const long = LONG_PUNCT.find((punct) => text.startsWith(punct, i));
    if (long) {
      tokens.push({ type: "punct", value: long, start: i });
      i += long.length;
      continue;
    }
    tokens.push({ type: "punct", value: char, start: i });
    i++;
  }
  return tokens;
}

// Whitespace-separated words a string or template token spells out completely.
// Words that touch a `${}` substitution are partial and left out.
export function wordsOf(token) {
  if (token.type === "string") return token.value.trim().split(/\s+/).filter(Boolean);
  const words = [];
  token.parts.forEach((part, index) => {
    const pieces = part.split(/\s+/);
    if (index > 0) pieces.shift();
    if (index < token.parts.length - 1) pieces.pop();
    words.push(...pieces.filter(Boolean));
  });
  return words;
}
