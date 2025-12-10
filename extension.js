// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscodeplugin" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "vscodeplugin.helloWorld",
    function () {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from vscodePlugin!");
    }
  );

  // 注册 Alt+Enter 命令，自动生成 Vue 变量和方法
  const generateVueCode = vscode.commands.registerCommand(
    "vscodeplugin.generateVueCode",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const document = editor.document;
      const selection = editor.selection;
      const position = selection.active;

      const text = document.getText();
      const line = document.lineAt(position.line).text;

      // 获取完整的变量路径(支持多层结构如 user.name 或 this.user.profile)
      const { fullPath, baseName } = getFullVariablePath(
        document,
        position,
        line
      );

      if (!fullPath) {
        vscode.window.showWarningMessage("请将光标放在变量或方法名上");
        return;
      }

      // 判断是 Vue2 还是 Vue3
      const isVue3 =
        text.includes("setup()") ||
        text.includes("<script setup>") ||
        /import\s+{[^}]*ref[^}]*}\s+from\s+['"]vue['"]/.test(text);

      // 判断是方法调用还是变量引用
      // 支持: @click="methodName", @click="methodName()", v-on:click="methodName"
      const isMethodCall = isMethodReference(line, baseName);

      if (isMethodCall) {
        // 检查方法是否已存在
        const methodLocation = findMethodDefinition(text, baseName, isVue3);
        if (methodLocation) {
          const args = extractMethodArgsFromLine(line, baseName);
          if (args.length) {
            await updateMethodSignatureIfNeeded(
              document,
              text,
              methodLocation.index,
              baseName,
              args,
              isVue3
            );
          }
          const targetPosition = document.positionAt(methodLocation.index);
          editor.selection = new vscode.Selection(
            targetPosition,
            targetPosition
          );
          editor.revealRange(new vscode.Range(targetPosition, targetPosition));
          vscode.window.showInformationMessage(
            `方法 ${baseName} 已存在,已跳转`
          );
        } else {
          // 方法不存在,创建
          const args = extractMethodArgsFromLine(line, baseName);
          await generateMethod(editor, document, text, baseName, isVue3, args);
        }
      } else {
        // 检查变量是否已存在
        const varLocation = findVariableDefinition(
          text,
          fullPath,
          baseName,
          isVue3
        );
        if (varLocation) {
          // 变量已存在,跳转过去
          const targetPosition = document.positionAt(varLocation.index);
          editor.selection = new vscode.Selection(
            targetPosition,
            targetPosition
          );
          editor.revealRange(new vscode.Range(targetPosition, targetPosition));
          vscode.window.showInformationMessage(
            `变量 ${fullPath} 已存在,已跳转`
          );
        } else {
          // 变量不存在,创建
          await generateVariable(
            editor,
            document,
            text,
            fullPath,
            baseName,
            isVue3
          );
        }
      }
    }
  );

  context.subscriptions.push(disposable, generateVueCode);
}

/**
 * 判断是否为方法引用
 * 支持: @click="methodName", @click="methodName()", v-on:click="methodName"
 */
function isMethodReference(line, methodName) {
  if (line.includes(methodName + "(")) {
    return true;
  }
  const eventBindingPatterns = [
    new RegExp(`@\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*["']`),
    new RegExp(`v-on:\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*["']`),
    new RegExp(`@\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*\\(`),
    new RegExp(`v-on:\\w+(?:\\.\\w+)*=["']\\s*${methodName}\\s*\\(`),
  ];
  for (const pattern of eventBindingPatterns) {
    if (pattern.test(line)) {
      return true;
    }
  }
  return false;
}

function extractMethodArgsFromLine(line, methodName) {
  const regex = new RegExp(`${methodName}\\s*\\(([^)]*)\\)`);
  const m = line.match(regex);
  if (!m) return [];
  const argsStr = m[1].trim();
  if (!argsStr) return [];
  const rawArgs = argsStr.split(",");
  const names = [];
  const used = new Set();
  rawArgs.forEach((raw, idx) => {
    const token = raw.trim();
    if (!token) return;
    const idMatches = token.match(/[A-Za-z_$][A-Za-z0-9_$]*/g);
    let name = idMatches ? idMatches[idMatches.length - 1] : `arg${idx + 1}`;
    while (used.has(name)) {
      name = `${name}_${idx + 1}`;
    }
    used.add(name);
    names.push(name);
  });
  return names;
}

