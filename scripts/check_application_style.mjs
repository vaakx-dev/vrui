import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

const ROOT = resolve("examples");
const class_definitions = [];

const CALL_ROUTES = new Map([
  ["addEventListener", "event props, onTarget, onWindow, onDocument, or listen"],
  ["appendChild", "VRUI factories, children, mount, list, or portal"],
  ["removeChild", "show, list, replace, or a scoped disposer"],
  ["replaceChild", "replace or a flow helper"],
  ["createElement", "a VRUI DOM or SVG factory"],
  ["setTimeout", "onTimeout"],
  ["setInterval", "onInterval"],
  ["requestAnimationFrame", "onRaf"],
]);

const CONSTRUCT_ROUTES = new Map([
  ["ResizeObserver", "resizeObserver"],
  ["IntersectionObserver", "intersectionObserver"],
  ["MutationObserver", "a VRUI flow or lifecycle helper"],
]);

const ASSIGNMENT_ROUTES = new Map([
  ["className", "a reactive class prop"],
  ["innerHTML", "VRUI factories and children"],
  ["textContent", "a reactive child or text prop"],
]);

function collectFiles(directory, extension) {
  const paths = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "integrations") paths.push(...collectFiles(path, extension));
    } else if (entry.name.endsWith(extension) && !entry.name.endsWith(".d.ts")) {
      paths.push(path);
    }
  }
  return paths;
}

function propertyName(expression) {
  return ts.isPropertyAccessExpression(expression)
    ? expression.name.text
    : undefined;
}

function declaredName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
}

function classTokens(expression) {
  const tokens = [];

  function collect(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      tokens.push(...node.text.trim().split(/\s+/).filter(Boolean));
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const item of node.elements) collect(item);
      return;
    }
    if (ts.isConditionalExpression(node)) {
      collect(node.whenTrue);
      collect(node.whenFalse);
      return;
    }
    if (ts.isParenthesizedExpression(node)) {
      collect(node.expression);
      return;
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      if (!ts.isBlock(node.body)) {
        collect(node.body);
        return;
      }
      for (const statement of node.body.statements) {
        if (ts.isReturnStatement(statement) && statement.expression) {
          collect(statement.expression);
        }
      }
      return;
    }
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      if (
        operator === ts.SyntaxKind.AmpersandAmpersandToken ||
        operator === ts.SyntaxKind.BarBarToken ||
        operator === ts.SyntaxKind.QuestionQuestionToken
      ) {
        collect(node.left);
        collect(node.right);
      }
    }
  }

  collect(expression);
  return [...new Set(tokens)].sort();
}

function assignmentRoute(left) {
  if (!ts.isPropertyAccessExpression(left)) return;
  const direct = ASSIGNMENT_ROUTES.get(left.name.text);
  if (direct) return direct;
  if (ts.isPropertyAccessExpression(left.expression) && left.expression.name.text === "style") {
    return "a reactive style prop or utility class";
  }
}

function inspect(path) {
  const text = readFileSync(path, "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const issues = [];

  function add(node, operation, route) {
    const start = source.getLineAndCharacterOfPosition(node.getStart(source));
    issues.push({
      column: start.character + 1,
      file: relative(process.cwd(), path).replaceAll("\\", "/"),
      line: start.line + 1,
      operation,
      route,
    });
  }

  function visit(node) {
    if (ts.isPropertyAssignment(node) && declaredName(node.name) === "class") {
      const tokens = classTokens(node.initializer);
      const start = source.getLineAndCharacterOfPosition(node.getStart(source));
      const file = relative(process.cwd(), path).replaceAll("\\", "/");
      for (const token of tokens) {
        if (!token.includes("[") && !token.includes("]")) continue;
        issues.push({
          column: start.character + 1,
          file,
          line: start.line + 1,
          operation: token,
          route: "the fixed utility and sizing scales",
        });
      }
      if (tokens.length >= 6) {
        class_definitions.push({
          column: start.character + 1,
          file,
          line: start.line + 1,
          project: file.split("/")[1],
          tokens,
        });
      }
    }

    if (ts.isCallExpression(node)) {
      const operation = propertyName(node.expression) ??
        (ts.isIdentifier(node.expression) ? node.expression.text : undefined);
      const route = operation && CALL_ROUTES.get(operation);
      if (operation && route) add(node, operation, route);
    }

    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const operation = node.expression.text;
      const route = CONSTRUCT_ROUTES.get(operation);
      if (route) add(node, operation, route);
    }

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const route = assignmentRoute(node.left);
      if (route) add(node, node.left.getText(source), route);
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return issues;
}

function difference(left, right) {
  let count = 0;
  for (const token of left) if (!right.has(token)) count++;
  for (const token of right) if (!left.has(token)) count++;
  return count;
}

function overlap(left, right) {
  let count = 0;
  for (const token of left) if (right.has(token)) count++;
  return count;
}

function inspectClassDefinitions() {
  const issues = [];
  for (let left_index = 0; left_index < class_definitions.length; left_index++) {
    const left = class_definitions[left_index];
    const left_set = new Set(left.tokens);
    for (let right_index = left_index + 1; right_index < class_definitions.length; right_index++) {
      const right = class_definitions[right_index];
      if (left.project !== right.project) continue;
      const right_set = new Set(right.tokens);
      const distance = difference(left_set, right_set);
      const shared = overlap(left_set, right_set);
      const exact = distance === 0;
      const similar = shared >= 8 && distance <= 2;
      if (!exact && !similar) continue;

      issues.push({
        column: right.column,
        file: right.file,
        line: right.line,
        operation: exact ? "repeated utility shape" : "drifting utility shape",
        route: `an app-owned VRUI component; first shape is at ${left.file}:${left.line}`,
      });
    }
  }
  return issues;
}

function inspectHtml(path) {
  const source = readFileSync(path, "utf8");
  const body = /<body>([\s\S]*?)<\/body>/i.exec(source)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  const shell = /^<div id="app"><\/div> <script type="module" src="\.\/main\.ts"><\/script>$/;
  if (body && shell.test(body)) return [];

  return [{
    column: 1,
    file: relative(process.cwd(), path).replaceAll("\\", "/"),
    line: 1,
    operation: "visible HTML",
    route: "a VRUI view; HTML only hosts #app and the module entry",
  }];
}

const issues = [
  ...collectFiles(ROOT, ".ts").flatMap(inspect),
  ...collectFiles(ROOT, ".html").flatMap(inspectHtml),
  ...inspectClassDefinitions(),
];
if (issues.length) {
  for (const issue of issues) {
    console.error(
      `${issue.file}:${issue.line}:${issue.column} ${issue.operation} should use ${issue.route}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log("Example application style is valid.");
}
