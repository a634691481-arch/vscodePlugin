// ============================================================
// AutoVue Companion - VSCode 插件主入口
// ============================================================

// 命令模块
const { registerCopyVuePathCommand } = require("./src/commands/copyVuePath");
const {
  registerInsertConsoleLogCommand,
} = require("./src/commands/insertConsoleLog");
const {
  registerBracketSelectCommands,
} = require("./src/commands/bracketSelect");
const {
  registerQuickGenerateCommand,
} = require("./src/commands/quickGenerate");

// 功能模块
const { registerGoHome } = require("./src/features/goHome");
const {
  registerSplitViewDefinition,
} = require("./src/features/splitViewDefinition");

/**
 * 插件激活入口
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
  console.log("🚀 AutoVue Companion 已激活");

  // 注册所有命令
  const commands = [
    registerCopyVuePathCommand(),
    registerInsertConsoleLogCommand(),
    ...registerBracketSelectCommands(),
    registerQuickGenerateCommand(),
  ];

  // 注册下班提醒
  const goHome = registerGoHome();

  // 注册分栏显示定义功能（Alt+左键点击跳转）
  const splitViewDefinitions = registerSplitViewDefinition();

  // 推送到订阅列表
  context.subscriptions.push(...commands, goHome, ...splitViewDefinitions);
}

function deactivate() {}

module.exports = { activate, deactivate };
