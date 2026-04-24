// app.js - 智能衣橱：登录后使用 X-OpenId
const { BASE_URL } = require('./utils/request')

App({
  onLaunch() {
    wx.removeStorageSync('token')
    const openid = wx.getStorageSync('openid')
    if (openid) {
      this.globalData.openid = openid
    }
  },

  globalData: {
    openid: '',
    baseURL: BASE_URL
  }
})
