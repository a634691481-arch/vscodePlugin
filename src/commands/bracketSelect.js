// ============================================================
// 括号选择命令 - 选中括号内容并自动复制
// ============================================================

const vscode = require("vscode");
const {
  isMatch,
  isOpenBracket,
  isCloseBracket,
  isQuoteBracket,
} = require("../utils/bracketUtil");

/**
 * 搜索结果类
 */
class SearchResult {
  constructor(bracket, offset) {
    this.bracket = bracket;
    this.offset = offset;
  }
}

/**
 * 向后搜索匹配的开括号
 * @param {string} text - 文本内容
 * @param {number} index - 起始索引
 * @returns {SearchResult|null}
 */
function findBackward(text, index) {
  const bracketStack = [];

  for (let i = index; i >= 0; i--) {
    const char = text.charAt(i);

    // 引号括号直接返回
    if (isQuoteBracket(char) && bracketStack.length === 0) {
      return new SearchResult(char, i);
    }

    if (isOpenBracket(char)) {
      if (bracketStack.length === 0) {
        return new SearchResult(char, i);
      } else {
        const top = bracketStack.pop();
        if (!isMatch(char, top)) {
          throw new Error("❌ 括号不匹配");
        }
      }
    } else if (isCloseBracket(char)) {
      bracketStack.push(char);
    }
  }

  return null;
}

/**
 * 向前搜索匹配的闭括号
 * @param {string} text - 文本内容
 * @param {number} index - 起始索引
 * @returns {SearchResult|null}
 */
function findForward(text, index) {
  const bracketStack = [];

  for (let i = index; i < text.length; i++) {
    const char = text.charAt(i);

    if (isQuoteBracket(char) && bracketStack.length === 0) {
      return new SearchResult(char, i);
    }

    if (isCloseBracket(char)) {
      if (bracketStack.length === 0) {
        return new SearchResult(char, i);
      } else {
        const top = bracketStack.pop();
        if (!isMatch(top, char)) {
          throw new Error("❌ 括号不匹配");
        }
      }
    } else if (isOpenBracket(char)) {
      bracketStack.push(char);
    }
  }

  return null;
}

/**
 * 获取搜索上下文
 * @param {vscode.Selection} selection - 当前选区
 * @param {vscode.TextEditor} editor - 编辑器
 * @returns {Object}
 */
function getSearchContext(selection, editor) {
  const selectionStart = editor.document.offsetAt(selection.start);
  const selectionEnd = editor.document.offsetAt(selection.end);

  return {
    backwardStarter: selectionStart - 1,
    forwardStarter: selectionEnd,
    text: editor.document.getText(),
  };
}

/**
 * 判断两个搜索结果是否匹配
 * @param {SearchResult} r1
 * @param {SearchResult} r2
 * @returns {boolean}
 */
function isMatchResult(r1, r2) {
  return r1 !== null && r2 !== null && isMatch(r1.bracket, r2.bracket);
}

/**
 * 选择括号内的文本
 * @param {boolean} includeBracket - 是否包含括号本身
 * @param {vscode.Selection} selection - 当前选区
 * @param {vscode.TextEditor} editor - 编辑器
 * @returns {Object|null} - {start, end} 或 null
 */
function selectText(includeBracket, selection, editor) {
  const searchContext = getSearchContext(selection, editor);
  const { text, backwardStarter, forwardStarter } = searchContext;

  if (backwardStarter < 0 || forwardStarter >= text.length) {
    return null;
  }

  let backwardResult = findBackward(text, backwardStarter);
  let forwardResult = findForward(text, forwardStarter);

  // 处理引号括号
  while (
    forwardResult &&
    !isMatchResult(backwardResult, forwardResult) &&
    isQuoteBracket(forwardResult.bracket)
  ) {
    forwardResult = findForward(text, forwardResult.offset + 1);
  }

  while (
    backwardResult &&
    !isMatchResult(backwardResult, forwardResult) &&
    isQuoteBracket(backwardResult.bracket)
  ) {
    backwardResult = findBackward(text, backwardResult.offset - 1);
  }

  if (!isMatchResult(backwardResult, forwardResult)) {
    vscode.window.showInformationMessage("⚠️ 未找到匹配的括号对");
    return null;
  }

  let selectionStart, selectionEnd;

  // 如果光标紧贴括号，扩展到外层
  if (
    backwardStarter === backwardResult.offset &&
    forwardResult.offset === forwardStarter
  ) {
    selectionStart = backwardStarter - 1;
    selectionEnd = forwardStarter + 1;
  } else {
    if (includeBracket) {
      selectionStart = backwardResult.offset - 1;
      selectionEnd = forwardResult.offset + 1;
    } else {
      selectionStart = backwardResult.offset;
      selectionEnd = forwardResult.offset;
    }
  }

  return {
    start: selectionStart,
    end: selectionEnd,
  };
}

/**
 * 扩展选区并复制
 * @param {boolean} includeBracket - 是否包含括号
 */
async function expandSelectionAndCopy(includeBracket) {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }

  try {
    const originSelections = editor.selections;
    const newSelections = [];
    const textsToMerge = [];

    // 处理所有选区
    for (const selection of originSelections) {
      const result = selectText(includeBracket, selection, editor);

      if (result) {
        // 创建新选区
        const newSelection = new vscode.Selection(
          editor.document.positionAt(result.start + 1),
          editor.document.positionAt(result.end)
        );
        newSelections.push(newSelection);

        // 获取选中的文本
        const selectedText = editor.document.getText(newSelection);
        textsToMerge.push(selectedText);
      } else {
        newSelections.push(selection);
      }
    }

    // 更新选区
    if (newSelections.length > 0) {
      editor.selections = newSelections;

      // 自动复制到剪贴板
      if (textsToMerge.length > 0) {
        const mergedText = textsToMerge.join("\n");
        await vscode.env.clipboard.writeText(mergedText);
        vscode.window.showInformationMessage(
          `✅ 已选中并复制 ${textsToMerge.length} 处内容`
        );
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(`选择失败: ${error.message}`);
  }
}

/**
 * 注册括号选择命令
 * @returns {vscode.Disposable[]}
 */
function registerBracketSelectCommands() {
  return [
    // Alt+A: 选择括号内内容（不含括号）并复制
    vscode.commands.registerCommand("vscodeplugin.bracketSelect", () => {
      expandSelectionAndCopy(false);
    }),

    // Ctrl+Alt+A: 选择括号内内容（含括号）并复制
    vscode.commands.registerCommand("vscodeplugin.bracketSelectInclude", () => {
      expandSelectionAndCopy(true);
    }),
  ];
}

module.exports = {
  registerBracketSelectCommands,
};
