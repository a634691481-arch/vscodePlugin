const vscode = require("vscode");
const { getFullVariablePath } = require("./shared/path");
const {
  isMethodReference,
  findMethodDefinition,
  findVariableDefinition,
} = require("./search/definitions");
const {
  generateVariable,
  appendNestedPropertyIfNeededScoped,
} = require("./generate/variable");
const {
  extractMethodArgsFromLine,
  updateMethodSignatureIfNeeded,
  generateMethod,
} = require("./generate/method");

function activate(context) {
  console.log('Congratulations, your extension "vscodeplugin" is now active!');
  const disposable = vscode.commands.registerCommand(
    "vscodeplugin.helloWorld",
    function () {
      vscode.window.showInformationMessage("Hello World from vscodePlugin!");
    }
  );

  const generateVueCode = vscode.commands.registerCommand(
    "vscodeplugin.generateVueCode",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const document = editor.document;
      const selection = editor.selection;
      const position = selection.active;
      const text = document.getText();
      const line = document.lineAt(position.line).text;
      const { fullPath, baseName } = getFullVariablePath(document, position, line);
      if (!fullPath) {
        vscode.window.showWarningMessage("请将光标放在变量或方法名上");
        return;
      }
      const isVue3 =
        text.includes("setup()") ||
        text.includes("<script setup>") ||
        /import\s+{[^}]*ref[^}]*}\s+from\s+['"]vue['"]/.test(text);
      const isMethodCall = isMethodReference(line, baseName);
      if (isMethodCall) {
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
      } else {
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
              ? `已在 ${baseName} 中追加属性: ${fullPath.split(".").slice(1).join(".")}`
              : `变量 ${fullPath} 已存在,已跳转`
          );
        } else {
          await generateVariable(editor, document, text, fullPath, baseName, isVue3);
        }
      }
    }
  );

  context.subscriptions.push(disposable, generateVueCode);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
