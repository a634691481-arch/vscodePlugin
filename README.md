# Vue 变量/方法一键生成插件

借助 `Alt + Enter`，在 Vue2/Vue3 项目中一键生成变量与方法，支持多层路径、参数签名补全与智能跳转，减少样板代码与来回查找。

## 核心能力

- Vue 版本识别：Vue2 Options API、Vue3 Composition API、`<script setup>`
- 一键生成
  - 变量：支持单层与多层路径（如 `statsBuffer.profile.name`）
  - 方法：从模板事件调用解析参数，自动生成/补全方法签名
- 追加与转换
  - 已有对象末尾追加属性，自动处理逗号与缩进（单行/多行）
  - Vue2：当 `data()` 中基础变量为标量（如 `gggg: ''`）时，自动转换为对象再追加子属性
  - Vue3：当 `ref('')` 为标量时，自动替换为 `ref({ ... })` 再追加子属性
- 跳转策略
  - 首次生成不跳转
  - 基础变量已存在但新增子字段时不跳转（只追加）
  - 仅当完整定义已存在且未发生追加时才跳转到定义
- 方法插入位置
  - Vue2：无论 `methods: {}` 是否为空，始终插入到块闭括号前（末尾）
  - Vue3 `<script setup>`：插入到 `</script>` 之前
  - Vue3 `setup()`：在 `return {}` 之前插入，并确保返回暴露
- 事件识别：支持 `@event`/`v-on:event` 及事件修饰符（如 `.stop`、`.prevent`）
- Import 行为：不自动插入或修改 `import`（如需自动导入请使用社区方案）

## 使用指南

1. 生成变量

- 在模板中把光标放在变量名上，按 `Alt + Enter`
- Vue2：生成到 `data() { return { ... } }`
- Vue3：
  - `<script setup>`：生成到脚本闭合标签前
  - `setup()`：生成到 `setup()` 中并保证返回暴露

2. 生成方法

- 在模板事件调用处把光标放在方法名上，按 `Alt + Enter`
- 会解析调用中的参数，生成或更新对应方法签名
- Vue2：插到 `methods` 末尾
- Vue3：插到 `</script>` 前或 `setup()` 的 `return` 之前

3. 跳转到定义

- 已存在时按 `Alt + Enter` 会跳转到定义
- 若本次是“首次生成”或“为已有对象追加子字段”，则不跳转

## 示例

### Vue3（`<script setup>`）

```vue
<template>
  <div>
    <!-- 单层变量 -->
    <p>{{ userName }}</p>
    <!-- 多层变量追加 -->
    <p>{{ user.profile.name }}</p>
    <!-- 方法带参数 -->
    <button @click="submitForm(inputValue)">提交</button>
  </div>
</template>

<script setup>
// 项目需自行保证 ref/reactive 可用（插件不自动导入）
// Alt+Enter：生成 userName、user.profile.name 与 submitForm(inputValue)
</script>
```

### Vue2（Options API）

```vue
<template>
  <div>
    <p>{{ gggg }}</p>
    <p>{{ gggg.name }}</p>
    <button @click="handleClick(x)">点击</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      gggg: "", // Alt+Enter 在 gggg.name 上会自动转换为对象并追加 name
    };
  },
  methods: {
    // Alt+Enter 在模板事件方法名上，自动生成到 methods 的末尾
  },
};
</script>
```

## 行为细则

- 逗号与缩进
  - 单行对象：在右括号前直接插入 `, key: value`
  - 多行对象：若上一项无逗号则补逗号，并按块内缩进追加新行
- 事件修饰符：识别 `@click.stop="fn"`、`v-on:click.prevent="fn(args)"`
- 方法签名更新：若方法已存在但缺少调用参数，会自动补全参数列表

## 快捷键

| 快捷键        | 功能                      |
| ------------- | ------------------------- |
| `Alt + Enter` | 生成变量/方法或跳转到定义 |

## 要求与建议

- VS Code ≥ 1.106.1，Node.js ≥ 22.x
- Vue3 项目建议使用自动导入方案（如 `unplugin-auto-import`）以免手动维护 `import`

## 版本记录

### 0.0.1

- 支持 Vue2/Vue3、变量/方法一键生成、嵌套结构、存在性检查与跳转、事件修饰符识别

### 0.0.2

- 新增：
  - 首次生成与子字段追加不跳转的策略
  - Vue2 `methods:{}` 为空时末尾插入
  - Vue2 标量到对象的自动转换（如 `gggg: ''` → `gggg: { name: '' }`）
  - Vue3 `ref('')` 到 `ref({ ... })` 的自动转换
  - `<script setup>` 插入到 `</script>` 前，取消自动 `import`

---

享受更丝滑的 Vue 开发体验！🎉
