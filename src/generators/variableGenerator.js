// ============================================================
// 变量生成器
// ============================================================
const vscode = require("vscode");
const { findVariableDefinition } = require("../finders/variableFinder");
const {
  findClosingBraceIndex,
  findClosingParenIndex,
  findPropValueRangeInObject,
  buildNested,
  insertProperty,
} = require("../utils/codeUtils");
const { ensureSetupReturnHasName } = require("./methodGenerator");

async function handleVariableGeneration(
  editor,
  document,
  text,
  fullPath,
  baseName,
  isVue3
) {
  const varLocation = findVariableDefinition(text, fullPath, baseName, isVue3);
  if (varLocation) {
    let appended = false;
    if (fullPath.includes(".")) {
      appended = await appendNestedPropertyIfNeededScoped(
        document,
        text,
        varLocation.index,
        fullPath,
        baseName,
        isVue3
      );
    }
    if (!appended) {
      const targetPosition = document.positionAt(varLocation.index);
      editor.selection = new vscode.Selection(targetPosition, targetPosition);
      editor.revealRange(new vscode.Range(targetPosition, targetPosition));
    }
    vscode.window.showInformationMessage(
      appended
        ? `已在 ${baseName} 中追加属性: ${fullPath
            .split(".")
            .slice(1)
            .join(".")}`
        : `变量 ${fullPath} 已存在,已跳转`
    );
  } else {
    await generateVariable(editor, document, text, fullPath, baseName, isVue3);
  }
}

async function generateVariable(
  editor,
  document,
  text,
  fullPath,
  baseName,
  isVue3
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
      let insertPosition;
      const scriptCloseMatch = text.match(/<\/script>/);
      const varDecl =
        /(const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*(ref|reactive)\s*\(/g;
      let m,
        lastVarRel = -1;
      while ((m = varDecl.exec(scriptContent)) !== null) lastVarRel = m.index;

      if (lastVarRel >= 0) {
        const slice = scriptContent.slice(lastVarRel);
        const nlRel = slice.indexOf("\n");
        const abs =
          nlRel >= 0
            ? scriptStartIndex + lastVarRel + nlRel + 1
            : scriptStartIndex + lastVarRel + slice.length;
        insertPosition = document.positionAt(abs);
      } else {
        const r1 =
          /const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*\([^)]*\)\s*=>\s*\{/g;
        const r2 = /function\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\(/g;
        let firstMethodRel = -1,
          mm;
        if ((mm = r1.exec(scriptContent)) !== null) firstMethodRel = mm.index;
        if ((mm = r2.exec(scriptContent)) !== null) {
          if (firstMethodRel === -1 || mm.index < firstMethodRel)
            firstMethodRel = mm.index;
        }
        insertPosition =
          firstMethodRel >= 0
            ? document.positionAt(scriptStartIndex + firstMethodRel)
            : document.positionAt(scriptCloseMatch.index);
      }

      const varCode = generateVariableCode(fullPath, baseName, isVue3);
      const edit = new vscode.WorkspaceEdit();
      edit.insert(document.uri, insertPosition, varCode.vue3Setup);
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`已生成 Vue3 变量: ${fullPath}`);
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
        const varCode = generateVariableCode(fullPath, baseName, isVue3);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, returnPosition, `\n${varCode.vue3Setup}`);
        await vscode.workspace.applyEdit(edit);
        await ensureSetupReturnHasName(
          document,
          scriptContent,
          scriptStartIndex,
          baseName
        );
        vscode.window.showInformationMessage(`已生成 Vue3 变量: ${fullPath}`);
      }
    }
  } else {
    const dataMatch = scriptContent.match(/data\s*\(\)\s*{\s*return\s*{/);
    if (dataMatch) {
      const openAbs =
        scriptStartIndex + dataMatch.index + dataMatch[0].length - 1;
      const closeAbs = findClosingBraceIndex(text, openAbs);
      if (closeAbs > openAbs) {
        const parts = fullPath.split(".");
        let value = "''";
        if (parts.length > 1) {
          let nestedObj = "{}";
          for (let i = parts.length - 1; i >= 1; i--) {
            nestedObj =
              i === parts.length - 1
                ? `{ ${parts[i]}: '' }`
                : `{ ${parts[i]}: ${nestedObj} }`;
          }
          value = nestedObj;
        }
        await insertProperty(
          document,
          text,
          openAbs,
          closeAbs,
          baseName,
          value,
          3
        );
      }
      vscode.window.showInformationMessage(`已生成 Vue2 变量: ${fullPath}`);
    } else {
      const exportMatch = scriptContent.match(/export\s+default\s*{/);
      if (exportMatch) {
        const exportStartIndex =
          scriptStartIndex + exportMatch.index + exportMatch[0].length;
        const exportPosition = document.positionAt(exportStartIndex);
        const varCode = generateVariableCode(fullPath, baseName, isVue3);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(exportPosition.line + 1, 0),
          `\tdata() {
\t\treturn {
${varCode.vue2}\t\t}
\t},
`
        );
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`已生成 Vue2 变量: ${fullPath}`);
      }
    }
  }
}

