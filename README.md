# Vue 变量与方法快速生成插件

一个强大的 VS Code 插件，帮助你在 Vue 2 和 Vue 3 项目中快速生成变量和方法。通过简单的快捷键 `Alt + Enter`，智能识别并生成代码，大幅提升开发效率。

## 功能特性

### 🚀 智能生成

- **自动识别 Vue 版本**：支持 Vue 2 (Options API) 和 Vue 3 (Composition API 和 `<script setup>`)
- **一键生成变量**：将光标放在未定义的变量上，按 `Alt + Enter` 自动生成响应式变量
- **一键生成方法**：将光标放在未定义的方法调用上，按 `Alt + Enter` 自动生成方法
- **多层结构支持**：支持嵌套对象如 `user.profile.name`，自动生成完整的嵌套结构

### 🎯 智能跳转

- **存在性检查**：生成前自动检查变量或方法是否已存在
- **自动跳转**：如果已存在，直接跳转到定义位置
- **避免重复**：防止重复生成相同的变量或方法

### 💡 使用示例

#### Vue 3 示例

```vue
<template>
  <div>
    <!-- 单层变量 -->
    <p>{{ userName }}</p>

    <!-- 多层嵌套变量 -->
    <p>{{ user.profile.name }}</p>

    <!-- 方法调用 -->
    <button @click="handleSubmit">提交</button>
  </div>
</template>

<script setup>
import { ref } from "vue";

// 按 Alt+Enter 自动生成：
const userName = ref("");
const user = ref({ profile: { name: "" } });

const handleSubmit = () => {
  // TODO: 实现方法逻辑
};
</script>
```

#### Vue 2 示例

```vue
<template>
  <div>
    <p>{{ userName }}</p>
    <p>{{ user.profile.name }}</p>
    <button @click="handleSubmit">提交</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      userName: "",
      user: { profile: { name: "" } },
    };
  },
  methods: {
    handleSubmit() {
      // TODO: 实现方法逻辑
    },
  },
};
</script>
```

## 使用方法

1. **生成变量**：

   - 在模板中使用未定义的变量（如 `{{ userName }}`）
   - 将光标放在变量名上
   - 按 `Alt + Enter`
   - 插件会自动在 `data()` 或 `setup` 中生成对应的变量

2. **生成方法**：

   - 在模板中调用未定义的方法（如 `@click="handleClick"`）
   - 将光标放在方法名上
   - 按 `Alt + Enter`
   - 插件会自动在 `methods` 或 `setup` 中生成对应的方法

3. **跳转到定义**：
   - 如果变量或方法已存在，按 `Alt + Enter` 会直接跳转到定义位置

## 支持的文件类型

- `.vue` - Vue 单文件组件
- `.js` - JavaScript 文件
- `.ts` - TypeScript 文件

## 快捷键

| 快捷键        | 功能                      |
| ------------- | ------------------------- |
| `Alt + Enter` | 生成变量/方法或跳转到定义 |

## 版本要求

- Visual Studio Code: ^1.106.1
- Node.js: 22.x

## 发布说明

### 0.0.1

初始版本发布：

- ✅ 支持 Vue 2 和 Vue 3
- ✅ 智能生成变量和方法
- ✅ 支持多层嵌套结构
- ✅ 存在性检查与自动跳转
- ✅ 快捷键 `Alt + Enter` 触发

---

**享受高效的 Vue 开发体验！** 🎉
