// app.js - 衣柜管理小程序
const { request, BASE_URL } = require('./utils/request')

App({
  async onLaunch() {
    wx.removeStorageSync('token')
    await this.ensureOpenId()
  },

  globalData: {
    openid: '',
    baseURL: BASE_URL
  },

  async ensureOpenId() {
    if (this.globalData.openid) return this.globalData.openid
    const cached = wx.getStorageSync('openid')
    if (cached) {
      this.globalData.openid = cached
      return cached
    }
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (!res.code) {
            wx.showToast({ title: '登录失败', icon: 'none' })
            return reject(new Error('no code'))
          }
          wx.request({
            url: `${BASE_URL}/login`,
            method: 'POST',
            data: { code: res.code },
            success: (resp) => {
              if (resp.statusCode >= 200 && resp.statusCode < 300) {
                const { openid } = resp.data || {}
                if (openid) {
                  wx.setStorageSync('openid', openid)
                  this.globalData.openid = openid
                  resolve(openid)
                } else {
                  wx.showToast({ title: '登录失败：未获取到 openid', icon: 'none' })
                  reject(new Error('no openid'))
                }
              } else {
                const errorMsg = resp.data?.detail || resp.data?.message || '登录失败'
                wx.showToast({ title: errorMsg, icon: 'none' })
                reject(resp)
              }
            },
            fail: (err) => {
              wx.showToast({ title: '网络异常', icon: 'none' })
              reject(err)
            }
          })
        },
        fail: reject
      })
    })
  }
})
