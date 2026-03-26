// ============================================================
// AutoVue Companion - VSCode 插件主入口
// ============================================================

const { registerCopyVuePathCommand } = require("./src/commands/copyVuePath");

/**
 * 插件激活入口
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
  console.log("🚀 AutoVue Companion 已激活");

  // 注册复制Vue路径命令
  context.subscriptions.push(registerCopyVuePathCommand());
}

function deactivate() {}

module.exports = { activate, deactivate };
