<template>
  <div>
    <!-- 测试各种情况 -->
    <button @click="handleClick">点击按钮</button>
    <button @click="submitForm()">提交表单</button>
    <div v-on:click="changeName">改变名称</div>
    <input @input="handleInput" />
    <form @submit.prevent="handleSubmit">
      <button type="submit">提交</button>
    </form>

    <!-- 测试光标放在不同位置 -->
    <div @click="testMethod">光标放在 t 后面</div>
    <div @click="testMethod">光标放在 ) 前面</div>
    <div @click="testMethod()">带括号的情况</div>
  </div>
</template>

const testMethod = () => { // TODO: 实现方法逻辑 }

<script setup></script>
