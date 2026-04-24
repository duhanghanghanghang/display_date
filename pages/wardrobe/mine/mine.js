const { showToast } = require('../../../utils/toast')
const app = getApp()

Page({
  goSettings() {
    wx.navigateTo({ url: '/pages/wardrobe/settings/settings' })
  },

  goStats() {
    wx.navigateTo({ url: '/pages/wardrobe/stats/stats' })
  },

  goIdle() {
    wx.navigateTo({ url: '/pages/wardrobe/cleanup/cleanup' })
  },

  async onLogout() {
    const { confirm } = await wx.showModal({
      title: '提示',
      content: '将清除本地登录态并重新通过微信授权。确定继续？'
    })
    if (!confirm) return
    try {
      wx.removeStorageSync('openid')
    } catch (e) {}
    if (app) app.globalData.openid = ''
    showToast('已重新发起授权', 'none')
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/wardrobe/wardrobe' })
    }, 300)
  }
})
