# 🎯 Vue 变量/方法生成器 - 功能示例详解

> 一个让 Vue 开发飞起来的智能代码生成插件 🚀

---

## 📚 目录

- [🌟 核心功能](#-核心功能)
- [🧩 变量生成示例](#-变量生成示例)
- [🔧 方法生成示例](#-方法生成示例)
- [🧭 智能跳转示例](#-智能跳转示例)
- [📋 复制路径示例](#-复制路径示例)
- [🖨️ 快速打印示例](#-快速打印示例)
- [🏠 下班提醒](#-下班提醒)
- [🎨 高级场景](#-高级场景)
- [💡 实用技巧](#-实用技巧)

---

## 🌟 核心功能

### ✨ 功能概览

| 功能             | 快捷键                     | 说明                        |
| ---------------- | -------------------------- | --------------------------- |
| 🎯 生成变量/方法 | `Alt + Enter`              | 光标在变量/方法上自动生成   |
| 🧭 跳转到定义    | `Ctrl/Cmd + 点击` 或 `F12` | 快速定位到变量/方法定义     |
| 🔙 返回上一位置  | `Alt + ←`                  | 从定义返回使用处            |
| 📋 复制 Vue 路径 | 右键菜单 → 🚀 y66          | 复制相对路径（无.vue 后缀） |
| 🖨️ 插入 console.log | `Ctrl + Shift + L`     | 快速插入带函数名的打印语句  |
| 🏠 下班提醒         | 自动                   | 状态栏显示下班倒计时        |

---

## 🧩 变量生成示例

### 📦 Vue3 单层变量

**场景**：在模板中使用了 `userName`，但未定义

```vue
<template>
  <div>
    <p>{{ userName }}</p>
    <!-- 光标放这里，按 Alt+Enter -->
  </div>
</template>

<script setup>
// 自动生成 👇
const userName = ref("");
</script>
```

**操作步骤**：

1. 📍 将光标移到 `userName`
2. ⌨️ 按下 `Alt + Enter`
3. ✅ 自动生成 `const userName = ref('')`

---

### 🎁 Vue3 多层嵌套变量

**场景**：使用深层嵌套对象

```vue
<template>
  <div>
    <!-- 步骤1: 生成 user.profile.name -->
    <p>{{ user.profile.name }}</p>
    <!-- Alt+Enter -->

    <!-- 步骤2: 追加 user.profile.age -->
    <p>{{ user.profile.age }}</p>
    <!-- Alt+Enter -->

    <!-- 步骤3: 追加 user.settings.theme -->
    <p>{{ user.settings.theme }}</p>
    <!-- Alt+Enter -->
  </div>
</template>

<script setup>
// 自动生成的完整结构 👇
const user = ref({
  profile: {
    name: "",
    age: "", // 自动追加到 profile 末尾
  },
  settings: {
    theme: "", // 自动新建 settings 对象
  },
});
</script>
```

**智能特性**：

- 🔄 自动识别已存在的层级
- 📌 末尾追加新属性（不破坏现有代码）
- 🎯 智能处理逗号与缩进

---

### 🔄 Vue3 标量自动转对象

**场景**：变量从简单类型升级为对象

```vue
<template>
  <div>
    <p>{{ gggg }}</p>
    <!-- 已存在为标量 -->
    <p>{{ gggg.name }}</p>
    <!-- 光标这里，Alt+Enter -->
  </div>
</template>

<script setup>
// 转换前 👇
const gggg = ref("");

// 转换后（自动识别并转换）👇
const gggg = ref({
  name: "",
});
</script>
```

**魔法时刻** ✨：

- 插件检测到 `ref('')` 是标量
- 自动转换为 `ref({ name: '' })`
- 保留原有 ref 包装

---

### 🎯 Vue2 变量生成

**场景**：Options API 中生成 data 属性

```vue
<template>
  <div>
    <p>{{ formData.email }}</p>
    <!-- Alt+Enter -->
    <p>{{ formData.password }}</p>
    <!-- Alt+Enter -->
    <p>{{ isLoading }}</p>
    <!-- Alt+Enter -->
  </div>
</template>

<script>
export default {
  name: "LoginForm",
  data() {
    return {
      // 自动生成嵌套对象 👇
      formData: {
        email: "",
        password: "",
      },
      // 自动生成简单变量 👇
      isLoading: "",
    };
  },
};
</script>
```

---

## 🔧 方法生成示例

### ⚡ Vue3 无参方法

**场景**：生成简单的事件处理方法

```vue
<template>
  <div>
    <button @click="handleLogin">登录</button>
    <!-- Alt+Enter -->
    <button @click="resetForm">重置</button>
    <!-- Alt+Enter -->
  </div>
</template>

<script setup>
// 自动生成 👇
const handleLogin = () => {};

const resetForm = () => {};
</script>
```

---

### 🎁 Vue3 带参数方法

**场景**：智能解析参数并生成签名

```vue
<template>
  <div>
    <!-- 单参数 -->
    <button @click="deleteItem(item.id)">删除</button>

    <!-- 多参数 -->
    <button @click="updateUser(userId, formData)">更新</button>

    <!-- $event 参数 -->
    <input @input="onInput($event.target.value)" />
  </div>
</template>

<script setup>
// 自动生成带参数签名 👇
const deleteItem = (id) => {};

const updateUser = (userId, formData) => {};

const onInput = (value) => {};
</script>
```

**智能解析**：

- 🔍 自动提取参数名（如 `item.id` → `id`）
- 📝 生成清晰的参数签名
- 🎯 支持复杂表达式（如 `$event.target.value` → `value`）

---

### 🎨 Vue3 事件修饰符支持

**场景**：识别各种事件写法

```vue
<template>
  <div>
    <!-- 修饰符写法 -->
    <button @click.stop="handleStop">阻止冒泡</button>
    <button @click.prevent="handlePrevent">阻止默认</button>
    <form @submit.prevent="handleSubmit(formData)">提交</form>

    <!-- v-on 写法 -->
    <button v-on:click="handleVon">V-on</button>

    <!-- 自定义事件 -->
    <my-component @custom-event="onCustomEvent" />
  </div>
</template>

<script setup>
// 全部正确识别并生成 👇
const handleStop = () => {};
const handlePrevent = () => {};
const handleSubmit = (formData) => {};
const handleVon = () => {};
const onCustomEvent = () => {};
</script>
```

---

### 🔥 Vue2 方法生成（三种写法）

**场景**：Options API methods 中生成方法

```vue
<template>
  <div>
    <button @click="fetchData">获取数据</button>
    <button @click="submitForm(formData)">提交表单</button>
    <input @change="onInputChange($event)" />
  </div>
</template>

<script>
export default {
  methods: {
    // 支持三种写法 👇

    // 写法1: ES6 简写
    fetchData() {},

    // 写法2: 传统 function
    submitForm: function (formData) {},

    // 写法3: 箭头函数
    onInputChange: (event) => {},
  },
};
</script>
```

**跳转支持** 🧭：

- ✅ 三种写法都能正确跳转
- ✅ 自动追加到 methods 末尾
- ✅ 智能处理逗号分隔

---

## 🧭 智能跳转示例

### 🎯 跳转到定义

**场景 1**：变量跳转

```vue
<template>
  <div>
    <!-- Ctrl/Cmd + 点击 userName -->
    <p>{{ userName }}</p>
  </div>
</template>

<script setup>
const userName = ref("张三"); // 👈 跳转到这里
</script>
```

**场景 2**：方法跳转

```vue
<template>
  <div>
    <!-- Ctrl + 点击 handleClick -->
    <button @click="handleClick">点击</button>
  </div>
</template>

<script setup>
const handleClick = () => {
  // 👈 跳转到这里
  console.log("clicked");
};
</script>
```

---

### 🔙 返回使用处

**操作流程**：

```
模板使用处
  ↓ (Ctrl+点击)
定义位置
  ↓ (Alt+←)
模板使用处 ✅
```

**快捷键**：

- Windows/Linux: `Alt + ←`
- macOS: `⌘ + ←`

---

### 📖 查看所有引用

**场景**：查看变量/方法在哪些地方被使用

```vue
<template>
  <div>
    <p>{{ count }}</p>
    <button @click="increment">+</button>
    <p>当前: {{ count }}</p>
  </div>
</template>

<script setup>
const count = ref(0); // 光标这里，按 Shift+F12

const increment = () => {
  count.value++; // 会列出所有使用 count 的地方
};
</script>
```

**操作**：

1. 📍 光标放在 `count` 定义处
2. ⌨️ 按 `Shift + F12`
3. 📋 弹出引用列表，显示所有使用位置

---

## 📋 复制路径示例

### 🚀 功能说明

快速复制 Vue 文件的相对路径，去除 `.vue` 后缀，方便用于路由配置、组件导入等场景。

---

### 📝 使用示例

**场景**：复制组件路径用于路由配置

```
文件位置: c:\project\src\views\user\Profile.vue

操作步骤:
1. 📂 打开 Profile.vue 文件
2. 🖱️ 右键点击编辑器
3. 📋 选择 "🚀 y66" → "📋 复制Vue页面路径"
4. ✅ 提示: "✅ 已复制路径: /src/views/user/Profile"
```

**复制的路径**：`/src/views/user/Profile`

**应用场景**：

```javascript
// 1️⃣ 路由配置
{
  path: '/user/profile',
  component: () => import('/src/views/user/Profile')
}

// 2️⃣ 组件导入
import UserProfile from '/src/views/user/Profile'

// 3️⃣ 动态导入
const componentPath = '/src/views/user/Profile'
```

---

### 🎯 路径格式说明

| 原始文件路径                           | 复制后的路径             |
| -------------------------------------- | ------------------------ |
| `c:\project\src\App.vue`               | `/src/App`               |
| `c:\project\src\components\Button.vue` | `/src/components/Button` |
| `c:\project\pages\index.vue`           | `/pages/index`           |

**特性**：

- ✅ 自动去除 `.vue` 后缀
- ✅ 统一使用正斜杠 `/`
- ✅ 相对于工作区根路径

---

## 🖨️ 快速打印示例

### 🚀 功能说明

快速插入 `console.log` 语句，自动包含行号、函数名和变量名，方便调试。

---

### 📝 基础使用

**场景**：快速打印单个变量

```javascript
const queryList = (page, limit) => {
  // 光标放在 page 上，按 Ctrl+Shift+L
  // 自动在下一行生成 👇
  console.log('🚀 ~ :2 ~ queryList ~ page:', page)
}
```

**操作步骤**：

1. 📍 将光标移到变量 `page` 上（或选中它）
2. ⌨️ 按下 `Ctrl + Shift + L`
3. ✅ 自动在下一行插入带函数名的 console.log

---

### 🎯 多光标批量打印

**场景**：同时打印多个变量

```javascript
// 使用 Ctrl+D 或 Alt+点击 选中多个变量
const queryList = (page, limit) => {
  // 选中 page 和 limit，按 Ctrl+Shift+L
  // 自动生成 👇
  console.log('🚀 ~ :2 ~ queryList ~ page:', page)
  console.log('🚀 ~ :2 ~ queryList ~ limit:', limit)
  
  setTimeout(() => {
    paging.value?.complete([1])
  }, 1000)
}
```

**操作步骤**：

1. 📍 选中第一个变量 `page`
2. ⌨️ 按 `Ctrl + D` 继续选中 `limit`（或用 `Alt + 点击`）
3. ⌨️ 按下 `Ctrl + Shift + L`
4. ✅ 为每个变量生成一行 console.log

---

### 🎨 输出格式说明

| 元素 | 说明 | 示例 |
| ---- | ---- | ---- |
| 🚀 | 标识符，方便搜索 | `🚀` |
| :行号 | 当前代码行号 | `:63` |
| 函数名 | 所在函数的名称 | `queryList` |
| 变量名 | 打印的变量名 | `page` |

**完整格式**：
```javascript
console.log('🚀 ~ :63 ~ queryList ~ page:', page)
//          │    │     │           │      └─ 变量值
//          │    │     │           └─ 变量名
//          │    │     └─ 函数名
//          │    └─ 行号
//          └─ 标识符
```

---

### 💡 支持的函数类型

```javascript
// ✅ 箭头函数
const handleClick = () => {
  console.log('🚀 ~ :2 ~ handleClick ~ data:', data)
}

// ✅ 普通函数
function fetchData() {
  console.log('🚀 ~ :2 ~ fetchData ~ response:', response)
}

// ✅ 对象方法简写
methods: {
  submitForm() {
    console.log('🚀 ~ :2 ~ submitForm ~ form:', form)
  }
}

// ✅ 对象方法
methods: {
  getData: function() {
    console.log('🚀 ~ :2 ~ getData ~ result:', result)
  }
}
```

---

### 🔥 实用技巧

**快速调试函数参数**：

```javascript
// 函数定义时，选中所有参数快速打印
const processOrder = (orderId, userId, items, options) => {
  // 多选 orderId, userId, items, options
  // 按 Ctrl+Shift+L 一次性生成所有打印
  console.log('🚀 ~ :2 ~ processOrder ~ orderId:', orderId)
  console.log('🚀 ~ :2 ~ processOrder ~ userId:', userId)
  console.log('🚀 ~ :2 ~ processOrder ~ items:', items)
  console.log('🚀 ~ :2 ~ processOrder ~ options:', options)
  
  // 业务逻辑...
}
```

**清理调试代码**：

搜索 `🚀` 可以快速找到所有调试打印语句，方便统一清理。

---

## 🏠 下班提醒

### 🚀 功能说明

在 VS Code 状态栏左下角显示下班倒计时，到点自动弹出提醒，让你准时下班！

---

### 📝 功能展示

**状态栏显示**：

```
>> 距离下班还有 2小时30分钟15秒
```

**到点后显示**：

```
🏠 已经下班啦 赶紧滚回家去
```

**弹窗提醒**：

到达下班时间时，会弹出通知：`🎉 到点啦 该下班了!`

---

### ⚙️ 配置说明

在 VS Code 设置中搜索 `gohome` 进行配置：

| 配置项 | 类型 | 默认值 | 说明 |
| ------ | ---- | ------ | ---- |
| `gohome.hour` | number | 18 | 下班时间 - 小时（24小时制） |
| `gohome.minute` | number | 0 | 下班时间 - 分钟 |

**配置示例**：

```json
// settings.json
{
  "gohome.hour": 18,      // 下午6点
  "gohome.minute": 30     // 30分
}
```

**常用下班时间配置**：

| 下班时间 | hour | minute |
| -------- | ---- | ------ |
| 17:30 | 17 | 30 |
| 18:00 | 18 | 0 |
| 18:30 | 18 | 30 |
| 19:00 | 19 | 0 |
| 21:00 | 21 | 0 |

---

### 💡 使用技巧

1. **查看倒计时**：直接看 VS Code 左下角状态栏
2. **修改下班时间**：`Ctrl + ,` 打开设置，搜索 `gohome`
3. **临时加班**：修改 `gohome.hour` 为更晚的时间

---

## 🎨 高级场景

### 🌈 复杂嵌套场景

**场景**：电商购物车数据结构

```vue
<template>
  <div class="cart">
    <!-- 商品信息 -->
    <div v-for="item in cart.items" :key="item.id">
      <p>{{ item.product.name }}</p>
      <p>{{ item.product.price }}</p>
      <img :src="item.product.images.thumbnail" />
    </div>

    <!-- 价格统计 -->
    <div class="summary">
      <p>小计: {{ cart.pricing.subtotal }}</p>
      <p>优惠: {{ cart.pricing.discount }}</p>
      <p>总计: {{ cart.pricing.total }}</p>
    </div>

    <!-- 配送信息 -->
    <div class="shipping">
      <p>{{ cart.shipping.address.city }}</p>
      <p>{{ cart.shipping.address.street }}</p>
      <p>{{ cart.shipping.method }}</p>
    </div>
  </div>
</template>

<script setup>
// 按需在各个字段上 Alt+Enter，自动生成完整结构 👇
const cart = ref({
  items: [],
  product: {
    name: "",
    price: "",
    images: {
      thumbnail: "",
    },
  },
  pricing: {
    subtotal: "",
    discount: "",
    total: "",
  },
  shipping: {
    address: {
      city: "",
      street: "",
    },
    method: "",
  },
});
</script>
```

**优势** 🎁：

- 🚀 无需手写深层嵌套
- 🎯 按需生成，逐步构建
- 🔧 自动维护结构一致性

---

### 🎭 Vue3 setup() 函数模式

**场景**：非 `<script setup>` 语法

```vue
<template>
  <div>
    <p>{{ message }}</p>
    <button @click="showMessage">显示</button>
  </div>
</template>

<script>
import { ref } from "vue";

export default {
  setup() {
    // Alt+Enter 在模板中的 message，自动生成 👇
    const message = ref("Hello");

    // Alt+Enter 在模板中的 showMessage，自动生成 👇
    const showMessage = () => {};

    // 自动确保返回对象包含新增的变量和方法 👇
    return {
      message,
      showMessage,
    };
  },
};
</script>
```

**智能处理**：

- ✅ 识别 `setup()` 函数
- ✅ 插入到 `return` 之前
- ✅ 自动更新返回对象

---

### 🔥 方法参数补全

**场景**：方法已存在但缺少参数

```vue
<template>
  <div>
    <!-- 原本只是 updateUser() -->
    <button @click="updateUser(userId, formData, options)">更新</button>
  </div>
</template>

<script setup>
// 原有方法（无参数）
const updateUser = () => {
  // ...
};

// Alt+Enter 后自动更新为 👇
const updateUser = (userId, formData, options) => {
  // ...
};
</script>
```

**智能识别**：

- 🔍 检测到方法已存在
- 📝 对比参数签名
- 🔧 自动补全缺失参数

---

## 💡 实用技巧

### ⚡ 快速开发流程

**推荐工作流**：

```
1. 📝 先写模板，专注于 UI 结构
   <p>{{ user.profile.name }}</p>
   <button @click="saveProfile(user)">保存</button>

2. 🎯 逐个按 Alt+Enter，自动生成数据和方法
   → const user = ref({ profile: { name: '' } })
   → const saveProfile = (user) => {}

3. 🔧 填充业务逻辑
   const saveProfile = (user) => {
     // 实现保存逻辑
   }

4. ✅ 测试与调试
```

**效率提升** 📈：

- 减少 60% 的重复代码编写
- 避免拼写错误
- 保持结构一致性

---

### 🎯 最佳实践

#### ✅ DO（推荐）

```vue
<!-- ✅ 使用有意义的命名 -->
<p>{{ userData.profile.displayName }}</p>

<!-- ✅ 方法名清晰表达意图 -->
<button @click="handleUserProfileUpdate">更新</button>

<!-- ✅ 先完整写完模板，再批量生成 -->
<template>
  <div>
    {{ a }}
    {{ b }}
    {{ c }}
  </div>
</template>
<!-- 然后依次 Alt+Enter -->
```

#### ❌ DON'T（避免）

```vue
<!-- ❌ 避免过度嵌套（超过4层） -->
<p>{{ a.b.c.d.e.f.g }}</p>

<!-- ❌ 避免无意义的命名 -->
<p>{{ temp1.data2.item3 }}</p>

<!-- ❌ 不要在不支持的文件中使用 -->
<!-- 仅支持 .vue, .js, .ts 文件 -->
```

---

### 🔍 调试技巧

**问题**：生成位置不符合预期

**解决方案**：

1. 检查文件格式（必须是 `.vue`）
2. 确认 Vue 版本检测正确（script setup / Options API）
3. 查看现有代码结构是否完整

**问题**：无法跳转到定义

**解决方案**：

1. 确认使用 `Ctrl/Cmd + 点击` 或 `F12`
2. 检查方法/变量确实已定义
3. 确认定义格式符合三种支持的写法

---

### 🎨 快捷键速查表

| 功能        | Windows/Linux         | macOS                |
| ----------- | --------------------- | -------------------- |
| 🎯 生成代码 | `Alt + Enter`         | `Alt + Enter`        |
| 🧭 跳转定义 | `Ctrl + 点击` / `F12` | `Cmd + 点击` / `F12` |
| 🔙 返回上层 | `Alt + ←`             | `Cmd + ←`            |
| 📖 查看引用 | `Shift + F12`         | `Shift + F12`        |
| 📋 复制路径 | 右键菜单              | 右键菜单             |
| 🖨️ 快速打印 | `Ctrl + Shift + L`    | `Ctrl + Shift + L`   |

---

### 🌟 组合技巧

**场景**：快速构建表单组件

```vue
<template>
  <div class="user-form">
    <!-- 步骤1: 快速搭建结构 -->
    <input v-model="form.username" />
    <input v-model="form.email" />
    <input v-model="form.phone" />

    <!-- 步骤2: 添加事件 -->
    <button @click="validateForm">验证</button>
    <button @click="submitForm(form)">提交</button>
    <button @click="resetForm">重置</button>

    <!-- 步骤3: 显示状态 -->
    <p v-if="status.loading">{{ status.message }}</p>
    <p v-if="status.error">{{ status.errorMsg }}</p>
  </div>
</template>

<script setup>
// 依次在各个字段上 Alt+Enter，快速生成 👇

const form = ref({
  username: "",
  email: "",
  phone: "",
});

const status = ref({
  loading: "",
  message: "",
  error: "",
  errorMsg: "",
});

const validateForm = () => {
  // TODO: 验证逻辑
};

const submitForm = (form) => {
  // TODO: 提交逻辑
};

const resetForm = () => {
  // TODO: 重置逻辑
};

// 🎉 完整表单架子搭建完成，只需填充业务逻辑！
</script>
```

---

## 🎊 总结

### 🏆 核心价值

- ⚡ **效率提升**：减少 60% 的模板代码编写
- 🎯 **零失误**：自动处理缩进、逗号、引号
- 🧠 **智能感知**：自动识别 Vue2/Vue3、嵌套层级
- 🔄 **无缝跳转**：定义与使用快速切换

---

### 📚 学习路径

```
入门阶段 🌱
├─ 单层变量生成
├─ 简单方法生成
└─ 基础跳转

进阶阶段 🌿
├─ 多层嵌套变量
├─ 带参数方法
└─ 复制路径功能

高级阶段 🌳
├─ 复杂数据结构设计
├─ 标量转对象
└─ 参数自动补全
```

---

### 🚀 开始你的高效开发之旅！

记住三个核心快捷键：

1. `Alt + Enter` - 生成一切 ✨
2. `Ctrl/Cmd + 点击` - 跳转定义 🧭
3. `Ctrl + Shift + L` - 快速打印 🖨️
4. `Alt + ←` - 快速返回 🔙

**Enjoy coding with Vue! 🎉💻🚀**