function generateVariableCode(fullPath, baseName, isVue3) {
  const parts = fullPath.split(".");
  if (parts.length === 1) {
    return {
      vue3Setup: `const ${baseName} = ref('')\n`,
      vue2: `\t\t\t${baseName}: '',\n`,
    };
  } else {
    let nestedObj = "{}";
    for (let i = parts.length - 1; i >= 1; i--) {
      nestedObj =
        i === parts.length - 1
          ? `{ ${parts[i]}: '' }`
          : `{ ${parts[i]}: ${nestedObj} }`;
    }
    return {
      vue3Setup: `const ${baseName} = ref(${nestedObj})\n`,
      vue2: `\t\t\t${baseName}: ${nestedObj},\n`,
    };
  }
}

async function appendNestedPropertyIfNeededScoped(
  document,
  text,
  varStartIndex,
  fullPath,
  baseName,
  isVue3
) {
  const parts = fullPath.split(".");
  if (parts.length < 2) return false;
  const chain = parts.slice(1);
  const parentKey = chain[0];
  const lastKey = chain[chain.length - 1];

  if (isVue3) {
    const slice = text.slice(varStartIndex, varStartIndex + 4000);
    const assignIdx = slice.search(/=\s*(?:ref|reactive)\s*\(/);
    if (assignIdx < 0) return false;
    const braceRel = slice.indexOf("{", assignIdx);
    if (braceRel < 0) {
      const parenRel = slice.indexOf("(", assignIdx);
      if (parenRel < 0) return false;
      const openParenAbs = varStartIndex + parenRel;
      const closeParenAbs = findClosingParenIndex(text, openParenAbs);
      if (closeParenAbs <= openParenAbs) return false;
      const nested = buildNested(chain);
      const range = new vscode.Range(
        document.positionAt(openParenAbs + 1),
        document.positionAt(closeParenAbs)
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, range, nested);
      await vscode.workspace.applyEdit(edit);
      return true;
    }
    const openAbs = varStartIndex + braceRel;
    const closeAbs = findClosingBraceIndex(text, openAbs);
    if (closeAbs <= openAbs) return false;
    const objContent = text.slice(openAbs + 1, closeAbs);

    if (chain.length === 1) {
      if (new RegExp(`\\b${lastKey}\\s*:`).test(objContent)) return false;
      return insertProperty(
        document,
        text,
        openAbs,
        closeAbs,
        lastKey,
        "''",
        2
      );
    } else {
      const parentMatch = objContent.match(
        new RegExp(`\\b${parentKey}\\s*:\\s*`)
      );
      if (parentMatch) {
        const valueStartRel = parentMatch.index + parentMatch[0].length;
        const { start, end } = findPropValueRangeInObject(
          objContent,
          valueStartRel
        );
        const absFrom = openAbs + 1 + start;
        const absTo = openAbs + 1 + end;
        if (text[absFrom] === "{") {
          const innerOpen = absFrom;
          const innerClose = findClosingBraceIndex(text, innerOpen);
          const innerContent = text.slice(innerOpen + 1, innerClose);
          if (chain.length === 2) {
            if (new RegExp(`\\b${lastKey}\\s*:`).test(innerContent))
              return false;
            return insertProperty(
              document,
              text,
              innerOpen,
              innerClose,
              lastKey,
              "''",
              2
            );
          }
        }
        const nested = buildNested(chain.slice(1));
        const range = new vscode.Range(
          document.positionAt(absFrom),
          document.positionAt(absTo)
        );
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, nested);
        await vscode.workspace.applyEdit(edit);
        return true;
      } else {
        const nested = buildNested(chain.slice(1));
        return insertProperty(
          document,
          text,
          openAbs,
          closeAbs,
          null,
          null,
          2,
          `${parentKey}: ${nested}`
        );
      }
    }
  } else {
    const slice = text.slice(varStartIndex, varStartIndex + 4000);
    const objIdx = slice.search(new RegExp(`\\b${baseName}\\s*:\\s*{`));
    if (objIdx < 0) {
      const propMatch = slice.match(new RegExp(`\\b${baseName}\\s*:\\s*`));
      if (!propMatch) return false;
      const valueStartRel = propMatch.index + propMatch[0].length;
      const rangeInfo = findPropValueRangeInObject(slice, valueStartRel);
      const absFrom = varStartIndex + rangeInfo.start;
      const absTo = varStartIndex + rangeInfo.end;
      const nested = buildNested(chain);
      const range = new vscode.Range(
        document.positionAt(absFrom),
        document.positionAt(absTo)
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, range, nested);
      await vscode.workspace.applyEdit(edit);
      return true;
    }
    const braceRel = slice.indexOf("{", objIdx);
    if (braceRel < 0) return false;
    const openAbs = varStartIndex + braceRel;
    const closeAbs = findClosingBraceIndex(text, openAbs);
    if (closeAbs <= openAbs) return false;
    const objContent = text.slice(openAbs + 1, closeAbs);

    if (chain.length === 1) {
      if (new RegExp(`\\b${lastKey}\\s*:`).test(objContent)) return false;
      return insertProperty(
        document,
        text,
        openAbs,
        closeAbs,
        lastKey,
        "''",
        4
      );
    } else {
      const parentMatch = objContent.match(
        new RegExp(`\\b${parentKey}\\s*:\\s*`)
      );
      if (parentMatch) {
        const valueStartRel = parentMatch.index + parentMatch[0].length;
        const { start, end } = findPropValueRangeInObject(
          objContent,
          valueStartRel
        );
        const absFrom = openAbs + 1 + start;
        const absTo = openAbs + 1 + end;
        if (text[absFrom] === "{") {
          const innerOpen = absFrom;
          const innerClose = findClosingBraceIndex(text, innerOpen);
          const innerContent = text.slice(innerOpen + 1, innerClose);
          if (chain.length === 2) {
            if (new RegExp(`\\b${lastKey}\\s*:`).test(innerContent))
              return false;
            return insertProperty(
              document,
              text,
              innerOpen,
              innerClose,
              lastKey,
              "''",
              4
            );
          }
        }
        const nested = buildNested(chain.slice(1));
        const range = new vscode.Range(
          document.positionAt(absFrom),
          document.positionAt(absTo)
        );
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, nested);
        await vscode.workspace.applyEdit(edit);
        return true;
      } else {
        const nested = buildNested(chain.slice(1));
        return insertProperty(
          document,
          text,
          openAbs,
          closeAbs,
          null,
          null,
          4,
          `${parentKey}: ${nested}`
        );
      }
    }
  }
  return false;
}

module.exports = { handleVariableGeneration, generateVariable };
