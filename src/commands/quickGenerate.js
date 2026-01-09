// ============================================================
// Alt+Enter 快速生成/跳转功能
// 功能：如果已定义则跳转，如果未定义则自动生成
// ============================================================
const vscode = require("vscode");
const { detectVue3 } = require("../utils/vueDetector");

/**
 * 查找符号定义的位置
 */
function findSymbolDefinition(document, symbolName, currentLine) {
  const text = document.getText();
  const lines = text.split("\n");

  // Vue 3 Composition API 模式
  const vue3Patterns = [
    new RegExp(`^\\s*(?:const|let|var)\\s+${symbolName}\\s*=`, "m"),
    new RegExp(`^\\s*function\\s+${symbolName}\\s*\\(`, "m"),
  ];

  // Vue 2 Options API 模式
  const vue2Patterns = [
    {
      regex: new RegExp(`^\\s*${symbolName}\\s*\\([^)]*\\)\\s*{`, "m"),
      type: "method",
    },
    {
      regex: new RegExp(`^\\s*${symbolName}\\s*:\\s*function\\s*\\(`, "m"),
      type: "method",
    },
    {
      regex: new RegExp(`^\\s*${symbolName}\\s*:\\s*\\([^)]*\\)\\s*=>`, "m"),
      type: "method",
    },
    { regex: new RegExp(`^\\s*${symbolName}\\s*:\\s*`, "m"), type: "data" },
    {
      regex: new RegExp(`^\\s*${symbolName}\\s*\\(\\)\\s*{`, "m"),
      type: "computed",
    },
  ];

  // 先尝试 Vue 3
  for (const pattern of vue3Patterns) {
    for (let i = 0; i < lines.length; i++) {
      if (i === currentLine) continue;
      if (pattern.test(lines[i])) {
        return { line: i, column: lines[i].indexOf(symbolName), found: true };
      }
    }
  }

  // 再尝试 Vue 2
  for (const { regex } of vue2Patterns) {
    for (let i = 0; i < lines.length; i++) {
      if (i === currentLine) continue;
      if (regex.test(lines[i])) {
        return { line: i, column: lines[i].indexOf(symbolName), found: true };
      }
    }
  }

  return { found: false };
}

/**
 * 检查是否是方法调用
 */
function isMethodCall(document, position) {
  const lineText = document.lineAt(position.line).text;
  const wordRange = document.getWordRangeAtPosition(position);
  if (!wordRange) return false;

  const word = document.getText(wordRange);

  // 1. 检查后面是否有小括号：methodName(...)
  const afterWord = lineText.substring(wordRange.end.character).trim();
  if (afterWord.startsWith("(")) {
    return true;
  }

  // 2. 检查是否在 Vue 事件绑定中：@click="methodName" 或 v-on:click="methodName"
  const eventBindingPatterns = [
    new RegExp(`@\\w+(?:\\.\\w+)*=["']\\s*${word}\\s*["']`),
    new RegExp(`v-on:\\w+(?:\\.\\w+)*=["']\\s*${word}\\s*["']`),
    new RegExp(`@\\w+(?:\\.\\w+)*=["']\\s*${word}\\s*\\(`),
    new RegExp(`v-on:\\w+(?:\\.\\w+)*=["']\\s*${word}\\s*\\(`),
  ];

  if (eventBindingPatterns.some((pattern) => pattern.test(lineText))) {
    return true;
  }

  return false;
}

/**
 * 获取 script 标签的范围
 */
function getScriptRange(document) {
  const text = document.getText();
  const scriptStart = text.indexOf("<script");
  const scriptEnd = text.indexOf("</script>");

  if (scriptStart === -1 || scriptEnd === -1) {
    return null;
  }

  const scriptOpenEnd = text.indexOf(">", scriptStart) + 1;

  // 检测是否是 <script setup>
  const scriptTag = text.substring(scriptStart, scriptOpenEnd);
  const isScriptSetup = scriptTag.includes("setup");

  return {
    start: document.positionAt(scriptOpenEnd),
    end: document.positionAt(scriptEnd),
    startOffset: scriptOpenEnd,
    endOffset: scriptEnd,
    isScriptSetup: isScriptSetup,
  };
}

