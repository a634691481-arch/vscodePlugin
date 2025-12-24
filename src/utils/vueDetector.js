// ============================================================
// Vue 版本检测与方法判断
// ============================================================

function detectVue3(text) {
  return (
    text.includes("setup()") ||
    text.includes("<script setup>") ||
    /import\s+{[^}]*ref[^}]*}\s+from\s+['"]vue['"]/.test(text)
  );
}

function isMethodReference(line, methodName) {
  if (line.includes(methodName + "(")) return true;

  const eventBindingPatterns = [
    new RegExp(`@\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*["']`),
    new RegExp(`v-on:\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*["']`),
    new RegExp(`@\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*\\(`),
    new RegExp(`v-on:\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*\\(`),
  ];

  return eventBindingPatterns.some((pattern) => pattern.test(line));
}

function extractMethodArgsFromLine(line, methodName) {
  const regex = new RegExp(`${methodName}\\s*\\(([^)]*)\\)`);
  const m = line.match(regex);
  if (!m) return [];

  const argsStr = m[1].trim();
  if (!argsStr) return [];

  const rawArgs = argsStr.split(",");
  const names = [];
  const used = new Set();

  rawArgs.forEach((raw, idx) => {
    const token = raw.trim();
    if (!token) return;
    const idMatches = token.match(/[A-Za-z_$][A-Za-z0-9_$]*/g);
    let name = idMatches ? idMatches[idMatches.length - 1] : `arg${idx + 1}`;
    while (used.has(name)) name = `${name}_${idx + 1}`;
    used.add(name);
    names.push(name);
  });

  return names;
}

module.exports = {
  detectVue3,
  isMethodReference,
  extractMethodArgsFromLine,
};
