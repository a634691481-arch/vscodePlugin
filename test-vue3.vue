<template>
  <div>
    <h1>Vue 3 测试</h1>

    <!-- 测试方法调用 -->
    <button @click="handleClick">点击</button>
    <button @click="submitForm">提交</button>
    <view @click="changeName">改变名称</view>
    <input @input="handleInput" />
    <!-- 参数变量名称 -->
    <p>{{ inputValue }}</p>
    <!-- 测试参数传递 -->
    <button @click="handleClick(inputValue)">点击传递参数</button>
  </div>
</template>

<script setup>
import { ref } from "vue";

const inputValue = ref("");

const submitForm = () => {
  // TODO: 实现方法逻辑
};
const changeName = () => {
  // TODO: 实现方法逻辑
};
const handleInput = () => {
  // TODO: 实现方法逻辑
};
const handleClick = () => {
  // TODO: 实现方法逻辑
};
</script>

<style scoped>
h1 {
  color: green;
}
</style>
