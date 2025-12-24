// ============================================================
// 方法生成器
// ============================================================
const vscode = require("vscode");
const { findMethodDefinition } = require("../finders/methodFinder");
const { extractMethodArgsFromLine } = require("../utils/vueDetector");
const { findClosingBraceIndex } = require("../utils/codeUtils");

async function handleMethodGeneration(
  editor,
  document,
  text,
  baseName,
  isVue3,
  line
) {
  const methodLocation = findMethodDefinition(text, baseName, isVue3);
  if (methodLocation) {
    const args = extractMethodArgsFromLine(line, baseName);
    if (args.length) {
      await updateMethodSignatureIfNeeded(
        document,
        text,
        methodLocation.index,
        baseName,
        args,
        isVue3
      );
    }
    const targetPosition = document.positionAt(methodLocation.index);
    editor.selection = new vscode.Selection(targetPosition, targetPosition);
    editor.revealRange(new vscode.Range(targetPosition, targetPosition));
    vscode.window.showInformationMessage(`方法 ${baseName} 已存在,已跳转`);
  } else {
    const args = extractMethodArgsFromLine(line, baseName);
    await generateMethod(editor, document, text, baseName, isVue3, args);
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
  const params = args.join(", ");

  if (isVue3) {
    if (text.includes("<script setup>")) {
      const scriptEndMatch = text.match(/<\/script>/);
      const scriptEndPosition = document.positionAt(scriptEndMatch.index);
      const edit = new vscode.WorkspaceEdit();
      edit.insert(
        document.uri,
        scriptEndPosition,
        `const ${methodName} = (${params}) => {
\t
}

`
      );
      await vscode.workspace.applyEdit(edit);
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
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(returnPosition.line, 0),
          `\t\tconst ${methodName} = (${params}) => {}`
        );
        await vscode.workspace.applyEdit(edit);
        await ensureSetupReturnHasName(
          document,
          scriptContent,
          scriptStartIndex,
          methodName
        );
      }
    }
    vscode.window.showInformationMessage(`已生成 Vue3 方法: ${methodName}`);
  } else {
    const methodsMatch = scriptContent.match(/methods\s*:\s*{/);
    if (methodsMatch) {
      const openAbsIndex =
        scriptStartIndex + methodsMatch.index + methodsMatch[0].length - 1;
      const closeAbsIndex = findClosingBraceIndex(text, openAbsIndex);
      if (closeAbsIndex > openAbsIndex) {
        const insertPos = document.positionAt(closeAbsIndex);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          insertPos,
          `
\t\t${methodName}(${params}) {
\t\t\t
\t\t},
`
        );
        await vscode.workspace.applyEdit(edit);
      }
    } else {
      const exportMatch = scriptContent.match(/export\s+default\s*{/);
      if (exportMatch) {
        const exportStartIndex =
          scriptStartIndex + exportMatch.index + exportMatch[0].length;
        const exportPosition = document.positionAt(exportStartIndex);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(exportPosition.line + 1, 0),
          `\tmethods: {
\t\t${methodName}(${params}) {
\t\t\t
\t\t}
\t},
`
        );
        await vscode.workspace.applyEdit(edit);
      }
    }
    vscode.window.showInformationMessage(`已生成 Vue2 方法: ${methodName}`);
  }
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
    )
      return;
    if (
      await replace(
        new RegExp(`function\\s+${methodName}\\s*\\(([^)]*)\\)`),
        () => `function ${methodName}(${params})`
      )
    )
      return;
  } else {
    if (
      await replace(
        new RegExp(`${methodName}\\s*\\(([^)]*)\\)\\s*{`),
        () => `${methodName}(${params}) {`
      )
    )
      return;
  }
}

async function ensureSetupReturnHasName(
  document,
  scriptContent,
  scriptStartIndex,
  name
) {
  const setupMatch = scriptContent.match(
    /setup\s*\([^)]*\)\s*{([\s\S]*?)return\s*{([\s\S]*?)}/m
  );
  if (!setupMatch) return;

  const returnBlock = setupMatch[2];
  if (new RegExp(`\\b${name}\\b`).test(returnBlock)) return;

  const wholeMatch = setupMatch[0];
  const returnStartInWhole = wholeMatch.indexOf("return {") + "return {".length;
  const returnStartIndex =
    scriptStartIndex + scriptContent.indexOf(wholeMatch) + returnStartInWhole;
  const insertPos = document.positionAt(returnStartIndex);
  const edit = new vscode.WorkspaceEdit();
  edit.insert(
    document.uri,
    new vscode.Position(insertPos.line + 1, 0),
    `\t\t${name},\n`
  );
  await vscode.workspace.applyEdit(edit);
}

module.exports = {
  handleMethodGeneration,
  generateMethod,
  ensureSetupReturnHasName,
};
