// ============================================================
// 括号工具类 - 提供括号匹配和识别功能
// ============================================================

/**
 * 括号配对定义
 */
const BRACKET_PAIRS = [
  ["(", ")"],
  ["{", "}"],
  ["[", "]"],
  ["<", ">"],
];

/**
 * 引号类括号
 */
const QUOTE_BRACKETS = ['"', "'", "`"];

/**
 * 判断两个括号是否匹配
 * @param {string} open - 开括号
 * @param {string} close - 闭括号
 * @returns {boolean}
 */
function isMatch(open, close) {
  if (isQuoteBracket(open)) {
    return open === close;
  }
  return BRACKET_PAIRS.some((pair) => pair[0] === open && pair[1] === close);
}

/**
 * 判断是否为开括号
 * @param {string} char - 字符
 * @returns {boolean}
 */
function isOpenBracket(char) {
  return BRACKET_PAIRS.some((pair) => pair[0] === char);
}

/**
 * 判断是否为闭括号
 * @param {string} char - 字符
 * @returns {boolean}
 */
function isCloseBracket(char) {
  return BRACKET_PAIRS.some((pair) => pair[1] === char);
}

/**
 * 判断是否为引号类括号
 * @param {string} char - 字符
 * @returns {boolean}
 */
function isQuoteBracket(char) {
  return QUOTE_BRACKETS.includes(char);
}

module.exports = {
  isMatch,
  isOpenBracket,
  isCloseBracket,
  isQuoteBracket,
};
