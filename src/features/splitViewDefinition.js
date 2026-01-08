// ============================================================
// 分栏显示定义功能 - Alt+左键点击跳转到侧边分栏
// ============================================================
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

/**
 * Definition Provider - 处理 Alt+点击跳转
 */
class SplitViewDefinitionProvider {
  async provideDefinition(document, position, token) {
    // 尝试获取当前单词（支持连字符和中划线）
    let wordRange = document.getWordRangeAtPosition(position, /[\w-]+/);
    let word = null;

    // 如果没有找到，尝试检查是否在 Vue 组件标签中
    if (!wordRange) {
      const lineText = document.lineAt(position.line).text;
      const tagMatch = this.getComponentTagAtPosition(
        lineText,
        position.character
      );
      if (tagMatch) {
        wordRange = new vscode.Range(
          new vscode.Position(position.line, tagMatch.start),
          new vscode.Position(position.line, tagMatch.end)
        );
        word = tagMatch.word;
      }
    }

    if (!wordRange) return null;
    if (!word) word = document.getText(wordRange);

    // 1. 检查是否是 import 语句中的模块名
    const importMatch = this.findImportDefinition(document, word);
    if (importMatch) {
      return importMatch;
    }

    // 2. 检查是否是组件引用（局部注册的组件）
    const componentMatch = this.findComponentDefinition(document, word);
    if (componentMatch) {
      return componentMatch;
    }

    // 3. 检查是否是全局组件（在整个项目中搜索）
    const globalComponentMatch = await this.findGlobalComponent(word);
    if (globalComponentMatch) {
      return globalComponentMatch;
    }

    // 4. 检查是否是方法调用或变量引用（在同一文件内）
    const localDefinition = this.findLocalDefinition(document, word, position);
    if (localDefinition) {
      return localDefinition;
    }

    return null;
  }

  /**
   * 获取光标位置的 Vue 组件标签名
   */
  getComponentTagAtPosition(lineText, charPosition) {
    // 匹配 <ComponentName> 或 </ComponentName> 或 <ComponentName />
    // 支持 PascalCase (大写开头) 和 kebab-case (小写带中划线)
    const tagRegex = /<\/?([A-Z][\w-]*|[a-z]+(?:-[a-z0-9]+)+)(?:\s|>|\/)/g;
    let match;

    while ((match = tagRegex.exec(lineText)) !== null) {
      const tagName = match[1];
      const start = match.index + match[0].indexOf(tagName);
      const end = start + tagName.length;

      // 检查光标是否在标签名范围内
      if (charPosition >= start && charPosition <= end) {
        return { word: tagName, start, end };
      }
    }

    return null;
  }

  /**
   * 查找全局组件（在整个项目中搜索）
   */
  async findGlobalComponent(componentName) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return null;

    // 将 PascalCase 组件名转换为 kebab-case 文件名
    const kebabName = this.toKebabCase(componentName);
    const pascalName = componentName.includes("-")
      ? this.toPascalCase(componentName)
      : componentName;

    // 常见的组件文件命名模式
    const possibleFileNames = [
      `${pascalName}.vue`,
      `${kebabName}.vue`,
      `${pascalName}/index.vue`,
      `${kebabName}/index.vue`,
      `index.vue`,
      // UniApp 特有的组件命名
      `${pascalName}/components/${pascalName}.vue`,
      `${kebabName}/components/${kebabName}.vue`,
      `${pascalName}/${pascalName}.vue`,
      `${kebabName}/${kebabName}.vue`,
    ];

    // 常见的组件目录
    const componentDirs = [
      "uni_modules", // UniApp 插件市场组件
      "components", // UniApp 自定义组件
      "src/components",
      "src/components/common",
      "src/components/global",
      "src/views/components",
    ];

    // 在常见目录中搜索
    for (const dir of componentDirs) {
      const fullDir = path.join(workspaceFolder.uri.fsPath, dir);
      if (!fs.existsSync(fullDir)) continue;

      for (const fileName of possibleFileNames) {
        const filePath = path.join(fullDir, fileName);
        if (fs.existsSync(filePath)) {
          return new vscode.Location(
            vscode.Uri.file(filePath),
            new vscode.Position(0, 0)
          );
        }
      }
    }

    // 如果没找到，尝试在 uni_modules 中递归搜索（UniApp 组件）
    const uniModulesPath = path.join(workspaceFolder.uri.fsPath, "uni_modules");
    if (fs.existsSync(uniModulesPath)) {
      const found = this.searchComponentRecursive(
        uniModulesPath,
        possibleFileNames,
        4
      ); // UniApp 组件嵌套更深
      if (found) {
        return new vscode.Location(
          vscode.Uri.file(found),
          new vscode.Position(0, 0)
        );
      }
    }

