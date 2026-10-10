export const isPunct = (token, value) => token?.type === "punct" && token.value === value;

export const isIdent = (token, value) => token?.type === "ident" && (value === undefined || token.value === value);

// Whether tokens[index] is read as a property: `x.name` or `x?.name`.
export const isMember = (tokens, index) => isPunct(tokens[index - 1], ".") || isPunct(tokens[index - 1], "?.");

// Whether tokens[index] is called: `name(` or `name?.(`.
export const isCalled = (tokens, index) =>
  isPunct(tokens[index + 1], "(") || (isPunct(tokens[index + 1], "?.") && isPunct(tokens[index + 2], "("));

// Whether tokens[index] is written with `=`, `+=` or a logical assignment.
export const isAssigned = (tokens, index) => ["=", "+=", "-=", "||=", "&&=", "??="].some((op) => isPunct(tokens[index + 1], op));

// The identifier a member is read from, `window` in `window.x`, or undefined.
export const receiverOf = (tokens, index) => (isMember(tokens, index) && isIdent(tokens[index - 2]) ? tokens[index - 2].value : undefined);

// Whether the parentheses after tokens[index] are empty: `name()`.
export const callsWithoutArguments = (tokens, index) => isPunct(tokens[index + 1], "(") && isPunct(tokens[index + 2], ")");