/**
 * 获取完整的变量路径(支持多层结构)
 * 例: this.user.name -> user.name, user.name
 */

/**
 * 获取完整的变量路径(支持多层结构)
 * 例: this.user.name -> user.name, user.name
 */
function getFullVariablePath(document, position, line) {
  let wordRange = document.getWordRangeAtPosition(position);

  // 如果当前位置没有单词,尝试向左查找
  if (!wordRange) {
    const lineText = line;
    let charIndex = position.character - 1;

    // 向左查找直到找到非字母数字字符
    while (charIndex >= 0 && /[a-zA-Z0-9_$]/.test(lineText[charIndex])) {
      charIndex--;
    }
    charIndex++;

    // 向右查找单词结束位置
    let endCharIndex = position.character;
    while (
      endCharIndex < lineText.length &&
      /[a-zA-Z0-9_$]/.test(lineText[endCharIndex])
    ) {
      endCharIndex++;
    }

    // 如果找到了有效的单词范围
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
  const linePrefix = line.substring(0, wordRange.start.character);
  const lineSuffix = line.substring(wordRange.end.character);

  // 向前查找属性访问符
  let fullPath = word;
  let startIndex = wordRange.start.character - 1;

  // 向前收集路径 (this.user.name)
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

  // 向后收集路径 (name.first.value)
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

  fullPath = pathParts.join(".");
  const baseName = pathParts[0]; // 基础变量名

  return { fullPath, baseName };
}

/**
 * 查找变量定义
 */
function findVariableDefinition(text, fullPath, baseName, isVue3) {
  const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;

  const scriptContent = scriptMatch[1];
  const scriptStartIndex =
    scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

  if (isVue3) {
    // Vue3: 查找 const baseName =
    const patterns = [
      new RegExp(`const\\s+${baseName}\\s*=`, "g"),
      new RegExp(`let\\s+${baseName}\\s*=`, "g"),
      new RegExp(`var\\s+${baseName}\\s*=`, "g"),
    ];

    for (const pattern of patterns) {
      const match = scriptContent.match(pattern);
      if (match) {
        return { index: scriptStartIndex + scriptContent.indexOf(match[0]) };
      }
    }
  } else {
    // Vue2: 在 data() 中查找
    const dataMatch = scriptContent.match(
      /data\s*\(\)\s*{\s*return\s*{([\s\S]*?)}/m
    );
    if (dataMatch) {
      const dataContent = dataMatch[1];
      // 支持多层结构: user: { name: '', age: 0 }
      const baseNamePattern = new RegExp(`${baseName}\\s*:`, "g");
      if (baseNamePattern.test(dataContent)) {
        const match = dataContent.match(baseNamePattern);
        return {
          index:
            scriptStartIndex +
            scriptContent.indexOf(dataMatch[0]) +
            dataMatch[0].indexOf(match[0]),
        };
      }
    }
  }

  return null;
}

/**
 * 查找方法定义
 */
function findMethodDefinition(text, methodName, isVue3) {
  const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;

  const scriptContent = scriptMatch[1];
  const scriptStartIndex =
    scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

  if (isVue3) {
    // Vue3: 查找 const methodName = 或 function methodName
    const patterns = [
      new RegExp(`const\\s+${methodName}\\s*=`, "g"),
      new RegExp(`function\\s+${methodName}\\s*\\(`, "g"),
    ];

    for (const pattern of patterns) {
      const match = scriptContent.match(pattern);
      if (match) {
        return { index: scriptStartIndex + scriptContent.indexOf(match[0]) };
      }
    }
  } else {
    const methodsMatch = scriptContent.match(/methods\s*:\s*{([\s\S]*?)}\s*/m);
    if (methodsMatch) {
      const methodsContent = methodsMatch[1];
      const methodPattern = new RegExp(`${methodName}\\s*\\(`, "g");
      if (methodPattern.test(methodsContent)) {
        const match = methodsContent.match(methodPattern);
        return {
          index:
            scriptStartIndex +
            scriptContent.indexOf(methodsMatch[0]) +
            methodsMatch[0].indexOf(match[0]),
        };
      }
    }
  }

  return null;
}

async function ensureSetupReturnHasName(
  document,
  scriptContent,
  scriptStartIndex,
  name
) {
  const setupMatch = scriptContent.match(
    /setup\s*\([^)]*\)\s*{([\s\S]*?)return\s*{([\s\S]*?)}/m
  );
  if (!setupMatch) {
    return;
  }
  const returnBlock = setupMatch[2];
  const exists = new RegExp(`\\b${name}\\b`).test(returnBlock);
  if (exists) {
    return;
  }
  const wholeMatch = setupMatch[0];
  const returnStartInWhole = wholeMatch.indexOf("return {") + "return {".length;
  const returnStartIndex =
    scriptStartIndex + scriptContent.indexOf(wholeMatch) + returnStartInWhole;
  const insertPos = document.positionAt(returnStartIndex);
  const edit = new vscode.WorkspaceEdit();
  edit.insert(
    document.uri,
    new vscode.Position(insertPos.line + 1, 0),
    `\t\t${name},\n`
  );
  await vscode.workspace.applyEdit(edit);
}

/**
 * 生成 Vue 变量 (支持多层结构)
 */
async function generateVariable(
  editor,
  document,
  text,
  fullPath,
  baseName,
  isVue3
) {
  const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    vscode.window.showWarningMessage("未找到 <script> 标签");
    return;
  }

  const scriptContent = scriptMatch[1];
  const scriptStartIndex =
    scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

  if (isVue3) {
    // Vue3 处理
    if (text.includes("<script setup>")) {
      // Composition API with <script setup>
      const refImportMatch = text.match(
        /import\s+{([^}]*)}\s+from\s+['"]vue['"]/
      );
      let insertPosition;

      if (refImportMatch) {
        // 已经有 import，在 import 之后插入
        const importEndIndex = refImportMatch.index + refImportMatch[0].length;
        const importEndPosition = document.positionAt(importEndIndex);
        insertPosition = new vscode.Position(importEndPosition.line + 2, 0);

        // 检查是否已经导入 ref
        const imports = refImportMatch[1];
        if (!imports.includes("ref")) {
          const newImports = imports.trim() ? `${imports.trim()}, ref` : "ref";
          const edit = new vscode.WorkspaceEdit();
          edit.replace(
            document.uri,
            new vscode.Range(
              document.positionAt(refImportMatch.index),
              document.positionAt(
                refImportMatch.index + refImportMatch[0].length
              )
            ),
            `import { ${newImports} } from 'vue'`
          );
          await vscode.workspace.applyEdit(edit);
        }
      } else {
        // 没有 import，在 <script setup> 之后插入 import
        const setupTagMatch = text.match(/<script setup>/);
        const setupEndIndex = setupTagMatch.index + setupTagMatch[0].length;
        const setupEndPosition = document.positionAt(setupEndIndex);

        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(setupEndPosition.line + 1, 0),
          "import { ref } from 'vue'\n\n"
        );
        await vscode.workspace.applyEdit(edit);

        insertPosition = new vscode.Position(setupEndPosition.line + 3, 0);
      }

      // 插入变量声明 (支持多层结构)
      const varCode = generateVariableCode(fullPath, baseName, isVue3);
      const edit = new vscode.WorkspaceEdit();
      edit.insert(document.uri, insertPosition, varCode.vue3Setup);
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`已生成 Vue3 变量: ${fullPath}`);
    } else {
      // Composition API with setup()
      const setupMatch = scriptContent.match(/setup\s*\([^)]*\)\s*{/);
      if (setupMatch) {
        const setupStartIndex =
          scriptStartIndex + setupMatch.index + setupMatch[0].length;
        const setupPosition = document.positionAt(setupStartIndex);

        const varCode = generateVariableCode(fullPath, baseName, isVue3);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(setupPosition.line + 1, 0),
          varCode.vue3Setup
        );
        await vscode.workspace.applyEdit(edit);
        await ensureSetupReturnHasName(
          document,
          scriptContent,
          scriptStartIndex,
          baseName
        );
        vscode.window.showInformationMessage(`已生成 Vue3 变量: ${fullPath}`);
      }
    }
  } else {
    // Vue2 Options API
    const dataMatch = scriptContent.match(/data\s*\(\)\s*{\s*return\s*{/);
    if (dataMatch) {
      const dataStartIndex =
        scriptStartIndex + dataMatch.index + dataMatch[0].length;
      const dataPosition = document.positionAt(dataStartIndex);

      const varCode = generateVariableCode(fullPath, baseName, isVue3);
      const edit = new vscode.WorkspaceEdit();
      edit.insert(
        document.uri,
        new vscode.Position(dataPosition.line + 1, 0),
        varCode.vue2
      );
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`已生成 Vue2 变量: ${fullPath}`);
    } else {
      // 没有 data 函数，创建一个
      const exportMatch = scriptContent.match(/export\s+default\s*{/);
      if (exportMatch) {
        const exportStartIndex =
          scriptStartIndex + exportMatch.index + exportMatch[0].length;
        const exportPosition = document.positionAt(exportStartIndex);

        const varCode = generateVariableCode(fullPath, baseName, isVue3);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(exportPosition.line + 1, 0),
          `\tdata() {
\t\treturn {
${varCode.vue2}\t\t}
\t},
`
        );
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`已生成 Vue2 变量: ${fullPath}`);
      }
    }
  }
}

