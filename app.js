// app.js - 智能衣橱：启动时微信 wx.login 换取 openid，请求头携带 X-OpenId
const { BASE_URL } = require('./utils/config')

App({
  globalData: {
    openid: '',
    baseURL: BASE_URL
  },

  async onLaunch() {
    wx.removeStorageSync('token')
    try {
      await this.ensureOpenId()
    } catch (e) {
      console.error('ensureOpenId failed', e)
    }
  },

  /**
   * 与市面常规做法一致：wx.login 得 code，后端用 code 换 openid
   * 各页可在需要时再次调用以刷新态
   */
  ensureOpenId() {
    if (this.globalData.openid) {
      return Promise.resolve(this.globalData.openid)
    }
    const cached = wx.getStorageSync('openid')
    if (cached) {
      this.globalData.openid = cached
      return Promise.resolve(cached)
    }
    return new Promise((resolve, reject) => {
      wx.login({
        success: res => {
          if (!res.code) {
            wx.showToast({ title: '微信登录失败', icon: 'none' })
            return reject(new Error('no code'))
          }
          wx.request({
            url: `${BASE_URL}/login`,
            method: 'POST',
            data: { code: res.code },
            header: { 'Content-Type': 'application/json' },
            success: resp => {
              if (resp.statusCode >= 200 && resp.statusCode < 300) {
                const { openid } = resp.data || {}
                if (openid) {
                  wx.setStorageSync('openid', openid)
                  this.globalData.openid = openid
                  resolve(openid)
                } else {
                  wx.showToast({ title: '未获取到 openid', icon: 'none' })
                  reject(new Error('no openid'))
                }
              } else {
                const err = resp.data?.message || '登录失败'
                wx.showToast({ title: err, icon: 'none' })
                reject(resp)
              }
            },
            fail: err => {
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
