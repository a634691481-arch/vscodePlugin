const vscode = require("vscode");
const { findMethodDefinition } = require("../search/definitions");
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
    while (used.has(name)) {
      name = `${name}_${idx + 1}`;
    }
    used.add(name);
    names.push(name);
  });
  return names;
}

async function updateMethodSignatureIfNeeded(
  document,
  text,
  startIndex,
  methodName,
  args,
  isVue3
) {
  const params = args.join(", ");
  if (!params) return;
  const slice = text.slice(startIndex, startIndex + 400);
  const replace = async (searchRegex, makeReplacement) => {
    const m = slice.match(searchRegex);
    if (!m) return false;
    const from = startIndex + m.index;
    const to = from + m[0].length;
    const range = new vscode.Range(
      document.positionAt(from),
      document.positionAt(to)
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, makeReplacement(m));
    await vscode.workspace.applyEdit(edit);
    return true;
  };
  if (isVue3) {
    if (
      await replace(
        new RegExp(`const\\s+${methodName}\\s*=\\s*\\(([^)]*)\\)\\s*=>`),
        () => `const ${methodName} = (${params}) =>`
      )
    ) {
      return;
    }
    if (
      await replace(
        new RegExp(`function\\s+${methodName}\\s*\\(([^)]*)\\)`),
        () => `function ${methodName}(${params})`
      )
    ) {
      return;
    }
  } else {
    if (
      await replace(
        new RegExp(`${methodName}\\s*\\(([^)]*)\\)\\s*{`),
        () => `${methodName}(${params}) {`
      )
    ) {
      return;
    }
  }
}

async function generateMethod(
  editor,
  document,
  text,
  methodName,
  isVue3,
  args = []
) {
  const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    vscode.window.showWarningMessage("未找到 <script> 标签");
    return;
  }
  const scriptContent = scriptMatch[1];
  const scriptStartIndex =
    scriptMatch.index + scriptMatch[0].indexOf(scriptContent);
  if (isVue3) {
    if (text.includes("<script setup>")) {
      const scriptEndMatch = text.match(/<\/script>/);
      const scriptEndIndex = scriptEndMatch.index;
      const scriptEndPosition = document.positionAt(scriptEndIndex);
      const params = args.join(", ");
      const edit = new vscode.WorkspaceEdit();
      edit.insert(
        document.uri,
        scriptEndPosition,
        `const ${methodName} = (${params}) => {
\t// TODO: 实现方法逻辑
}

`
      );
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`已生成 Vue3 方法: ${methodName}`);
    } else {
      const setupMatch = scriptContent.match(
        /setup\s*\([^)]*\)\s*{[\s\S]*?return\s*{/
      );
      if (setupMatch) {
        const returnIndex =
          scriptStartIndex +
          setupMatch.index +
          setupMatch[0].length -
          "return {".length;
        const returnPosition = document.positionAt(returnIndex);
        const params = args.join(", ");
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(returnPosition.line, 0),
          `\t\tconst ${methodName} = (${params}) => {
\t\t\t// TODO: 实现方法逻辑
\t\t}

`
        );
        await vscode.workspace.applyEdit(edit);
        await require("./variable").ensureSetupReturnHasName(
          document,
          scriptContent,
          scriptStartIndex,
          methodName
        );
        vscode.window.showInformationMessage(`已生成 Vue3 方法: ${methodName}`);
      }
    }
  } else {
    const methodsMatch = scriptContent.match(/methods\s*:\s*{/);
    if (methodsMatch) {
      const openAbsIndex =
        scriptStartIndex + methodsMatch.index + methodsMatch[0].length - 1;
      const closeAbsIndex = require("../shared/utils").findClosingBraceIndex(
        text,
        openAbsIndex
      );
      if (closeAbsIndex > openAbsIndex) {
        const insertPos = document.positionAt(closeAbsIndex);
        const params = args.join(", ");
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          insertPos,
          `\n\t\t${methodName}(${params}) {\n\t\t\t// TODO: 实现方法逻辑\n\t\t},\n`
        );
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`已生成 Vue2 方法: ${methodName}`);
      }
    } else {
      const exportMatch = scriptContent.match(/export\s+default\s*{/);
      if (exportMatch) {
        const exportStartIndex =
          scriptStartIndex + exportMatch.index + exportMatch[0].length;
        const exportPosition = document.positionAt(exportStartIndex);
        const params = args.join(", ");
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(exportPosition.line + 1, 0),
          `\tmethods: {
\t\t${methodName}(${params}) {
\t\t\t// TODO: 实现方法逻辑
\t\t}
\t},
`
        );
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`已生成 Vue2 方法: ${methodName}`);
      }
    }
  }
}

module.exports = {
  extractMethodArgsFromLine,
  updateMethodSignatureIfNeeded,
  generateMethod,
};
