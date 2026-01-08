// ============================================================
// 括号选择功能 - 快速选择括号内的文本
// 参考：https://github.com/wangchunsen/vscode-bracket-select
// ============================================================
const vscode = require("vscode");

// 选择历史记录
let selectionHistory = [];

// 当编辑器切换时清空历史
vscode.window.onDidChangeActiveTextEditor(() => {
  selectionHistory = [];
});

/**
 * 括号工具类
 */
class BracketUtil {
  static bracketPairs = [
    ["(", ")"],
    ["{", "}"],
    ["[", "]"],
  ];

  static quoteBrackets = ['"', "'", "`"];

  /**
   * 判断两个括号是否匹配
   */
  static isMatch(open, close) {
    if (this.isQuoteBracket(open)) {
      return open === close;
    }
    return this.bracketPairs.some((p) => p[0] === open && p[1] === close);
  }

  /**
   * 判断是否是开括号
   */
  static isOpenBracket(char) {
    return this.bracketPairs.some((pair) => pair[0] === char);
  }

  /**
   * 判断是否是闭括号
   */
  static isCloseBracket(char) {
    return this.bracketPairs.some((pair) => pair[1] === char);
  }

  /**
   * 判断是否是引号
   */
  static isQuoteBracket(char) {
    return this.quoteBrackets.includes(char);
  }
}

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
 * 向后查找匹配的开括号
 */
function findBackward(text, index) {
  const bracketStack = [];

  for (let i = index; i >= 0; i--) {
    let char = text.charAt(i);

    // 如果是引号，直接返回（无法判断是开还是闭）
    if (BracketUtil.isQuoteBracket(char) && bracketStack.length === 0) {
      return new SearchResult(char, i);
    }

    if (BracketUtil.isOpenBracket(char)) {
      if (bracketStack.length === 0) {
        return new SearchResult(char, i);
      } else {
        let top = bracketStack.pop();
        if (!BracketUtil.isMatch(char, top)) {
          return null; // 括号不匹配
        }
      }
    } else if (BracketUtil.isCloseBracket(char)) {
      bracketStack.push(char);
    }
  }

  return null;
}

/**
 * 向前查找匹配的闭括号
 */
function findForward(text, index) {
  const bracketStack = [];

  for (let i = index; i < text.length; i++) {
    let char = text.charAt(i);

    // 如果是引号，直接返回
    if (BracketUtil.isQuoteBracket(char) && bracketStack.length === 0) {
      return new SearchResult(char, i);
    }

    if (BracketUtil.isCloseBracket(char)) {
      if (bracketStack.length === 0) {
        return new SearchResult(char, i);
      } else {
        let top = bracketStack.pop();
        if (!BracketUtil.isMatch(top, char)) {
          return null; // 括号不匹配
        }
      }
    } else if (BracketUtil.isOpenBracket(char)) {
      bracketStack.push(char);
    }
  }

  return null;
}

/**
 * 获取搜索上下文
 */
function getSearchContext(selection) {
  const editor = vscode.window.activeTextEditor;
  let selectionStart = editor.document.offsetAt(selection.start);
  let selectionEnd = editor.document.offsetAt(selection.end);

  return {
    backwardStarter: selectionStart - 1,
    forwardStarter: selectionEnd,
    text: editor.document.getText(),
  };
}

/**
 * 转换为 VS Code Selection
 */
function toVscodeSelection({ start, end }) {
  const editor = vscode.window.activeTextEditor;
  return new vscode.Selection(
    editor.document.positionAt(start + 1), // 转换文本索引到选择索引
    editor.document.positionAt(end)
  );
}

/**
 * 判断两个搜索结果是否匹配
 */
function isMatch(r1, r2) {
  return (
    r1 != null && r2 != null && BracketUtil.isMatch(r1.bracket, r2.bracket)
  );
}

/**
 * 计算选择长度
 */
function selectionLength(editor, selection) {
  return (
    editor.document.offsetAt(selection.end) -
    editor.document.offsetAt(selection.start)
  );
}

