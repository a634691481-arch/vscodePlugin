<template>
  <div>
    <!-- 测试各种方法调用形式 -->
    <button @click="handleClick">点击按钮</button>
    <button @click="submitForm()">提交表单</button>
    <div v-on:click="changeName">改变名称</div>
    <input @input="handleInput" />
    <form @submit.prevent="handleSubmit">
      <button type="submit">提交</button>
    </form>
  </div>
</template>

<script setup>
const changeName = () => {
  // TODO: 实现方法逻辑
};

const handleInput = () => {
  // TODO: 实现方法逻辑
};
</script>
