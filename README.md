🌿 使用指南：Vue 变量/方法一键生成与跳转插件  
━━━━━━━━━━━━━━━━━━

📌 概述  
本指南面向插件使用者，涵盖安装、快捷键、常见场景操作、行为规则与常见问题，帮助你在 Vue2/Vue3 项目中高效生成变量/方法并进行跳转。

1️⃣ 安装与激活  
 🔧 从 VS Code 扩展市场安装（或使用 `.vsix` 本地安装）  
 🔛 打开 `.vue` / `.js` / `.ts` 文件自动激活  
 ✅ 无需额外配置即可使用

2️⃣ 快捷键与手势  
 ⌨️ 生成/跳转：`Alt + Enter`（光标在变量或方法名上）  
 🖱️ 跳转到定义：`Ctrl/Cmd + 左键` 或 `F12`  
 🔍 查看引用并跳回：`Shift + F12`  
 ⬅️ 返回/前进（VS Code 内置）：`Alt + Left` / `Alt + Right`

3️⃣ 核心能力  
 📦 变量生成（Vue2/Vue3）  
  • 支持单层与多层路径（如 `statsBuffer.profile.name`）  
  • 已存在变量时在对象末尾追加子属性，自动处理逗号与缩进  
  • 标量到对象自动转换：Vue2（`gggg: ''` → `{ name: '' }`）、Vue3（`ref('')` → `ref({ ... })`）

⚙️ 方法生成  
  • 从模板事件调用解析参数，自动生成或补全方法签名（如 `submitForm(inputValue)` → `(inputValue)`）  
  • Vue2：始终追加到 `methods` 的末尾；`methods: {}` 为空也能正确插入  
  • Vue3：`<script setup>` 插入脚本中；`setup()` 在 `return {}` 之前插入并确保返回暴露

🔍 跳转到定义  
  • 在模板中点击变量/方法名，使用 `Ctrl/Cmd + 左键` 或 `F12` 跳转  
  • 多层变量优先跳到真实子属性定义，找不到时回退到顶层变量  
  • 在定义处使用 `Shift + F12` 查看引用，选择即可“跳回去”

4️⃣ 常用操作  
 ① 生成变量  
  1. 将光标放在模板中的变量名上（如 `{{ userName }}`）  
  2. 按 `Alt + Enter`  
  3. 插件按规则插入：  
   • Vue3 `<script setup>`：追加在“最后一个变量声明”之后；若无变量则插在“第一个方法”之前；都没有时插在脚本末尾  
   • Vue3 `setup()`：在 `return {}` 之前插入，并确保返回体中暴露  
   • Vue2 `data()`：在返回对象末尾（闭括号前）追加，自动补逗号与缩进  
  4. 多层路径会生成嵌套对象结构；若顶层变量已存在则只在对象末尾追加子属性

② 生成方法  
  1. 将光标放在模板事件方法名上（如 `@click="submitForm(inputValue)"` 的 `submitForm`）  
  2. 按 `Alt + Enter`  
  3. 插件解析调用参数并生成/补全方法签名：  
   • Vue2：方法插到 `methods` 的末尾（空对象也能正确插入）  
   • Vue3 `<script setup>`：方法插入到脚本中（靠近末尾）  
   • Vue3 `setup()`：在 `return {}` 之前插入，并确保返回暴露

③ 跳转到定义  
  1. 在模板中点击变量或方法名  
  2. 使用 `Ctrl/Cmd + 左键` 或 `F12` 跳转到定义处  
  3. 多层变量优先跳到真实子属性定义；若未找到该子属性，则回退到顶层变量  
  4. 在定义处使用 `Shift + F12` 查看所有引用，选择即可“跳回使用位置”

5️⃣ 行为规则  
 📍 插入位置遵循“末尾追加”：  
  • Vue3 `<script setup>`：最后一个变量之后 → 第一个方法之前 → 脚本末尾  
  • Vue3 `setup()`：在 `return {}` 之前  
  • Vue2：在对象块的闭括号前  
 🧱 对象格式：  
  • 单行：在右括号前追加 `, key: value`  
  • 多行：若上一项缺逗号则补逗号；按块内缩进追加新行  
  • Vue3 尾部追加不会产生多余空白行  
 📥 导入行为：  
  • 不自动插入或修改 `import`（如 `ref`/`reactive`）；请使用项目的自动导入方案或自行维护

6️⃣ 示例  
 🧪 Vue3（`<script setup>`）  
  ```vue  
  <template>  
   <div>  
   {{ statsBuffer.profile.name }}  
   <button @click="submitForm(inputValue)">提交</button>  
   </div>  
  </template>

<script setup>  
  // Alt+Enter：生成 statsBuffer 与嵌套 profile.name；生成 submitForm(inputValue)  
  </script>

```

🧪 Vue2（Options API）  
  ```vue  
  <template>  
   <div>  
   {{ gggg }}  
   {{ gggg.name }}  
   <button @click="handleClick(x)">点击</button>  
   </div>  
  </template>

<script>  
  export default {  
   data() {  
   return {  
   gggg: '', // Alt+Enter 在 {{ gggg.name }} 上：自动转换为对象并追加 name  
   }  
   },  
   methods: {  
   // Alt+Enter 在模板方法名上：自动追加到末尾  
   }  
  }  
  </script>

```

7️⃣ 常见问题  
 ❓ 我想用 Alt+左键跳转可以吗？  
  VS Code 不支持扩展自定义 Alt+点击为跳转；请使用 `Ctrl/Cmd + 左键` 或 `F12`。

❓ 首次生成为什么不跳转？  
   首次生成不跳转；为已有对象追加子字段也不跳转；只有完整定义已存在且未追加时才跳转。

❓ 顶层与嵌套同名是否会冲突？  
   不会。顶层与嵌套的检查/插入在不同作用域执行，互不影响。

❓ Vue3 的 `ref('')` 能追加子属性吗？  
   能。插件会自动替换为 `ref({ ... })` 再追加子属性。

❓ Vue2 的 `gggg: ''` 能追加 `gggg.name` 吗？  
   能。插件会自动把标量替换为对象，再追加 `name`。

8️⃣ 建议  
 🚀 Vue3 项目推荐搭配自动导入（如 `unplugin-auto-import`），减少 `ref/reactive` 导入维护  
 🎯 遵循默认快捷键（Alt+Enter、Ctrl/Cmd+左键、F12、Shift+F12）可获得最佳体验

9️⃣ 支持  
 🛠️ 若遇到插入位置或跳转异常，请附上最小复现（模板+脚本），便于快速定位  
 🤝 欢迎在仓库提交 Issue/PR
