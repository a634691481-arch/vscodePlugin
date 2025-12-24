// ============================================================
// Vue 变量/方法生成器 - VSCode 插件主入口
// ============================================================

// 命令模块
const {
  registerHelloWorldCommand,
  registerEnableAltClickCommand,
} = require("./src/commands/basicCommands");
const {
  registerGenerateVueCodeCommand,
} = require("./src/commands/generateVueCode");
const { registerCopyVuePathCommand } = require("./src/commands/copyVuePath");

// 提供器模块
const {
  registerDefinitionProvider,
} = require("./src/providers/definitionProvider");

/**
 * 插件激活入口
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
  console.log("🚀 Vue 变量/方法生成器已激活");

  // 注册所有命令
  const commands = [
    registerHelloWorldCommand(),
    registerEnableAltClickCommand(),
    registerGenerateVueCodeCommand(),
    registerCopyVuePathCommand(),
  ];

  // 注册定义提供器
  const defReg = registerDefinitionProvider();

  // 推送到订阅列表
  context.subscriptions.push(...commands, defReg);
}

function deactivate() {}

module.exports = { activate, deactivate };
