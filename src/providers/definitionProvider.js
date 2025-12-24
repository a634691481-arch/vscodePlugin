// ============================================================
// 定义跳转提供器
// ============================================================
const vscode = require("vscode");
const { getFullVariablePath } = require("../utils/pathParser");
const { detectVue3, isMethodReference } = require("../utils/vueDetector");
const { findComponentImport } = require("../finders/componentFinder");
const {
  findVariableDefinition,
  findNestedPropertyDefinition,
} = require("../finders/variableFinder");
const { findMethodDefinition } = require("../finders/methodFinder");

function registerDefinitionProvider() {
  const definitionProvider = {
    provideDefinition(document, position) {
      const text = document.getText();
      const line = document.lineAt(position.line).text;
      const wordRange = document.getWordRangeAtPosition(
        position,
        /[A-Za-z_$][A-Za-z0-9_$]*/
      );
      if (!wordRange) return null;

      const name = document.getText(wordRange);

      // 处理 Vue 组件跳转
      if (line.includes("<" + name) || line.includes("</" + name)) {
        const componentLoc = findComponentImport(text, name, document);
        if (componentLoc) return componentLoc;
      }

      const isVue3 = detectVue3(text);
      const vp = getFullVariablePath(document, position, line);

      if (vp && vp.fullPath && vp.baseName) {
        const nestedLoc = findNestedPropertyDefinition(
          text,
          vp.fullPath,
          vp.baseName,
          isVue3
        );
        if (nestedLoc) {
          return new vscode.Location(
            document.uri,
            document.positionAt(nestedLoc.index)
          );
        }
        const vloc = findVariableDefinition(
          text,
          vp.fullPath,
          vp.baseName,
          isVue3
        );
        if (vloc) {
          return new vscode.Location(
            document.uri,
            document.positionAt(vloc.index)
          );
        }
      }

      if (isMethodReference(line, name)) {
        const mloc = findMethodDefinition(text, name, isVue3);
        if (mloc) {
          return new vscode.Location(
            document.uri,
            document.positionAt(mloc.index)
          );
        }
      }
      return null;
    },
  };

  const selector = [
    { language: "vue", scheme: "file" },
    { language: "javascript", scheme: "file" },
    { language: "typescript", scheme: "file" },
  ];

  return vscode.languages.registerDefinitionProvider(
    selector,
    definitionProvider
  );
}

module.exports = { registerDefinitionProvider };