/**
 * 生成变量代码(支持多层结构)
 * 例: user.name.first -> user: { name: { first: '' } }
 */
function generateVariableCode(fullPath, baseName, isVue3) {
  const parts = fullPath.split(".");

  if (parts.length === 1) {
    // 单层变量
    if (isVue3) {
      return {
        vue3Setup: `const ${baseName} = ref('')\n`,
        vue2: `\t\t\t${baseName}: '',\n`,
      };
    } else {
      return {
        vue3Setup: `const ${baseName} = ref('')\n`,
        vue2: `\t\t\t${baseName}: '',\n`,
      };
    }
  } else {
    // 多层结构: user.name.first
    if (isVue3) {
      // Vue3: 使用 reactive 或嵌套 ref
      let nestedObj = "{}";
      for (let i = parts.length - 1; i >= 1; i--) {
        if (i === parts.length - 1) {
          nestedObj = `{ ${parts[i]}: '' }`;
        } else {
          nestedObj = `{ ${parts[i]}: ${nestedObj} }`;
        }
      }
      return {
        vue3Setup: `const ${baseName} = ref(${nestedObj})\n`,
        vue2: `\t\t\t${baseName}: ${nestedObj},\n`,
      };
    } else {
      // Vue2: 生成嵌套对象
      let nestedObj = "{}";
      for (let i = parts.length - 1; i >= 1; i--) {
        if (i === parts.length - 1) {
          nestedObj = `{ ${parts[i]}: '' }`;
        } else {
          nestedObj = `{ ${parts[i]}: ${nestedObj} }`;
        }
      }
      return {
        vue3Setup: `const ${baseName} = ref(${nestedObj})\n`,
        vue2: `\t\t\t${baseName}: ${nestedObj},\n`,
      };
    }
  }
}

