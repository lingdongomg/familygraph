App({
  onLaunch() {
    // 自有服务器模式：无需 wx.cloud.init
    // 登录在 auth.ensureLogin() 中按需触发
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false
  }
})
