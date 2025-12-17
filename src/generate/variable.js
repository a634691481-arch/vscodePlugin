const vscode = require("vscode");
const {
  findClosingBraceIndex,
  findClosingParenIndex,
  findPropValueRangeInObject,
} = require("../shared/utils");
const { findVariableDefinition } = require("../search/definitions");

async function ensureSetupReturnHasName(
  document,
  scriptContent,
  scriptStartIndex,
  name
) {
  const setupMatch = scriptContent.match(
    /setup\s*\([^)]*\)\s*{([\s\S]*?)return\s*{([\s\S]*?)}/m
  );
  if (!setupMatch) {
    return;
  }
  const returnBlock = setupMatch[2];
  const exists = new RegExp(`\\b${name}\\b`).test(returnBlock);
  if (exists) {
    return;
  }
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

function generateVariableCode(fullPath, baseName, isVue3) {
  const parts = fullPath.split(".");
  if (parts.length === 1) {
    if (isVue3) {
      return {
        vue3Setup: `const ${baseName} = ref('')\n`,
        vue2: `\t\t\t${baseName}: '',\n`,
      };
    } else {
      return {
        vue3Setup: `const ${baseName} = ref('')\n`,
        vue2: `\t\t\t${baseName}: '',\n`,
      };
    }
  } else {
    let nestedObj = "{}";
    for (let i = parts.length - 1; i >= 1; i--) {
      if (i === parts.length - 1) {
        nestedObj = `{ ${parts[i]}: '' }`;
      } else {
        nestedObj = `{ ${parts[i]}: ${nestedObj} }`;
      }
    }
    if (isVue3) {
      return {
        vue3Setup: `const ${baseName} = ref(${nestedObj})\n`,
        vue2: `\t\t\t${baseName}: ${nestedObj},\n`,
      };
    } else {
      return {
        vue3Setup: `const ${baseName} = ref(${nestedObj})\n`,
        vue2: `\t\t\t${baseName}: ${nestedObj},\n`,
      };
    }
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
      insertPosition = document.positionAt(scriptCloseMatch.index);
      const varCode = generateVariableCode(fullPath, baseName, isVue3);
      const edit = new vscode.WorkspaceEdit();
      edit.insert(document.uri, insertPosition, varCode.vue3Setup);
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`已生成 Vue3 变量: ${fullPath}`);
    } else {
      const setupMatch = scriptContent.match(/setup\s*\([^)]*\)\s*{/);
      if (setupMatch) {
        const setupStartIndex =
          scriptStartIndex + setupMatch.index + setupMatch[0].length;
        const setupPosition = document.positionAt(setupStartIndex);
        const varCode = generateVariableCode(fullPath, baseName, isVue3);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(setupPosition.line + 1, 0),
          varCode.vue3Setup
        );
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
      const dataStartIndex =
        scriptStartIndex + dataMatch.index + dataMatch[0].length;
      const dataPosition = document.positionAt(dataStartIndex);
      const varCode = generateVariableCode(fullPath, baseName, isVue3);
      const edit = new vscode.WorkspaceEdit();
      edit.insert(
        document.uri,
        new vscode.Position(dataPosition.line + 1, 0),
        varCode.vue2
      );
      await vscode.workspace.applyEdit(edit);
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
      let nested = "";
      for (let i = chain.length - 1; i >= 0; i--) {
        if (i === chain.length - 1) nested = `{ ${chain[i]}: '' }`;
        else nested = `{ ${chain[i]}: ${nested} }`;
      }
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
      const exists = new RegExp(`\\b${lastKey}\\s*:`).test(objContent);
      if (exists) return false;
      return await insertProperty(
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
        const valFirstChar = text[absFrom];
        if (valFirstChar === "{") {
          const innerOpen = absFrom;
          const innerClose = findClosingBraceIndex(text, innerOpen);
          const innerContent = text.slice(innerOpen + 1, innerClose);
          if (chain.length === 2) {
            const existsInner = new RegExp(`\\b${lastKey}\\s*:`).test(
              innerContent
            );
            if (existsInner) return false;
            return await insertProperty(
              document,
              text,
              innerOpen,
              innerClose,
              lastKey,
              "''",
              2
            );
          }
          let nested = "";
          for (let i = chain.length - 1; i >= 1; i--) {
            if (i === chain.length - 1) nested = `{ ${chain[i]}: '' }`;
            else nested = `{ ${chain[i]}: ${nested} }`;
          }
          const range = new vscode.Range(
            document.positionAt(absFrom),
            document.positionAt(absTo)
          );
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, range, nested);
          await vscode.workspace.applyEdit(edit);
          return true;
        } else {
          let nested = "";
          for (let i = chain.length - 1; i >= 1; i--) {
            if (i === chain.length - 1) nested = `{ ${chain[i]}: '' }`;
            else nested = `{ ${chain[i]}: ${nested} }`;
          }
          const range = new vscode.Range(
            document.positionAt(absFrom),
            document.positionAt(absTo)
          );
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, range, nested);
          await vscode.workspace.applyEdit(edit);
          return true;
        }
      } else {
        let nested = "";
        for (let i = chain.length - 1; i >= 1; i--) {
          if (i === chain.length - 1) nested = `{ ${chain[i]}: '' }`;
          else nested = `{ ${chain[i]}: ${nested} }`;
        }
        const addition = `${parentKey}: ${nested}`;
        return await insertProperty(
          document,
          text,
          openAbs,
          closeAbs,
          null,
          null,
          2,
          addition
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
      let nested = "";
      for (let i = chain.length - 1; i >= 0; i--) {
        if (i === chain.length - 1) nested = `{ ${chain[i]}: '' }`;
        else nested = `{ ${chain[i]}: ${nested} }`;
      }
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
      const exists = new RegExp(`\\b${lastKey}\\s*:`).test(objContent);
      if (exists) return false;
      return await insertProperty(
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
        const valFirstChar = text[absFrom];
        if (valFirstChar === "{") {
          const innerOpen = absFrom;
          const innerClose = findClosingBraceIndex(text, innerOpen);
          const innerContent = text.slice(innerOpen + 1, innerClose);
          if (chain.length === 2) {
            const existsInner = new RegExp(`\\b${lastKey}\\s*:`).test(
              innerContent
            );
            if (existsInner) return false;
            return await insertProperty(
              document,
              text,
              innerOpen,
              innerClose,
              lastKey,
              "''",
              4
            );
          }
          let nested = "";
          for (let i = chain.length - 1; i >= 1; i--) {
            if (i === chain.length - 1) nested = `{ ${chain[i]}: '' }`;
            else nested = `{ ${chain[i]}: ${nested} }`;
          }
          const range = new vscode.Range(
            document.positionAt(absFrom),
            document.positionAt(absTo)
          );
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, range, nested);
          await vscode.workspace.applyEdit(edit);
          return true;
        } else {
          let nested = "";
          for (let i = chain.length - 1; i >= 1; i--) {
            if (i === chain.length - 1) nested = `{ ${chain[i]}: '' }`;
            else nested = `{ ${chain[i]}: ${nested} }`;
          }
          const range = new vscode.Range(
            document.positionAt(absFrom),
            document.positionAt(absTo)
          );
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, range, nested);
          await vscode.workspace.applyEdit(edit);
          return true;
        }
      } else {
        let nested = "";
        for (let i = chain.length - 1; i >= 1; i--) {
          if (i === chain.length - 1) nested = `{ ${chain[i]}: '' }`;
          else nested = `{ ${chain[i]}: ${nested} }`;
        }
        const addition = `${parentKey}: ${nested}`;
        return await insertProperty(
          document,
          text,
          openAbs,
          closeAbs,
          null,
          null,
          4,
          addition
        );
      }
    }
  }
}

