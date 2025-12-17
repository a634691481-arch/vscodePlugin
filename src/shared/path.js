const vscode = require("vscode");

function getFullVariablePath(document, position, line) {
  let wordRange = document.getWordRangeAtPosition(position);
  if (!wordRange) {
    const lineText = line;
    let charIndex = position.character - 1;
    while (charIndex >= 0 && /[a-zA-Z0-9_$]/.test(lineText[charIndex])) {
      charIndex--;
    }
    charIndex++;
    let endCharIndex = position.character;
    while (endCharIndex < lineText.length && /[a-zA-Z0-9_$]/.test(lineText[endCharIndex])) {
      endCharIndex++;
    }
    if (endCharIndex > charIndex) {
      wordRange = new vscode.Range(
        new vscode.Position(position.line, charIndex),
        new vscode.Position(position.line, endCharIndex)
      );
    } else {
      return { fullPath: null, baseName: null };
    }
  }
  const word = document.getText(wordRange);
  let startIndex = wordRange.start.character - 1;
  const pathParts = [word];
  while (startIndex >= 0 && line[startIndex] === ".") {
    startIndex--;
    let tempWord = "";
    while (startIndex >= 0 && /[a-zA-Z0-9_$]/.test(line[startIndex])) {
      tempWord = line[startIndex] + tempWord;
      startIndex--;
    }
    if (tempWord && tempWord !== "this") {
      pathParts.unshift(tempWord);
    }
  }
  let endIndex = wordRange.end.character;
  while (endIndex < line.length && line[endIndex] === ".") {
    endIndex++;
    let tempWord = "";
    while (endIndex < line.length && /[a-zA-Z0-9_$]/.test(line[endIndex])) {
      tempWord += line[endIndex];
      endIndex++;
    }
    if (tempWord) {
      pathParts.push(tempWord);
    }
  }
  const fullPath = pathParts.join(".");
  const baseName = pathParts[0];
  return { fullPath, baseName };
}

module.exports = { getFullVariablePath };