/**
 * 扩展选择
 */
function expandSelection(includeBracket) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  let originSelections = editor.selections;
  let selections = [];
  let successCount = 0;
  let failCount = 0;

  originSelections.forEach((originSelection) => {
    const newSelect = selectText(includeBracket, originSelection);
    if (newSelect) {
      selections.push(toVscodeSelection(newSelect));
      successCount++;
    } else {
      selections.push(originSelection);
      failCount++;
    }
  });

  let haveChange =
    selections.findIndex((s, i) => !s.isEqual(originSelections[i])) >= 0;

  if (haveChange) {
    changeSelections(selections);

    // 显示成功提示
    const bracketType = includeBracket ? "含括号" : "不含括号";
    if (successCount > 0) {
      vscode.window.showInformationMessage(
        `✅ 已选择（${bracketType}） - ${successCount} 处`
      );
    }
  } else if (failCount > 0) {
    // 所有光标都没有找到括号
    vscode.window.showWarningMessage(
      "⚠️ 未找到匹配的括号对\n💡 请将光标放在括号内部"
    );
  }
}

/**
 * 选择文本
 */
function selectText(includeBracket, selection) {
  const searchContext = getSearchContext(selection);
  let { text, backwardStarter, forwardStarter } = searchContext;

  if (backwardStarter < 0 || forwardStarter >= text.length) {
    return null;
  }

  let selectionStart, selectionEnd;

  var backwardResult = findBackward(text, backwardStarter);
  var forwardResult = findForward(text, forwardStarter);

  // 处理引号的情况
  while (
    forwardResult != null &&
    !isMatch(backwardResult, forwardResult) &&
    BracketUtil.isQuoteBracket(forwardResult.bracket)
  ) {
    forwardResult = findForward(text, forwardResult.offset + 1);
  }

  while (
    backwardResult != null &&
    !isMatch(backwardResult, forwardResult) &&
    BracketUtil.isQuoteBracket(backwardResult.bracket)
  ) {
    backwardResult = findBackward(text, backwardResult.offset - 1);
  }

  if (!isMatch(backwardResult, forwardResult)) {
    return null;
  }

  // 如果光标紧挨着括号（双击选择的情况）
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
 * 更改选择并记录历史
 */
function changeSelections(selections) {
  let editor = vscode.window.activeTextEditor;
  if (!editor) return;

  if (selectionHistory.length > 0) {
    // 如果是新一轮命令，清空历史
    let lastSelections = selectionHistory[selectionHistory.length - 1];
    if (
      lastSelections.length !== selections.length ||
      lastSelections.findIndex(
        (s, i) =>
          selectionLength(editor, s) > selectionLength(editor, selections[i])
      ) >= 0
    ) {
      selectionHistory = [];
    }
  }

  let originSelections = editor.selections;
  selectionHistory.push(originSelections);
  editor.selections = selections;
}

/**
 * 撤销选择
 */
function undoSelect() {
  let editor = vscode.window.activeTextEditor;
  if (!editor) return;

  let lastSelections = selectionHistory.pop();
  if (lastSelections) {
    editor.selections = lastSelections;
    vscode.window.showInformationMessage(
      `↩️ 已撤销选择 (剩余${selectionHistory.length}步)`
    );
  } else {
    vscode.window.showInformationMessage("🚫 没有可撤销的选择历史");
  }
}

/**
 * 注册括号选择命令
 */
function registerBracketSelectCommands() {
  return [
    // Alt+A - 选择括号内容（不含括号）
    vscode.commands.registerCommand("vscodeplugin.bracketSelect", function () {
      expandSelection(false);
    }),
    // Ctrl+Alt+A - 选择括号内容（含括号）
    vscode.commands.registerCommand(
      "vscodeplugin.bracketSelectInclude",
      function () {
        expandSelection(true);
      }
    ),
    // Alt+Z - 撤销选择
    vscode.commands.registerCommand(
      "vscodeplugin.bracketSelectUndo",
      undoSelect
    ),
  ];
}

module.exports = { registerBracketSelectCommands };