/**
 * 在 Vue 3 Composition API 中生成代码
 */
function generateVue3Code(
  document,
  symbolName,
  isMethod,
  scriptRange,
  fullPath,
  args = []
) {
  const text = document.getText();
  const scriptText = text.substring(
    scriptRange.startOffset,
    scriptRange.endOffset
  );

  const isScriptSetup = scriptRange.isScriptSetup;

  // 处理深层嵌套对象路径 (例如 fullPath = ["dddd", "ididi"])
  if (fullPath && fullPath.length > 0) {
    const rootName = fullPath[0];
    const nestedParts = fullPath.slice(1);

    // 1. 查找根对象定义
    const rootRegex = new RegExp(
      `(?:const|let|var)\\s+${rootName}\\s*=\\s*(?:ref|reactive)\\s*\\(\\s*{`
    );
    const rootMatch = scriptText.match(rootRegex);

    if (rootMatch) {
      let currentOffset = rootMatch.index + rootMatch[0].length;
      let currentIndentation = "    ";

      // 2. 逐层探测嵌套对象
      for (const part of nestedParts) {
        const remainingText = scriptText.substring(currentOffset);
        const partRegex = new RegExp(`\\b${part}\\s*:\\s*{`);
        const partMatch = remainingText.match(partRegex);
        if (partMatch) {
          currentOffset += partMatch.index + partMatch[0].length;
          currentIndentation += "  ";
        } else {
          // 如果某一层没找到，就在当前层级停止钻取
          break;
        }
      }

      // 3. 寻找当前层级的结束花括号 }
      const afterTarget = scriptText.substring(currentOffset);
      let braceCount = 1;
      let closingBraceIndex = -1;
      for (let i = 0; i < afterTarget.length; i++) {
        if (afterTarget[i] === "{") braceCount++;
        else if (afterTarget[i] === "}") braceCount--;
        if (braceCount === 0) {
          closingBraceIndex = i;
          break;
        }
      }

      if (closingBraceIndex !== -1) {
        const absoluteOffset =
          scriptRange.startOffset + currentOffset + closingBraceIndex;
        const insertPosition = document.positionAt(absoluteOffset);

        // 检查当前对象内是否已有属性（需要在前一个属性后添加逗号）
        const contentBeforeClosingBrace = afterTarget
          .substring(0, closingBraceIndex)
          .trim();
        const needsComma = contentBeforeClosingBrace.length > 0;

        return {
          code: needsComma
            ? `,\n${currentIndentation}${symbolName}: ''`
            : `${currentIndentation}${symbolName}: ''`,
          position: insertPosition,
          definitionPosition: new vscode.Position(
            insertPosition.line + (needsComma ? 1 : 0),
            currentIndentation.length + symbolName.length
          ),
        };
      }
    } else {
      // 根对象不存在，创建完整的嵌套结构
      const buildNestedObject = (parts, finalProp) => {
        if (parts.length === 0) return `{ ${finalProp}: '' }`;
        const [first, ...rest] = parts;
        return `{ ${first}: ${buildNestedObject(rest, finalProp)} }`;
      };

      const nestedStructure = buildNestedObject(nestedParts, symbolName);
      const newCode = `\n  const ${rootName} = ref(${nestedStructure})\n`;

      // 查找插入位置（在 import 后面或 script 开头）
      let insertPosition;
      if (isScriptSetup) {
        const importMatches = [
          ...scriptText.matchAll(/import\s+.*from\s+['"].*['"]/g),
        ];
        if (importMatches.length > 0) {
          const lastImport = importMatches[importMatches.length - 1];
          const lastImportEnd =
            scriptRange.startOffset + lastImport.index + lastImport[0].length;
          const pos = document.positionAt(lastImportEnd);
          insertPosition = new vscode.Position(pos.line + 1, 0);
        } else {
          insertPosition = scriptRange.start;
        }
      } else {
        const setupMatch = scriptText.match(/setup\s*\(\s*\)\s*{/);
        if (setupMatch) {
          const pos = document.positionAt(
            scriptRange.startOffset + setupMatch.index
          );
          insertPosition = new vscode.Position(pos.line + 1, 0);
        } else {
          insertPosition = scriptRange.start;
        }
      }

      return {
        code: newCode,
        position: insertPosition,
        definitionPosition: new vscode.Position(
          insertPosition.line + 1 + nestedParts.length,
          4 + (nestedParts.length + 1) * 2 + symbolName.length
        ),
      };
    }
  }

  // 如果不是嵌套对象或未找到父对象，执行普通生成逻辑
  let setupMatch = null;
  if (!isScriptSetup) {
    setupMatch = scriptText.match(/setup\s*\(\s*\)\s*{/);
    if (!setupMatch) {
      vscode.window.showErrorMessage(
        "❌ 未找到 setup 函数或 <script setup> 标签"
      );
      return null;
    }
  }

  if (isMethod) {
    // 生成方法，包含参数
    const paramsStr = args.length > 0 ? args.join(", ") : "";
    const methodCode = `
  const ${symbolName} = (${paramsStr}) => {
    
  };
`;

    // 查找最后一个 const/let/var 声明的位置
    const constMatches = [
      ...scriptText.matchAll(/(?:const|let|var)\s+\w+\s*=/g),
    ];
    let insertPosition;

    if (constMatches.length > 0) {
      const lastMatch = constMatches[constMatches.length - 1];
      const lastMatchOffset = scriptRange.startOffset + lastMatch.index;
      const lastMatchLine = document.positionAt(lastMatchOffset).line;

      // 找到该声明的结束位置（分号或闭括号）
      const afterMatch = scriptText.substring(lastMatch.index);
      const endMatch = afterMatch.search(
        /[;\n](?=\s*(?:const|let|var|function|return|}\s*$))/
      );

      if (endMatch !== -1) {
        const endOffset =
          scriptRange.startOffset + lastMatch.index + endMatch + 1;
        insertPosition = new vscode.Position(
          document.positionAt(endOffset).line + 1,
          0
        );
      } else {
        insertPosition = new vscode.Position(lastMatchLine + 1, 0);
      }
    } else {
      // 没有找到变量声明
      if (isScriptSetup) {
        // <script setup> 查找最后一行 import 或直接在开头插入
        const importMatches = [
          ...scriptText.matchAll(/import\s+.*from\s+['"].*['"]/g),
        ];
        if (importMatches.length > 0) {
          const lastImport = importMatches[importMatches.length - 1];
          const lastImportEnd =
            scriptRange.startOffset + lastImport.index + lastImport[0].length;
          const pos = document.positionAt(lastImportEnd);
          insertPosition = new vscode.Position(pos.line + 1, 0);
        } else {
          insertPosition = scriptRange.start;
        }
      } else {
        // setup() 函数开始后插入
        const pos = document.positionAt(
          scriptRange.startOffset + setupMatch.index
        );
        insertPosition = new vscode.Position(pos.line + 1, 0);
      }
    }

    return {
      code: methodCode,
      position: insertPosition,
      definitionPosition: new vscode.Position(
        insertPosition.line + 1,
        8 + symbolName.length
      ), // 光标在方法名后
    };
  } else {
    // 生成变量
    const varCode = `\n  const ${symbolName} = ref('');\n`;

    let insertPosition;
    if (isScriptSetup) {
      // <script setup> 优先插在 import 后面
      const importMatches = [
        ...scriptText.matchAll(/import\s+.*from\s+['"].*['"]/g),
      ];
      if (importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportEnd =
          scriptRange.startOffset + lastImport.index + lastImport[0].length;
        const pos = document.positionAt(lastImportEnd);
        insertPosition = new vscode.Position(pos.line + 1, 0);
      } else {
        insertPosition = scriptRange.start;
      }
    } else {
      // setup() 函数开始后插入
      const pos = document.positionAt(
        scriptRange.startOffset + setupMatch.index
      );
      insertPosition = new vscode.Position(pos.line + 1, 0);
    }

    return {
      code: varCode,
      position: insertPosition,
      definitionPosition: new vscode.Position(
        insertPosition.line + 1,
        8 + symbolName.length
      ),
    };
  }
}

/**
 * 在 Vue 2 Options API 中生成代码
 */
function generateVue2Code(
  document,
  symbolName,
  isMethod,
  scriptRange,
  args = []
) {
  const text = document.getText();
  const scriptText = text.substring(
    scriptRange.startOffset,
    scriptRange.endOffset
  );

  if (isMethod) {
    // 在 methods 中生成方法
    const methodsMatch = scriptText.match(/methods\s*:\s*{/);

    if (!methodsMatch) {
      vscode.window.showErrorMessage("❌ 未找到 methods 块");
      return null;
    }

    const paramsStr = args.length > 0 ? args.join(", ") : "";
    const methodCode = `
    ${symbolName}(${paramsStr}) {
      
    },
`;

    // 查找 methods 块中最后一个方法
    const methodsStartOffset =
      scriptRange.startOffset + methodsMatch.index + methodsMatch[0].length;
    const afterMethods = scriptText.substring(
      methodsMatch.index + methodsMatch[0].length
    );

    // 查找最后一个方法定义
    const methodMatches = [...afterMethods.matchAll(/\w+\s*\([^)]*\)\s*{/g)];
    let insertLine;

    if (methodMatches.length > 0) {
      const lastMethod = methodMatches[methodMatches.length - 1];
      const lastMethodOffset = methodsStartOffset + lastMethod.index;

      // 找到该方法的结束花括号
      let braceCount = 1;
      let endPos = lastMethod.index + lastMethod[0].length;

      for (let i = endPos; i < afterMethods.length; i++) {
        if (afterMethods[i] === "{") braceCount++;
        if (afterMethods[i] === "}") braceCount--;
        if (braceCount === 0) {
          endPos = i + 1;
          break;
        }
      }

      // 跳过逗号
      while (
        endPos < afterMethods.length &&
        /[,\s]/.test(afterMethods[endPos])
      ) {
        endPos++;
      }

      insertLine = document.positionAt(methodsStartOffset + endPos).line;
    } else {
      // methods 块为空，在开始位置插入
      insertLine = document.positionAt(methodsStartOffset).line;
    }

    return {
      code: methodCode,
      position: new vscode.Position(insertLine, 0),
      definitionPosition: new vscode.Position(
        insertLine + 1,
        4 + symbolName.length
      ),
    };
  } else {
    // 在 data 中生成变量
    const dataMatch = scriptText.match(/data\s*\(\s*\)\s*{[\s\S]*?return\s*{/);

    if (!dataMatch) {
      vscode.window.showErrorMessage("❌ 未找到 data() { return { } 块");
      return null;
    }

    const varCode = `\n      ${symbolName}: '',\n`;

    const returnStartOffset =
      scriptRange.startOffset + dataMatch.index + dataMatch[0].length;
    const insertLine = document.positionAt(returnStartOffset).line;

    return {
      code: varCode,
      position: new vscode.Position(insertLine, 0),
      definitionPosition: new vscode.Position(
        insertLine + 1,
        6 + symbolName.length
      ),
    };
  }
}

/**
 * 分栏显示指定位置
 */
async function showInSplitView(document, position) {
  const location = new vscode.Location(document.uri, position);

  await vscode.commands.executeCommand("vscode.open", document.uri, {
    viewColumn: vscode.ViewColumn.Beside,
    preserveFocus: false,
    selection: new vscode.Range(position, position),
  });

  // 将光标移动到指定位置
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    );
  }
}

/**
 * 从行文本中提取方法调用的参数名
 */
function extractArgs(lineText, symbolName) {
  const regex = new RegExp(`${symbolName}\\s*\\(([^)]*)\\)`);
  const match = lineText.match(regex);
  if (!match) return [];

  const argsStr = match[1].trim();
  if (!argsStr) return [];

  return argsStr.split(",").map((arg, index) => {
    const token = arg.trim();
    // 如果是数字、字符串常量，生成 arg1, arg2...
    if (/^[\d'"`]/.test(token)) {
      return `arg${index + 1}`;
    }
    // 如果是变量名，尝试保留变量名（过滤掉非非法字符）
    const varMatch = token.match(/[A-Za-z_$][A-Za-z0-9_$]*/);
    return varMatch ? varMatch[0] : `arg${index + 1}`;
  });
}

/**
 * 主命令：快速生成或跳转
 */
async function quickGenerateOrJump() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;

  // 只在 Vue 文件中工作
  if (document.languageId !== "vue") {
    vscode.window.showWarningMessage("⚠️ 此功能仅在 Vue 文件中可用");
    return;
  }

  const position = editor.selection.active;
  const lineText = document.lineAt(position.line).text;

  // 尝试获取完整的表达式，如 state.iiiii
  let wordRange = document.getWordRangeAtPosition(position);
  if (!wordRange) {
    vscode.window.showWarningMessage("⚠️ 请将光标放在方法或变量名上");
    return;
  }

  const symbolName = document.getText(wordRange);

  // 检查是否有父对象路径（支持多层，如 dddd.ididi.pppp）
  let fullPath = [];
  const beforeRange = new vscode.Range(
    new vscode.Position(position.line, 0),
    wordRange.start
  );
  const beforeText = document.getText(beforeRange);
  
  // 关键修复：检查紧邻符号前的字符是否是 '.'
  // 只有当紧邻的字符是 '.' 时，才认为是嵌套属性
  if (beforeText.length > 0 && beforeText[beforeText.length - 1] === '.') {
    // 提取路径：从 beforeText 中提取最后一个完整的路径表达式
    const parts = beforeText.split(/[\s\(\[\{\}\]\)\+\-\*\/=><!?,;]/);
    const lastPart = parts[parts.length - 1]; // 例如 "dddd.ididi."
    if (lastPart.endsWith('.')) {
      fullPath = lastPart.slice(0, -1).split('.'); // ["dddd", "ididi"]
    }
  }

  // 提取参数
  const args = extractArgs(lineText, symbolName);

  // 1. 先尝试查找定义
  const definition = findSymbolDefinition(document, symbolName, position.line);

  if (definition.found) {
    // 已定义，跳转到定义位置
    const defPosition = new vscode.Position(definition.line, definition.column);
    await showInSplitView(document, defPosition);
    vscode.window.showInformationMessage(`✅ 已跳转到 ${symbolName} 的定义`);
    return;
  }

  // 2. 未定义，自动生成
  const scriptRange = getScriptRange(document);
  if (!scriptRange) {
    vscode.window.showErrorMessage("❌ 未找到 <script> 标签");
    return;
  }

  const text = document.getText();
  const isVue3 = detectVue3(text);
  const isMethod = isMethodCall(document, position);

  let generationResult;

  if (isVue3) {
    generationResult = generateVue3Code(
      document,
      symbolName,
      isMethod,
      scriptRange,
      fullPath,
      args
    );
  } else {
    generationResult = generateVue2Code(
      document,
      symbolName,
      isMethod,
      scriptRange,
      args
    );
  }

  if (!generationResult) return;

  // 插入生成的代码
  const edit = new vscode.WorkspaceEdit();
  edit.insert(document.uri, generationResult.position, generationResult.code);

  await vscode.workspace.applyEdit(edit);

  // 保存文档
  await document.save();

  // 跳转到新生成的定义
  await showInSplitView(document, generationResult.definitionPosition);

  const type = isMethod ? "方法" : "变量";
  const apiType = isVue3 ? "Vue 3" : "Vue 2";
  vscode.window.showInformationMessage(
    `✅ 已生成 ${symbolName} ${type} (${apiType})`
  );
}

/**
 * 注册快速生成命令
 */
function registerQuickGenerateCommand() {
  return vscode.commands.registerCommand(
    "vscodeplugin.quickGenerate",
    quickGenerateOrJump
  );
}

module.exports = { registerQuickGenerateCommand };
