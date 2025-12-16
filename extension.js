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
          let appended = false;
          if (fullPath.includes(".")) {
            appended = await appendNestedPropertyIfNeededScoped(
              document,
              text,
              varLocation.index,
              fullPath,
              baseName,
              isVue3
            );
          }
          if (!appended) {
            const targetPosition = document.positionAt(varLocation.index);
            editor.selection = new vscode.Selection(
              targetPosition,
              targetPosition
            );
            editor.revealRange(
              new vscode.Range(targetPosition, targetPosition)
            );
          }
          vscode.window.showInformationMessage(
            appended
              ? `已在 ${baseName} 中追加属性: ${fullPath
                  .split(".")
                  .slice(1)
                  .join(".")}`
              : `变量 ${fullPath} 已存在,已跳转`
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
      const isVue3 =
        text.includes("setup()") ||
        text.includes("<script setup>") ||
        /import\s+{[^}]*ref[^}]*}\s+from\s+['"]vue['"]/.test(text);
      const vp = getFullVariablePath(document, position, line);
      if (vp && vp.fullPath && vp.baseName) {
        const nestedLoc = findNestedPropertyDefinition(
          text,
          vp.fullPath,
          vp.baseName,
          isVue3
        );
        if (nestedLoc) {
          const target = document.positionAt(nestedLoc.index);
          return new vscode.Location(document.uri, target);
        }
        const vloc = findVariableDefinition(
          text,
          vp.fullPath,
          vp.baseName,
          isVue3
        );
        if (vloc) {
          const target = document.positionAt(vloc.index);
          return new vscode.Location(document.uri, target);
        }
      }
      if (isMethodReference(line, name)) {
        const mloc = findMethodDefinition(text, name, isVue3);
        if (mloc) {
          const target = document.positionAt(mloc.index);
          return new vscode.Location(document.uri, target);
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
  const defReg = vscode.languages.registerDefinitionProvider(
    selector,
    definitionProvider
  );

  context.subscriptions.push(disposable, generateVueCode, defReg);
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
    const dataMatch = scriptContent.match(
      /data\s*\(\)\s*{\s*return\s*{([\s\S]*?)}/m
    );
    if (dataMatch) {
      const dataContent = dataMatch[1];
      const whole = dataMatch[0];
      const wholeAbs = scriptStartIndex + scriptContent.indexOf(whole);
      const contentAbsStart =
        wholeAbs + whole.indexOf("return {") + "return {".length;
      const idx = findTopLevelKeyIndexInObject(dataContent, baseName);
      if (idx >= 0) {
        return { index: contentAbsStart + idx };
      }
    }
  }

  return null;
}

function findTopLevelKeyIndexInObject(objText, key) {
  let i = 0;
  let depth = 0;
  let inStr = false;
  let quote = null;
  while (i < objText.length) {
    const ch = objText[i];
    if (inStr) {
      if (ch === quote && objText[i - 1] !== "\\") {
        inStr = false;
        quote = null;
      }
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inStr = true;
      quote = ch;
      i++;
      continue;
    }
    if (ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === "}") {
      if (depth > 0) depth--;
      i++;
      continue;
    }
    if (depth === 0) {
      if (objText.startsWith(key, i)) {
        const prev = i - 1;
        const boundary = prev < 0 || /[\s,]/.test(objText[prev]);
        if (boundary) {
          let j = i + key.length;
          while (j < objText.length && /\s/.test(objText[j])) j++;
          if (objText[j] === ":") return i;
        }
      }
    }
    i++;
  }
  return -1;
}

function findNestedPropertyDefinition(text, fullPath, baseName, isVue3) {
  const parts = fullPath.split(".");
  if (parts.length < 2) return null;
  const chain = parts.slice(1);
  const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;
  const scriptContent = scriptMatch[1];
  const scriptStartIndex =
    scriptMatch.index + scriptMatch[0].indexOf(scriptContent);
  if (isVue3) {
    const decl = scriptContent.match(
      new RegExp(`(const|let|var)\\s+${baseName}\\s*=\\s*(ref|reactive)\\s*\\(`)
    );
    if (!decl) return null;
    const afterDeclRel = decl.index + decl[0].length;
    const parenOpenAbs = scriptStartIndex + afterDeclRel - 1;
    const parenCloseAbs = findClosingParenIndex(text, parenOpenAbs);
    if (parenCloseAbs <= parenOpenAbs) return null;
    const braceRelInSlice = scriptContent.indexOf("{", afterDeclRel);
    if (braceRelInSlice < 0) return null;
    const objOpenAbs = scriptStartIndex + braceRelInSlice;
    const objCloseAbs = findClosingBraceIndex(text, objOpenAbs);
    if (objCloseAbs <= objOpenAbs) return null;
    let open = objOpenAbs;
    let close = objCloseAbs;
    let objText = text.slice(open + 1, close);
    let parentKey = chain[0];
    for (let i = 0; i < chain.length; i++) {
      const key = chain[i];
      if (i === 0 && chain.length > 1) {
        const pm = objText.match(new RegExp(`\\b${parentKey}\\s*:\\s*`));
        if (!pm) return null;
        const valueStartRel = pm.index + pm[0].length;
        const range = findPropValueRangeInObject(objText, valueStartRel);
        const innerOpenAbs = open + 1 + range.start;
        const innerCloseAbs = open + 1 + range.end;
        if (text[innerOpenAbs] !== "{") return null;
        open = innerOpenAbs;
        close = findClosingBraceIndex(text, open);
        objText = text.slice(open + 1, close);
      }
      if (i === chain.length - 1) {
        const idxRel = objText.search(new RegExp(`\\b${key}\\s*:`));
        if (idxRel < 0) return null;
        return { index: open + 1 + idxRel };
      }
    }
    return null;
  } else {
    const dataMatch = scriptContent.match(
      /data\s*\(\)\s*{\s*return\s*{([\s\S]*?)}/m
    );
    if (!dataMatch) return null;
    const dataContent = dataMatch[1];
    const whole = dataMatch[0];
    const wholeAbs = scriptStartIndex + scriptContent.indexOf(whole);
    const contentAbsStart =
      wholeAbs + whole.indexOf("return {") + "return {".length;
    const baseIdxRel = findTopLevelKeyIndexInObject(dataContent, baseName);
    if (baseIdxRel < 0) return null;
    const baseKeyAbs = contentAbsStart + baseIdxRel;
    const baseObjOpenRel = dataContent.indexOf("{", baseIdxRel);
    if (baseObjOpenRel < 0) return null;
    let open = contentAbsStart + baseObjOpenRel;
    let close = findClosingBraceIndex(text, open);
    let objText = text.slice(open + 1, close);
    for (let i = 0; i < chain.length; i++) {
      const key = chain[i];
      if (i < chain.length - 1) {
        const pm = objText.match(new RegExp(`\\b${key}\\s*:\\s*`));
        if (!pm) return null;
        const valueStartRel = pm.index + pm[0].length;
        const range = findPropValueRangeInObject(objText, valueStartRel);
        const innerOpenAbs = open + 1 + range.start;
        const innerCloseAbs = open + 1 + range.end;
        if (text[innerOpenAbs] !== "{") return null;
        open = innerOpenAbs;
        close = findClosingBraceIndex(text, open);
        objText = text.slice(open + 1, close);
      } else {
        const idxRel = objText.search(new RegExp(`\\b${key}\\s*:`));
        if (idxRel < 0) return null;
        return { index: open + 1 + idxRel };
      }
    }
    return null;
  }
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
      let insertPosition;
      const scriptCloseMatch = text.match(/<\/script>/);
      const varDecl =
        /(const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*(ref|reactive)\s*\(/g;
      let m;
      let lastVarRel = -1;
      while ((m = varDecl.exec(scriptContent)) !== null) {
        lastVarRel = m.index;
      }
      if (lastVarRel >= 0) {
        const slice = scriptContent.slice(lastVarRel);
        const nlRel = slice.indexOf("\n");
        const abs =
          nlRel >= 0
            ? scriptStartIndex + lastVarRel + nlRel + 1
            : scriptStartIndex + lastVarRel + slice.length;
        insertPosition = document.positionAt(abs);
      } else {
        const r1 =
          /const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*\([^)]*\)\s*=>\s*\{/g;
        const r2 = /function\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\(/g;
        let firstMethodRel = -1;
        let mm;
        if ((mm = r1.exec(scriptContent)) !== null) firstMethodRel = mm.index;
        if ((mm = r2.exec(scriptContent)) !== null) {
          if (firstMethodRel === -1 || mm.index < firstMethodRel)
            firstMethodRel = mm.index;
        }
        if (firstMethodRel >= 0) {
          insertPosition = document.positionAt(
            scriptStartIndex + firstMethodRel
          );
        } else {
          insertPosition = document.positionAt(scriptCloseMatch.index);
        }
      }

      // 插入变量声明 (支持多层结构)
      const varCode = generateVariableCode(fullPath, baseName, isVue3);
      const edit = new vscode.WorkspaceEdit();
      edit.insert(document.uri, insertPosition, varCode.vue3Setup);
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`已生成 Vue3 变量: ${fullPath}`);
    } else {
      // Composition API with setup()：变量插入到 return 之前（末尾追加）
      const setupMatch = scriptContent.match(
        /setup\s*\([^)]*\)\s*{[\s\S]*?return\s*{/
      );
      if (setupMatch) {
        const returnIndex =
          scriptStartIndex +
          setupMatch.index +
          setupMatch[0].length -
          "return {".length;
        const returnPosition = document.positionAt(returnIndex);

        const varCode = generateVariableCode(fullPath, baseName, isVue3);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, returnPosition, `\n${varCode.vue3Setup}`);
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
      const openAbs =
        scriptStartIndex + dataMatch.index + dataMatch[0].length - 1;
      const closeAbs = findClosingBraceIndex(text, openAbs);
      if (closeAbs > openAbs) {
        const parts = fullPath.split(".");
        let value = "''";
        if (parts.length > 1) {
          let nestedObj = "{}";
          for (let i = parts.length - 1; i >= 1; i--) {
            if (i === parts.length - 1) nestedObj = `{ ${parts[i]}: '' }`;
            else nestedObj = `{ ${parts[i]}: ${nestedObj} }`;
          }
          value = nestedObj;
        }
        await insertProperty(
          document,
          text,
          openAbs,
          closeAbs,
          baseName,
          value,
          3
        );
      }
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
        scriptEndPosition,
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
      const openAbsIndex =
        scriptStartIndex + methodsMatch.index + methodsMatch[0].length - 1; // point to '{'
      const closeAbsIndex = findClosingBraceIndex(text, openAbsIndex);
      if (closeAbsIndex > openAbsIndex) {
        const insertPos = document.positionAt(closeAbsIndex);
        const params = args.join(", ");
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          insertPos,
          `\n\t\t${methodName}(${params}) {\n\t\t\t// TODO: 实现方法逻辑\n\t\t},\n`
        );
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`已生成 Vue2 方法: ${methodName}`);
      }
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

function findClosingBraceIndex(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i; // position of matching '}'
    }
  }
  return -1;
}
function findClosingParenIndex(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function findPropValueRangeInObject(objText, valueStartRel) {
  let i = valueStartRel;
  while (i < objText.length && /\s/.test(objText[i])) i++;
  const start = i;
  let depth = 0;
  let inStr = false;
  let quote = null;
  for (; i < objText.length; i++) {
    const ch = objText[i];
    if (inStr) {
      if (ch === quote && objText[i - 1] !== "\\") {
        inStr = false;
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      if (depth > 0) depth--;
      else break;
    } else if (ch === "," && depth === 0) {
      break;
    }
  }
  const end = i;
  return { start, end };
}

function buildNested(keys) {
  let nested = "";
  for (let i = keys.length - 1; i >= 0; i--) {
    if (i === keys.length - 1) nested = `{ ${keys[i]}: '' }`;
    else nested = `{ ${keys[i]}: ${nested} }`;
  }
  return nested;
}

async function insertProperty(
  document,
  text,
  openAbs,
  closeAbs,
  key,
  value,
  indentTabs,
  additionOverride
) {
  const objContent = text.slice(openAbs + 1, closeAbs);
  const isMultiline = objContent.includes("\n");
  let prev = closeAbs - 1;
  while (prev > openAbs && /\s/.test(text[prev])) prev--;
  const edit = new vscode.WorkspaceEdit();
  if (isMultiline) {
    if (text[prev] !== ",") {
      edit.insert(document.uri, document.positionAt(prev + 1), ",");
    }
    const lastNl = text.lastIndexOf("\n", closeAbs - 1);
    const indentMatch =
      lastNl >= 0 ? text.slice(lastNl + 1, closeAbs).match(/^\s*/) : null;
    const indent = indentMatch ? indentMatch[0] : "\t".repeat(indentTabs || 2);
    const segment = lastNl >= 0 ? text.slice(lastNl + 1, closeAbs) : "";
    const onlyWhitespace = /^\s*$/.test(segment);
    const prefix = onlyWhitespace ? "" : "\n";
    const addition = additionOverride ?? `${key}: ${value}`;
    edit.insert(
      document.uri,
      document.positionAt(closeAbs),
      `${prefix}${indent}${addition}\n`
    );
  } else {
    const addition = additionOverride ?? `${key}: ${value}`;
    edit.insert(document.uri, document.positionAt(closeAbs), `, ${addition}`);
  }
  await vscode.workspace.applyEdit(edit);
  return true;
}

async function appendNestedPropertyIfNeededScoped(
  document,
  text,
  varStartIndex,
  fullPath,
  baseName,
  isVue3
) {
  const parts = fullPath.split(".");
  if (parts.length < 2) return false;
  const chain = parts.slice(1);
  const parentKey = chain[0];
  const lastKey = chain[chain.length - 1];

  if (isVue3) {
    const slice = text.slice(varStartIndex, varStartIndex + 4000);
    const assignIdx = slice.search(/=\s*(?:ref|reactive)\s*\(/);
    if (assignIdx < 0) return false;
    const braceRel = slice.indexOf("{", assignIdx);
    if (braceRel < 0) {
      const parenRel = slice.indexOf("(", assignIdx);
      if (parenRel < 0) return false;
      const openParenAbs = varStartIndex + parenRel;
      const closeParenAbs = findClosingParenIndex(text, openParenAbs);
      if (closeParenAbs <= openParenAbs) return false;
      const nested = buildNested(chain);
      const range = new vscode.Range(
        document.positionAt(openParenAbs + 1),
        document.positionAt(closeParenAbs)
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, range, nested);
      await vscode.workspace.applyEdit(edit);
      return true;
    }
    const openAbs = varStartIndex + braceRel;
    const closeAbs = findClosingBraceIndex(text, openAbs);
    if (closeAbs <= openAbs) return false;
    const objContent = text.slice(openAbs + 1, closeAbs);

    if (chain.length === 1) {
      const exists = new RegExp(`\\b${lastKey}\\s*:`).test(objContent);
      if (exists) return false;
      return insertProperty(
        document,
        text,
        openAbs,
        closeAbs,
        lastKey,
        "''",
        2
      );
    } else {
      const parentMatch = objContent.match(
        new RegExp(`\\b${parentKey}\\s*:\\s*`)
      );
      if (parentMatch) {
        const valueStartRel = parentMatch.index + parentMatch[0].length;
        const { start, end } = findPropValueRangeInObject(
          objContent,
          valueStartRel
        );
        const absFrom = openAbs + 1 + start;
        const absTo = openAbs + 1 + end;
        const valFirstChar = text[absFrom];
        if (valFirstChar === "{") {
          const innerOpen = absFrom;
          const innerClose = findClosingBraceIndex(text, innerOpen);
          const innerContent = text.slice(innerOpen + 1, innerClose);
          if (chain.length === 2) {
            const existsInner = new RegExp(`\\b${lastKey}\\s*:`).test(
              innerContent
            );
            if (existsInner) return false;
            return insertProperty(
              document,
              text,
              innerOpen,
              innerClose,
              lastKey,
              "''",
              2
            );
          }
          const nested = buildNested(chain.slice(1));
          const range = new vscode.Range(
            document.positionAt(absFrom),
            document.positionAt(absTo)
          );
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, range, nested);
          await vscode.workspace.applyEdit(edit);
          return true;
        } else {
          const nested = buildNested(chain.slice(1));
          const range = new vscode.Range(
            document.positionAt(absFrom),
            document.positionAt(absTo)
          );
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, range, nested);
          await vscode.workspace.applyEdit(edit);
          return true;
        }
      } else {
        const nested = buildNested(chain.slice(1));
        const addition = `${parentKey}: ${nested}`;
        return insertProperty(
          document,
          text,
          openAbs,
          closeAbs,
          null,
          null,
          2,
          addition
        );
      }
    }
  } else {
    const slice = text.slice(varStartIndex, varStartIndex + 4000);
    const objIdx = slice.search(new RegExp(`\\b${baseName}\\s*:\\s*{`));
    if (objIdx < 0) {
      const propMatch = slice.match(new RegExp(`\\b${baseName}\\s*:\\s*`));
      if (!propMatch) return false;
      const valueStartRel = propMatch.index + propMatch[0].length;
      const rangeInfo = findPropValueRangeInObject(slice, valueStartRel);
      const absFrom = varStartIndex + rangeInfo.start;
      const absTo = varStartIndex + rangeInfo.end;
      const nested = buildNested(chain);
      const range = new vscode.Range(
        document.positionAt(absFrom),
        document.positionAt(absTo)
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, range, nested);
      await vscode.workspace.applyEdit(edit);
      return true;
    }
    const braceRel = slice.indexOf("{", objIdx);
    if (braceRel < 0) return false;
    const openAbs = varStartIndex + braceRel;
    const closeAbs = findClosingBraceIndex(text, openAbs);
    if (closeAbs <= openAbs) return false;
    const objContent = text.slice(openAbs + 1, closeAbs);

    if (chain.length === 1) {
      const exists = new RegExp(`\\b${lastKey}\\s*:`).test(objContent);
      if (exists) return false;
      return insertProperty(
        document,
        text,
        openAbs,
        closeAbs,
        lastKey,
        "''",
        4
      );
    } else {
      const parentMatch = objContent.match(
        new RegExp(`\\b${parentKey}\\s*:\\s*`)
      );
      if (parentMatch) {
        const valueStartRel = parentMatch.index + parentMatch[0].length;
        const { start, end } = findPropValueRangeInObject(
          objContent,
          valueStartRel
        );
        const absFrom = openAbs + 1 + start;
        const absTo = openAbs + 1 + end;
        const valFirstChar = text[absFrom];
        if (valFirstChar === "{") {
          const innerOpen = absFrom;
          const innerClose = findClosingBraceIndex(text, innerOpen);
          const innerContent = text.slice(innerOpen + 1, innerClose);
          if (chain.length === 2) {
            const existsInner = new RegExp(`\\b${lastKey}\\s*:`).test(
              innerContent
            );
            if (existsInner) return false;
            return insertProperty(
              document,
              text,
              innerOpen,
              innerClose,
              lastKey,
              "''",
              4
            );
          }
          const nested = buildNested(chain.slice(1));
          const range = new vscode.Range(
            document.positionAt(absFrom),
            document.positionAt(absTo)
          );
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, range, nested);
          await vscode.workspace.applyEdit(edit);
          return true;
        } else {
          const nested = buildNested(chain.slice(1));
          const range = new vscode.Range(
            document.positionAt(absFrom),
            document.positionAt(absTo)
          );
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, range, nested);
          await vscode.workspace.applyEdit(edit);
          return true;
        }
      } else {
        const nested = buildNested(chain.slice(1));
        const addition = `${parentKey}: ${nested}`;
        return insertProperty(
          document,
          text,
          openAbs,
          closeAbs,
          null,
          null,
          4,
          addition
        );
      }
    }
  }
  return false;
}
function findPropValueRangeInObject(objText, valueStartRel) {
  let i = valueStartRel;
  while (i < objText.length && /\s/.test(objText[i])) i++;
  const start = i;
  let depth = 0;
  let inStr = false;
  let quote = null;
  for (; i < objText.length; i++) {
    const ch = objText[i];
    if (inStr) {
      if (ch === quote && objText[i - 1] !== "\\") {
        inStr = false;
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      if (depth > 0) depth--;
      else break;
    } else if (ch === "," && depth === 0) {
      break;
    }
  }
  const end = i;
  return { start, end };
}

async function appendNestedPropertyIfNeeded(
  document,
  text,
  varStartIndex,
  fullPath,
  baseName,
  isVue3
) {
  const parts = fullPath.split(".");
  if (parts.length < 2) return false;
  const propChain = parts.slice(1);
  const lastKey = propChain[propChain.length - 1];

  if (isVue3) {
    const slice = text.slice(varStartIndex, varStartIndex + 2000);
    const assignIdx = slice.search(/=\s*(?:ref|reactive)\s*\(/);
    if (assignIdx >= 0) {
      const braceRel = slice.indexOf("{", assignIdx);
      if (braceRel >= 0) {
        const openAbs = varStartIndex + braceRel;
        const closeAbs = findClosingBraceIndex(text, openAbs);
        if (closeAbs > openAbs) {
          const objContent = text.slice(openAbs + 1, closeAbs);
          const firstKey = propChain[0];
          if (
            propChain.length > 1 &&
            new RegExp(`\\b${firstKey}\\s*:`).test(objContent)
          ) {
            const propMatch = objContent.match(
              new RegExp(`\\b${firstKey}\\s*:\\s*`)
            );
            if (propMatch) {
              const valueStartRel = propMatch.index + propMatch[0].length;
              const { start, end } = findPropValueRangeInObject(
                objContent,
                valueStartRel
              );
              const absFrom = openAbs + 1 + start;
              const absTo = openAbs + 1 + end;
              let nested = "";
              for (let i = propChain.length - 1; i >= 1; i--) {
                if (i === propChain.length - 1)
                  nested = `{ ${propChain[i]}: '' }`;
                else nested = `{ ${propChain[i]}: ${nested} }`;
              }
              const range = new vscode.Range(
                document.positionAt(absFrom),
                document.positionAt(absTo)
              );
              const edit = new vscode.WorkspaceEdit();
              edit.replace(document.uri, range, nested);
              await vscode.workspace.applyEdit(edit);
              return true;
            }
          }
          const exists = new RegExp(`\\b${lastKey}\\s*:`).test(objContent);
          if (!exists) {
            let addition = "";
            if (propChain.length === 1) {
              addition = `${lastKey}: ''`;
            } else {
              let nested = "";
              for (let i = propChain.length - 1; i >= 0; i--) {
                if (i === propChain.length - 1)
                  nested = `{ ${propChain[i]}: '' }`;
                else nested = `{ ${propChain[i]}: ${nested} }`;
              }
              addition = nested;
            }
            let prev = closeAbs - 1;
            while (prev > openAbs && /\s/.test(text[prev])) prev--;
            const isMultiline = objContent.includes("\n");
            const edit = new vscode.WorkspaceEdit();
            if (isMultiline) {
              if (text[prev] !== ",") {
                edit.insert(document.uri, document.positionAt(prev + 1), ",");
              }
              const lastNl = text.lastIndexOf("\n", closeAbs - 1);
              const indentMatch =
                lastNl >= 0
                  ? text.slice(lastNl + 1, closeAbs).match(/^\s*/)
                  : null;
              const indent = indentMatch ? indentMatch[0] : "\t\t";
              const prefix = text[closeAbs - 1] === "\n" ? "" : "\n";
              edit.insert(
                document.uri,
                document.positionAt(closeAbs),
                `${prefix}${indent}${addition},\n`
              );
            } else {
              edit.insert(
                document.uri,
                document.positionAt(closeAbs),
                `, ${addition}`
              );
            }
            await vscode.workspace.applyEdit(edit);
            return true;
          }
        }
      }
    }
  } else {
    const slice = text.slice(varStartIndex, varStartIndex + 3000);
    const objIdx = slice.search(new RegExp(`\\b${baseName}\\s*:\\s*{`));
    if (objIdx >= 0) {
      const braceRel = slice.indexOf("{", objIdx);
      if (braceRel >= 0) {
        const openAbs = varStartIndex + braceRel;
        const closeAbs = findClosingBraceIndex(text, openAbs);
        if (closeAbs > openAbs) {
          const objContent = text.slice(openAbs + 1, closeAbs);
          const firstKey = propChain[0];
          if (
            propChain.length > 1 &&
            new RegExp(`\\b${firstKey}\\s*:`).test(objContent)
          ) {
            const propMatch = objContent.match(
              new RegExp(`\\b${firstKey}\\s*:\\s*`)
            );
            if (propMatch) {
              const valueStartRel = propMatch.index + propMatch[0].length;
              const { start, end } = findPropValueRangeInObject(
                objContent,
                valueStartRel
              );
              const absFrom = openAbs + 1 + start;
              const absTo = openAbs + 1 + end;
              let nested = "";
              for (let i = propChain.length - 1; i >= 1; i--) {
                if (i === propChain.length - 1)
                  nested = `{ ${propChain[i]}: '' }`;
                else nested = `{ ${propChain[i]}: ${nested} }`;
              }
              const range = new vscode.Range(
                document.positionAt(absFrom),
                document.positionAt(absTo)
              );
              const edit = new vscode.WorkspaceEdit();
              edit.replace(document.uri, range, nested);
              await vscode.workspace.applyEdit(edit);
              return true;
            }
          }
          const exists = new RegExp(`\\b${lastKey}\\s*:`).test(objContent);
          if (!exists) {
            let addition = "";
            if (propChain.length === 1) {
              addition = `${lastKey}: ''`;
            } else {
              let nested = "";
              for (let i = propChain.length - 1; i >= 1; i--) {
                if (i === propChain.length - 1)
                  nested = `{ ${propChain[i]}: '' }`;
                else nested = `{ ${propChain[i]}: ${nested} }`;
              }
              addition = `${propChain[0]}: ${nested}`;
            }
            let prev = closeAbs - 1;
            while (prev > openAbs && /\s/.test(text[prev])) prev--;
            const isMultiline = objContent.includes("\n");
            const edit = new vscode.WorkspaceEdit();
            if (isMultiline) {
              if (text[prev] !== ",") {
                edit.insert(document.uri, document.positionAt(prev + 1), ",");
              }
              const lastNl = text.lastIndexOf("\n", closeAbs - 1);
              const indentMatch =
                lastNl >= 0
                  ? text.slice(lastNl + 1, closeAbs).match(/^\s*/)
                  : null;
              const indent = indentMatch ? indentMatch[0] : "\t\t\t\t";
              const prefix = text[closeAbs - 1] === "\n" ? "" : "\n";
              edit.insert(
                document.uri,
                document.positionAt(closeAbs),
                `${prefix}${indent}${addition},\n`
              );
            } else {
              edit.insert(
                document.uri,
                document.positionAt(closeAbs),
                `, ${addition}`
              );
            }
            await vscode.workspace.applyEdit(edit);
            return true;
          }
        }
      }
    }
  }
  return false;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
