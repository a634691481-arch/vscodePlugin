<template>
  <div>
    <div>
      <!-- 单层变量 -->
      {{ userName }}

      <!-- 多层嵌套变量 -->
      {{ user.profile.name }}
      {{ user.profile.age }}
      {{ statsBuffer.ddddddddddddddddddd }}
      {{ statsBuffer.aaaaaaaaaa }}

      <!-- 已存在的变量 -->
      {{ message }}

      <!-- 方法调用 -->
      <view @click="getTheFile">获取文件</view>
      <view @click="getList">获取列表</view>
      <view @click="viewDetails(k)">查看详情</view>
      <view @click="viewList(x, xx, xxx, xxxx)">查看列表</view>

      <!-- 未定义的方法 -->
      <button @click="handleClick">点击按钮</button>
      <button @click="submitForm()">提交表单</button>
      <div v-on:click="changeName">改变名称</div>
    </div>
  </div>
</template>

<script>
export default {
  name: "TestVue2",
  data() {
    return {
      statsBuffer: { ddddddddddddddddddd: "", aaaaaaaaaa: "" },
      user: { profile: { name: "", age: "" } },
      userName: "",
      //
    };
  },
  methods: {
    //

    getTheFile() {
      // TODO: 实现方法逻辑
    },

    getList() {
      // TODO: 实现方法逻辑
    },

    viewDetails(k) {
      // TODO: 实现方法逻辑
    },

    viewList(x, xx, xxx, xxxx) {
      // TODO: 实现方法逻辑
    },
  },
};
</script>

<style lang="scss" scoped></style>
