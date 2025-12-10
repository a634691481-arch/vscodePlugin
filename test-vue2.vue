<template>
  <div>
    <h1>Vue 2 测试</h1>
    <button @click="handleClick">点击</button>
    <button @click="submitForm">提交</button>
    <view @click="changeName">改变名称</view>
  </div>
</template>

<script>
export default {
  name: "TestVue2",
  data() {
    return {
      message: "Hello",
    };
  },
  methods: {
    handleClick() {
      // TODO: 实现方法逻辑
    },
    submitForm() {
      // TODO: 实现方法逻辑
    },
    changeName() {
      // TODO: 实现方法逻辑
    },
  },
};
</script>

<style scoped>
h1 {
  color: blue;
}
</style>