/**
 * 生成 Vue 方法
 */
async function generateMethod(
  editor,
  document,
  text,
  methodName,
  isVue3,
  args = []
) {
  const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    vscode.window.showWarningMessage("未找到 <script> 标签");
    return;
  }

  const scriptContent = scriptMatch[1];
  const scriptStartIndex =
    scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

  if (isVue3) {
    // Vue3 处理
    if (text.includes("<script setup>")) {
      // Composition API with <script setup>
      const scriptEndMatch = text.match(/<\/script>/);
      const scriptEndIndex = scriptEndMatch.index;
      const scriptEndPosition = document.positionAt(scriptEndIndex);

      const params = args.join(", ");
      const edit = new vscode.WorkspaceEdit();
      edit.insert(
        document.uri,
        new vscode.Position(scriptEndPosition.line, 0),
        `const ${methodName} = (${params}) => {
\t// TODO: 实现方法逻辑
}

`
      );
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`已生成 Vue3 方法: ${methodName}`);
    } else {
      // Composition API with setup()
      const setupMatch = scriptContent.match(
        /setup\s*\([^)]*\)\s*{[\s\S]*?return\s*{/
      );
      if (setupMatch) {
        // 在 return 之前插入方法
        const returnIndex =
          scriptStartIndex +
          setupMatch.index +
          setupMatch[0].length -
          "return {".length;
        const returnPosition = document.positionAt(returnIndex);

        const params = args.join(", ");
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(returnPosition.line, 0),
          `\t\tconst ${methodName} = (${params}) => {
\t\t\t// TODO: 实现方法逻辑
\t\t}

`
        );
        await vscode.workspace.applyEdit(edit);
        await ensureSetupReturnHasName(
          document,
          scriptContent,
          scriptStartIndex,
          methodName
        );
        vscode.window.showInformationMessage(`已生成 Vue3 方法: ${methodName}`);
      }
    }
  } else {
    // Vue2 Options API
    const methodsMatch = scriptContent.match(/methods\s*:\s*{/);
    if (methodsMatch) {
      const methodsStartIndex =
        scriptStartIndex + methodsMatch.index + methodsMatch[0].length;
      const methodsPosition = document.positionAt(methodsStartIndex);

      const params = args.join(", ");
      const edit = new vscode.WorkspaceEdit();
      edit.insert(
        document.uri,
        new vscode.Position(methodsPosition.line + 1, 0),
        `\t\t${methodName}(${params}) {\n\t\t\t// TODO: 实现方法逻辑\n\t\t},\n`
      );
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`已生成 Vue2 方法: ${methodName}`);
    } else {
      // 没有 methods 对象，创建一个
      const exportMatch = scriptContent.match(/export\s+default\s*{/);
      if (exportMatch) {
        const exportStartIndex =
          scriptStartIndex + exportMatch.index + exportMatch[0].length;
        const exportPosition = document.positionAt(exportStartIndex);

        const params = args.join(", ");
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(exportPosition.line + 1, 0),
          `\tmethods: {
\t\t${methodName}(${params}) {
\t\t\t// TODO: 实现方法逻辑
\t\t}
\t},
`
        );
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`已生成 Vue2 方法: ${methodName}`);
      }
    }
  }
}

