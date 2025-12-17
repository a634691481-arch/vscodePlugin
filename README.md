# Vue 变量/方法生成器 使用操作文档 🚀

让 Vue2/Vue3 的变量与方法生成、跳转、嵌套处理更顺畅。以下为完整的使用指南与示例。

## 快速开始 ✨

- 将光标放在模板中的变量或方法名上
- 按下 `Alt + Enter` 自动生成变量/方法
- 若已存在则跳转到定义（首次生成或为对象追加子字段时不跳转）
- 变量或方法生成位置遵循既定“末尾追加”规则，避免乱插入

## 变量生成与追加 🧩

- 单层变量：直接生成空值（Vue3 为 `ref('')`，Vue2 为 `''`）
- 多层变量：自动生成嵌套结构（如 `statsBuffer.profile.name` → `{ profile: { name: '' } }`）
- 已有对象内追加末尾属性（自动补逗号与缩进，单/多行都合理）
- Vue3 标量自动转换为对象：
  - `const gggg = ref('')` → 在 `{{ gggg.name }}` 上按 `Alt + Enter` → 自动变为 `ref({ name: '' })`

## 方法生成与参数 🔧

- 模板事件调用如 `@click="submitForm(inputValue)"` 上按 `Alt + Enter`：
  - 生成方法并解析参数签名为 `submitForm(inputValue)`
  - 已存在方法但缺少参数时会自动补全签名
- Vue2 `methods`：
  - 空对象或已存在对象，都会插入到闭括号前（末尾）
  - 支持三种写法的跳转：`foo() {}`, `foo: function() {}`, `foo: (...) => { }`
- Vue3：
  - `<script setup>`：变量追加在最后一个变量后；若无变量则插入第一个方法前；都没有则在脚本末尾
  - `setup()`：变量与方法都插在 `return {}` 之前，并确保返回暴露

## 跳转与返回 🧭

- 跳转到定义（变量或方法）：
  - Windows/Linux：`Ctrl + 左键` 或 `F12`
  - macOS：`Cmd + 左键` 或 `F12`
- 从定义回到使用：
  - 快速返回：`Alt + Left`（编辑器内置）
  - 查看引用并跳转：`Shift + F12`
- 说明：VS Code 不支持把 “Alt + 左键” 自定义为跳转；插件已提供 DefinitionProvider 与 References 能力，使用以上标准手势即可。

## 事件识别 ✅

- 识别 `@event="fn"`、`v-on:event="fn"` 以及事件修饰符：如 `@click.stop="fn"`、`@change="fn(args)"`
- 形如 `@getphonenumber="getPhoneNumber"`、`@change="setCalendarTime"` 均可跳转到定义

## 示例代码 🌟

### Vue3（`<script setup>`）

```vue
<template>
  <div>
    <!-- 变量与嵌套 -->
    <p>{{ statsBuffer.xx }}</p>
    <p>{{ statsBuffer.ddd.xxx }}</p>
    <p>{{ statsBuffer.xxxxx }}</p>

    <!-- 方法与参数 -->
    <button @click="submitForm(inputValue)">提交</button>
  </div>
</template>

<script setup>
// 你的项目需保证 ref/reactive 可用（插件不自动导入）
const statsBuffer = ref({
  xx: "",
  ddd: { xxx: "" },
});

// 在 {{ statsBuffer.xxxxx }} 上按 Alt+Enter → 自动追加到对象末尾，无多余空行
// 在 @click="submitForm(inputValue)" 上按 Alt+Enter → 生成带参数的方法签名
</script>
```

### Vue2（Options API）

```vue
<template>
  <div>
    <view @click="getList">获取列表</view>
    <view @change="setCalendarTime">变更时间</view>
    <p>{{ gggg }}</p>
    <p>{{ gggg.name }}</p>
  </div>
</template>

<script>
export default {
  name: "Demo",
  data() {
    return {
      gggg: "", // 在 {{ gggg.name }} 上按 Alt+Enter → 自动转换为 { name: '' }
    };
  },
  methods: {
    // 在模板事件方法名上按 Alt+Enter → 自动追加到 methods 末尾
    // 支持 foo() {}、foo: function() {}、foo: (...) => {} 三种写法的跳转
  },
};
</script>
```

## 规则与细节 📌

- 首次生成不跳转；为已有对象追加子字段不跳转；仅在完整定义已存在且未追加时跳转
- 统一末尾插入：避免插入到块头部或中间
- 自动处理逗号与缩进：
  - 单行对象：右括号前插入 `, key: value`
  - 多行对象：缺逗号则补逗号；按块内缩进追加新行；避免多余空行
- 不自动添加或修改 `import`（如需自动导入可使用社区方案）

## 常见问题 ❓

- Alt+点击无法跳转：请使用 `Ctrl/Cmd + 点击` 或 `F12`；返回可用 `Alt + Left`
- 事件形态不跳转：已支持 `@event="fn"` 与修饰符，如果仍无效，检查方法定义是否存在且写法匹配

—— 享受更丝滑的 Vue 开发体验！🎉
