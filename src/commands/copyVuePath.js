// ============================================================
// 复制 Vue 页面路径命令
// ============================================================
const vscode = require("vscode");

function registerCopyVuePathCommand() {
  return vscode.commands.registerCommand(
    "vscodeplugin.copyVuePath",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("请先打开一个Vue文件");
        return;
      }

      const filePath = editor.document.uri.fsPath;

      if (!filePath.endsWith(".vue")) {
        vscode.window.showWarningMessage("当前文件不是Vue文件");
        return;
      }

      // 获取工作区根路径
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage("未找到工作区");
        return;
      }

      const rootPath = workspaceFolders[0].uri.fsPath;

      // 计算相对路径并去掉 .vue 后缀
      let relativePath = filePath.replace(rootPath, "");
      relativePath = relativePath.replace(/\\/g, "/"); // 统一为正斜杠
      relativePath = relativePath.replace(/\.vue$/, ""); // 去掉 .vue 后缀

      await vscode.env.clipboard.writeText(relativePath);
      vscode.window.showInformationMessage(`✅ 已复制路径: ${relativePath}`);
    }
  );
}

module.exports = { registerCopyVuePathCommand };