    // 如果还没找到，尝试在整个 src 目录中搜索
    const srcPath = path.join(workspaceFolder.uri.fsPath, "src");
    if (fs.existsSync(srcPath)) {
      const found = this.searchComponentRecursive(
        srcPath,
        possibleFileNames,
        3
      ); // 限制搜索深度
      if (found) {
        return new vscode.Location(
          vscode.Uri.file(found),
          new vscode.Position(0, 0)
        );
      }
    }

    // 最后尝试在 components 目录搜索
    const componentsPath = path.join(workspaceFolder.uri.fsPath, "components");
    if (fs.existsSync(componentsPath)) {
      const found = this.searchComponentRecursive(
        componentsPath,
        possibleFileNames,
        3
      );
      if (found) {
        return new vscode.Location(
          vscode.Uri.file(found),
          new vscode.Position(0, 0)
        );
      }
    }

    return null;
  }

  /**
   * 递归搜索组件文件
   */
  searchComponentRecursive(dir, fileNames, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) return null;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      // 先检查当前目录
      for (const fileName of fileNames) {
        const filePath = path.join(dir, fileName);
        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }

      // 再递归搜索子目录
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== "node_modules"
        ) {
          const subDir = path.join(dir, entry.name);
          const found = this.searchComponentRecursive(
            subDir,
            fileNames,
            maxDepth,
            currentDepth + 1
          );
          if (found) return found;
        }
      }
    } catch (error) {
      // 忽略错误，继续搜索
    }

    return null;
  }

  /**
   * 将 PascalCase 转换为 kebab-case
   */
  toKebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
      .toLowerCase();
  }

  /**
   * 将 kebab-case 转换为 PascalCase
   */
  toPascalCase(str) {
    return str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  /**
   * 查找 import 语句中的模块定义
   */
  findImportDefinition(document, word) {
    const text = document.getText();
    const lines = text.split("\n");

    // 匹配各种 import 语句格式
    const importPatterns = [
      // import xxx from 'path'
      new RegExp(`import\\s+${word}\\s+from\\s+['"]([^'"]+)['"]`),
      // import { xxx } from 'path'
      new RegExp(
        `import\\s+{[^}]*\\b${word}\\b[^}]*}\\s+from\\s+['"]([^'"]+)['"]`
      ),
      // import * as xxx from 'path'
      new RegExp(`import\\s+\\*\\s+as\\s+${word}\\s+from\\s+['"]([^'"]+)['"]`),
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of importPatterns) {
        const match = line.match(pattern);
        if (match) {
          const importPath = match[1];
          const resolvedPath = this.resolveModulePath(
            document.uri.fsPath,
            importPath
          );
          if (resolvedPath && fs.existsSync(resolvedPath)) {
            return new vscode.Location(
              vscode.Uri.file(resolvedPath),
              new vscode.Position(0, 0)
            );
          }
        }
      }
    }

    return null;
  }

  /**
   * 查找本地定义（方法、变量、computed 等）
   */
  findLocalDefinition(document, word, currentPosition) {
    const text = document.getText();
    const lines = text.split("\n");

    // Vue 2 Options API 模式
    const patternsVue2 = [
      // methods 中的方法定义
      {
        regex: new RegExp(`^\\s*${word}\\s*\\([^)]*\\)\\s*{`, "m"),
        type: "method",
      },
      {
        regex: new RegExp(`^\\s*${word}\\s*:\\s*function\\s*\\(`, "m"),
        type: "method",
      },
      {
        regex: new RegExp(`^\\s*${word}\\s*:\\s*\\([^)]*\\)\\s*=>`, "m"),
        type: "method",
      },

      // data 中的变量定义
      { regex: new RegExp(`^\\s*${word}\\s*:\\s*`, "m"), type: "data" },

      // computed 中的计算属性
      {
        regex: new RegExp(`^\\s*${word}\\s*\\(\\)\\s*{`, "m"),
        type: "computed",
      },
    ];

    // Vue 3 Composition API 模式
    const patternsVue3 = [
      // const/let/var 变量声明
      new RegExp(`^\\s*(?:const|let|var)\\s+${word}\\s*=`, "m"),
      // function 声明
      new RegExp(
        `^\\s*(?:const|let|var)\\s+${word}\\s*=\\s*(?:async\\s+)?\\([^)]*\\)\\s*=>`,
        "m"
      ),
      new RegExp(
        `^\\s*(?:const|let|var)\\s+${word}\\s*=\\s*(?:async\\s+)?function`,
        "m"
      ),
      new RegExp(`^\\s*function\\s+${word}\\s*\\(`, "m"),
    ];

    // 先尝试 Vue 3 模式
    for (const pattern of patternsVue3) {
      for (let i = 0; i < lines.length; i++) {
        if (i === currentPosition.line) continue; // 跳过当前行
        const line = lines[i];
        if (pattern.test(line)) {
          return new vscode.Location(
            document.uri,
            new vscode.Position(i, line.indexOf(word))
          );
        }
      }
    }

    // 再尝试 Vue 2 模式
    for (const { regex, type } of patternsVue2) {
      for (let i = 0; i < lines.length; i++) {
        if (i === currentPosition.line) continue; // 跳过当前行
        const line = lines[i];
        if (regex.test(line)) {
          // 确保在正确的区块内（methods, data, computed 等）
          const beforeText = lines.slice(0, i).join("\n");
          const inCorrectBlock = this.isInVue2Block(beforeText, type);

          if (inCorrectBlock || type === "data") {
            return new vscode.Location(
              document.uri,
              new vscode.Position(i, line.indexOf(word))
            );
          }
        }
      }
    }

    return null;
  }

  /**
   * 检查是否在 Vue2 的特定代码块内
   */
  isInVue2Block(beforeText, blockType) {
    const blockPatterns = {
      method: /methods\s*:\s*{/,
      computed: /computed\s*:\s*{/,
      data: /data\s*\(\s*\)\s*{|data\s*:\s*function\s*\(\s*\)\s*{/,
    };

    const pattern = blockPatterns[blockType];
    if (!pattern) return false;

    const matches = beforeText.match(pattern);
    if (!matches) return false;

    // 简单检查：确保在对应的块内（计算左右花括号数量）
    const afterMatch = beforeText.substring(beforeText.lastIndexOf(matches[0]));
    const openBraces = (afterMatch.match(/{/g) || []).length;
    const closeBraces = (afterMatch.match(/}/g) || []).length;

    return openBraces > closeBraces;
  }

  /**
   * 查找组件定义（从 components 选项中引用的组件）
   */
  findComponentDefinition(document, word) {
    const text = document.getText();

    // 在 components 对象中查找组件引用
    const componentRegex = new RegExp(
      `components\\s*:\\s*{[^}]*\\b${word}\\b[^}]*}`,
      "s"
    );

    const componentMatch = text.match(componentRegex);
    if (!componentMatch) return null;

    // 查找该组件对应的 import 语句
    return this.findImportDefinition(document, word);
  }

  /**
   * 解析模块路径为实际文件路径
   */
  resolveModulePath(currentFilePath, importPath) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return null;

    const currentDir = path.dirname(currentFilePath);
    const workspacePath = workspaceFolder.uri.fsPath;

    let resolvedPath = null;

    // 1. 处理相对路径 (./xxx 或 ../xxx)
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      resolvedPath = path.resolve(currentDir, importPath);
    }
    // 2. 处理 @ 别名（通常指向 src 目录）
    else if (importPath.startsWith("@/")) {
      const relativePath = importPath.substring(2);
      resolvedPath = path.join(workspacePath, "src", relativePath);
    }
    // 3. 处理绝对路径（从项目根目录开始）
    else if (importPath.startsWith("/")) {
      resolvedPath = path.join(workspacePath, importPath.substring(1));
    }
    // 4. 处理 node_modules 中的包（不处理，返回 null）
    else {
      return null;
    }

    // 尝试添加常见的文件扩展名
    const extensions = ["", ".js", ".vue", ".ts", ".tsx", ".jsx"];
    for (const ext of extensions) {
      const testPath = resolvedPath + ext;
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    }

    // 检查是否是目录，尝试 index 文件
    if (
      fs.existsSync(resolvedPath) &&
      fs.statSync(resolvedPath).isDirectory()
    ) {
      const indexFiles = ["index.js", "index.vue", "index.ts", "index.tsx"];
      for (const indexFile of indexFiles) {
        const indexPath = path.join(resolvedPath, indexFile);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
    }

    return null;
  }
}

/**
 * 注册分栏显示定义功能
 */
function registerSplitViewDefinition() {
  const provider = new SplitViewDefinitionProvider();

  // 为多种文件类型注册 definition provider
  const disposables = [
    vscode.languages.registerDefinitionProvider(
      { scheme: "file", language: "vue" },
      provider
    ),
    vscode.languages.registerDefinitionProvider(
      { scheme: "file", language: "javascript" },
      provider
    ),
    vscode.languages.registerDefinitionProvider(
      { scheme: "file", language: "typescript" },
      provider
    ),
    vscode.languages.registerDefinitionProvider(
      { scheme: "file", language: "javascriptreact" },
      provider
    ),
    vscode.languages.registerDefinitionProvider(
      { scheme: "file", language: "typescriptreact" },
      provider
    ),
  ];

  return disposables;
}

module.exports = { registerSplitViewDefinition };
