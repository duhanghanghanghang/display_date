const { showToast } = require('../../../utils/toast')
const app = getApp()

Page({
  onShow() {
    if (!wx.getStorageSync('openid')) {
      wx.reLaunch({ url: '/pages/wardrobe/login/login' })
    }
  },

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
      content: '确定要退出吗？'
    })
    if (!confirm) return
    try {
      wx.removeStorageSync('openid')
    } catch (e) {}
    app.globalData.openid = ''
    showToast('已退出', 'success')
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/wardrobe/login/login' })
    }, 400)
  }
})