async function updateMethodSignatureIfNeeded(
  document,
  text,
  startIndex,
  methodName,
  args,
  isVue3
) {
  const params = args.join(", ");
  if (!params) return;
  const slice = text.slice(startIndex, startIndex + 400);
  const replace = async (searchRegex, makeReplacement) => {
    const m = slice.match(searchRegex);
    if (!m) return false;
    const from = startIndex + m.index;
    const to = from + m[0].length;
    const range = new vscode.Range(
      document.positionAt(from),
      document.positionAt(to)
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, makeReplacement(m));
    await vscode.workspace.applyEdit(edit);
    return true;
  };
  if (isVue3) {
    // const handleClick = () => or function handleClick()
    if (
      await replace(
        new RegExp(`const\\s+${methodName}\\s*=\\s*\\(([^)]*)\\)\\s*=>`),
        () => `const ${methodName} = (${params}) =>`
      )
    ) {
      return;
    }
    if (
      await replace(
        new RegExp(`function\\s+${methodName}\\s*\\(([^)]*)\\)`),
        () => `function ${methodName}(${params})`
      )
    ) {
      return;
    }
  } else {
    if (
      await replace(
        new RegExp(`${methodName}\\s*\\(([^)]*)\\)\\s*{`),
        () => `${methodName}(${params}) {`
      )
    ) {
      return;
    }
  }
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
