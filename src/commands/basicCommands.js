// ============================================================
// 基础命令
// ============================================================
const vscode = require("vscode");

function registerHelloWorldCommand() {
  return vscode.commands.registerCommand("vscodeplugin.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from vscodePlugin!");
  });
}

function registerEnableAltClickCommand() {
  return vscode.commands.registerCommand(
    "vscodeplugin.enableAltClick",
    async () => {
      const config = vscode.workspace.getConfiguration();
      await config.update(
        "editor.multiCursorModifier",
        "ctrlCmd",
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(
        "✅ 已启用 Alt+点击 跳转！现在 Ctrl+点击 用于多光标"
      );
    }
  );
}

module.exports = { registerHelloWorldCommand, registerEnableAltClickCommand };
