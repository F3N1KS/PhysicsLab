// Small, bounded Pratt parser. Expressions are interpreted as an AST; no code generation.
type Node =
  | { kind: "number"; value: number }
  | { kind: "variable"; name: string }
  | { kind: "unary"; op: string; child: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "call"; name: string; arg: Node };
const functions: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  log: Math.log,
};
export function compile(source: string, names: string[]) {
  if (!source.trim() || source.length > 256)
    throw new Error("Выражение должно содержать от 1 до 256 символов.");
  const tokens: string[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) {
      cursor++;
      continue;
    }
    const token =
      /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|^[A-Za-z_][A-Za-z_0-9]*|^[+\-*/^()]/.exec(
        source.slice(cursor),
      );
    if (!token) throw new Error(`Недопустимый символ в позиции ${cursor + 1}.`);
    tokens.push(token[0]);
    cursor += token[0].length;
  }
  let pos = 0;
  let count = 0;
  const parse = (min = 0): Node => {
    if (++count > 128) throw new Error("Выражение слишком сложное.");
    const token = tokens[pos++];
    let left: Node;
    if (token === "-" || token === "+")
      left = { kind: "unary", op: token, child: parse(25) };
    else if (token === "(") {
      left = parse();
      if (tokens[pos++] !== ")")
        throw new Error("Не хватает закрывающей скобки.");
    } else if (token && /^(\d|\.)/.test(token))
      left = { kind: "number", value: Number(token) };
    else if (token && Object.hasOwn(functions, token)) {
      if (tokens[pos++] !== "(")
        throw new Error(`После ${token} нужна скобка.`);
      left = { kind: "call", name: token, arg: parse() };
      if (tokens[pos++] !== ")")
        throw new Error("Не хватает закрывающей скобки.");
    } else if (token && [...names, "pi", "e"].includes(token))
      left = { kind: "variable", name: token };
    else
      throw new Error(
        `Неизвестное имя или пропущенный операнд: ${token ?? "конец выражения"}.`,
      );
    while (pos < tokens.length) {
      const op = tokens[pos];
      const prec =
        op === "+" || op === "-"
          ? 10
          : op === "*" || op === "/"
            ? 20
            : op === "^"
              ? 30
              : -1;
      if (prec < min) break;
      pos++;
      left = {
        kind: "binary",
        op,
        left,
        right: parse(op === "^" ? prec : prec + 1),
      };
    }
    return left;
  };
  const root = parse();
  if (pos !== tokens.length) throw new Error("Проверьте операторы и скобки.");
  const evaluate = (n: Node, vars: Record<string, number>): number => {
    if (n.kind === "number") return n.value;
    if (n.kind === "variable")
      return n.name === "pi" ? Math.PI : n.name === "e" ? Math.E : vars[n.name];
    if (n.kind === "unary")
      return (n.op === "-" ? -1 : 1) * evaluate(n.child, vars);
    if (n.kind === "call") return functions[n.name](evaluate(n.arg, vars));
    const a = evaluate(n.left, vars),
      b = evaluate(n.right, vars);
    return n.op === "+"
      ? a + b
      : n.op === "-"
        ? a - b
        : n.op === "*"
          ? a * b
          : n.op === "/"
            ? a / b
            : a ** b;
  };
  return (vars: Record<string, number>) => {
    const value = evaluate(root, vars);
    if (!Number.isFinite(value) || Math.abs(value) > 1e10)
      throw new Error(
        "Сила вышла за допустимые пределы. Проверьте деление на ноль и область определения функций.",
      );
    return value;
  };
}
