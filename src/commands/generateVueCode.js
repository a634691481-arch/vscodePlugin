// ============================================================
// Vue 代码生成命令
// ============================================================
const vscode = require("vscode");
const { getFullVariablePath } = require("../utils/pathParser");
const { detectVue3, isMethodReference } = require("../utils/vueDetector");
const { handleMethodGeneration } = require("../generators/methodGenerator");
const { handleVariableGeneration } = require("../generators/variableGenerator");

function registerGenerateVueCodeCommand() {
  return vscode.commands.registerCommand(
    "vscodeplugin.generateVueCode",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const position = editor.selection.active;
      const text = document.getText();
      const line = document.lineAt(position.line).text;

      const { fullPath, baseName } = getFullVariablePath(
        document,
        position,
        line
      );
      if (!fullPath) {
        vscode.window.showWarningMessage("请将光标放在变量或方法名上");
        return;
      }

      const isVue3 = detectVue3(text);
      const isMethodCall = isMethodReference(line, baseName);

      if (isMethodCall) {
        await handleMethodGeneration(
          editor,
          document,
          text,
          baseName,
          isVue3,
          line
        );
      } else {
        await handleVariableGeneration(
          editor,
          document,
          text,
          fullPath,
          baseName,
          isVue3
        );
      }
    }
  );
}

module.exports = { registerGenerateVueCodeCommand };