async function insertProperty(
  document,
  text,
  openAbs,
  closeAbs,
  key,
  value,
  indentTabs,
  additionOverride
) {
  const objContent = text.slice(openAbs + 1, closeAbs);
  const isMultiline = objContent.includes("\n");
  let prev = closeAbs - 1;
  while (prev > openAbs && /\s/.test(text[prev])) prev--;
  const edit = new vscode.WorkspaceEdit();
  if (isMultiline) {
    if (text[prev] !== ",") {
      edit.insert(document.uri, document.positionAt(prev + 1), ",");
    }
    const lastNl = text.lastIndexOf("\n", closeAbs - 1);
    const indentMatch =
      lastNl >= 0 ? text.slice(lastNl + 1, closeAbs).match(/^\s*/) : null;
    const indent = indentMatch ? indentMatch[0] : "\t".repeat(indentTabs || 2);
    const prefix = text[closeAbs - 1] === "\n" ? "" : "\n";
    const addition = additionOverride ?? `${key}: ${value}`;
    edit.insert(
      document.uri,
      document.positionAt(closeAbs),
      `${prefix}${indent}${addition}\n`
    );
  } else {
    const addition = additionOverride ?? `${key}: ${value}`;
    edit.insert(document.uri, document.positionAt(closeAbs), `, ${addition}`);
  }
  await vscode.workspace.applyEdit(edit);
  return true;
}

module.exports = {
  ensureSetupReturnHasName,
  generateVariableCode,
  generateVariable,
  appendNestedPropertyIfNeededScoped,
  insertProperty,
};
