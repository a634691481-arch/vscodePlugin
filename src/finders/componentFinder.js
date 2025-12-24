// ============================================================
// 组件导入查找
// ============================================================
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function findComponentImport(text, componentName, document) {
  const patterns = [
    new RegExp(`import\\s+${componentName}\\s+from\\s+['"]([^'"]+)['"]`, "g"),
    new RegExp(
      `import\\s*{[^}]*\\b${componentName}\\b[^}]*}\\s*from\\s+['"]([^'"]+)['"]`,
      "g"
    ),
  ];

  const currentFileDir = document ? path.dirname(document.uri.fsPath) : null;

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const importPath = match[1];

      // 处理相对路径
      if (importPath.startsWith("./") || importPath.startsWith("../")) {
        if (currentFileDir) {
          const possibleExtensions = [
            "",
            ".vue",
            ".js",
            ".ts",
            ".jsx",
            ".tsx",
            "/index.vue",
            "/index.js",
            "/index.ts",
          ];
          for (const ext of possibleExtensions) {
            const fullPath = path.resolve(currentFileDir, importPath + ext);
            if (fs.existsSync(fullPath)) {
              return new vscode.Location(
                vscode.Uri.file(fullPath),
                new vscode.Position(0, 0)
              );
            }
          }
        }
      }

      // 处理 @ 别名
      if (importPath.startsWith("@/")) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          const rootPath = workspaceFolders[0].uri.fsPath;
          const srcPath = path.join(rootPath, "src", importPath.slice(2));
          const possibleExtensions = [
            "",
            ".vue",
            ".js",
            ".ts",
            ".jsx",
            ".tsx",
            "/index.vue",
            "/index.js",
            "/index.ts",
          ];
          for (const ext of possibleExtensions) {
            const fullPath = srcPath + ext;
            if (fs.existsSync(fullPath)) {
              return new vscode.Location(
                vscode.Uri.file(fullPath),
                new vscode.Position(0, 0)
              );
            }
          }
        }
      }
    }
  }
  return null;
}

module.exports = { findComponentImport };
