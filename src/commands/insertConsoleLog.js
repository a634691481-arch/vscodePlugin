// ============================================================
// 快速插入 console.log 命令
// ============================================================
const vscode = require("vscode");

/**
 * 查找当前位置所在的函数名
 */
function findFunctionName(document, position) {
  const text = document.getText();
  const offset = document.offsetAt(position);
  
  // 从当前位置向上查找函数定义
  const textBefore = text.substring(0, offset);
  
  // 匹配各种函数定义模式
  const patterns = [
    // 箭头函数: const funcName = (...) =>
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*\{?[^}]*$/,
    // 普通函数: function funcName(...)
    /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{[^}]*$/,
    // 对象方法简写: funcName(...) {
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{[^}]*$/,
    // 对象方法: funcName: function(...)
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*function\s*\([^)]*\)\s*\{[^}]*$/,
    // 对象箭头方法: funcName: (...) =>
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*\{?[^}]*$/,
  ];

  // 逐行向上查找
  for (let line = position.line; line >= 0; line--) {
    const lineText = document.lineAt(line).text;
    
    for (const pattern of patterns) {
      const match = lineText.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // 简化匹配：查找 const/let/var name = 或 function name
    const simpleArrow = lineText.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(?/);
    if (simpleArrow && simpleArrow[1] && lineText.includes('=>')) {
      return simpleArrow[1];
    }
    
    const simpleFunc = lineText.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (simpleFunc && simpleFunc[1]) {
      return simpleFunc[1];
    }
    
    const methodShort = lineText.match(/^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/);
    if (methodShort && methodShort[1]) {
      return methodShort[1];
    }
  }
  
  return '';
}

function registerInsertConsoleLogCommand() {
  return vscode.commands.registerCommand(
    "vscodeplugin.insertConsoleLog",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const document = editor.document;
      const selections = editor.selections;

      // 收集所有选中的变量信息
      const variables = [];
      for (const selection of selections) {
        let variableName = document.getText(selection);
        if (!variableName) {
          const wordRange = document.getWordRangeAtPosition(selection.active);
          if (wordRange) {
            variableName = document.getText(wordRange);
          }
        }
        if (variableName) {
          variables.push({
            name: variableName,
            line: selection.active.line,
            position: selection.active,
          });
        }
      }

      if (variables.length === 0) {
        vscode.window.showWarningMessage("请选中一个变量或将光标放在变量上");
        return;
      }

      // 按行号排序（从大到小，避免插入时行号偏移）
      variables.sort((a, b) => b.line - a.line);

      // 去重（同一行的变量只保留一个插入点，但生成多个 log）
      const lineGroups = new Map();
      for (const v of variables) {
        if (!lineGroups.has(v.line)) {
          lineGroups.set(v.line, []);
        }
        lineGroups.get(v.line).push(v);
      }

      await editor.edit((editBuilder) => {
        for (const [line, vars] of lineGroups) {
          // 获取当前行的缩进
          const currentLine = document.lineAt(line);
          const indent = currentLine.text.match(/^\s*/)[0];
          
          // 获取函数名（使用第一个变量的位置）
          const functionName = findFunctionName(document, vars[0].position);
          const lineNumber = line + 1;

          // 为每个变量生成 console.log（按原始顺序）
          const logStatements = vars.reverse().map((v) => {
            if (functionName) {
              return `${indent}console.log('🚀 ~ :${lineNumber} ~ ${functionName} ~ ${v.name}:', ${v.name})`;
            } else {
              return `${indent}console.log('🚀 ~ :${lineNumber} ~ ${v.name}:', ${v.name})`;
            }
          });

          // 在下一行插入所有 console.log
          const insertPosition = new vscode.Position(line + 1, 0);
          editBuilder.insert(insertPosition, logStatements.join('\n') + '\n');
        }
      });
    }
  );
}

module.exports = { registerInsertConsoleLogCommand };
