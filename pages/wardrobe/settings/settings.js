const { showToast } = require('../../../utils/toast')

Page({
  data: { notifyOn: true },

  onLoad() {
    const n = wx.getStorageSync('notifyOn')
    if (typeof n === 'boolean') {
      this.setData({ notifyOn: n })
    }
  },

  onNotify(e) {
    const v = e.detail.value
    this.setData({ notifyOn: v })
    try {
      wx.setStorageSync('notifyOn', v)
    } catch (e) {}
  },

  onPrivacy() {
    showToast('权限说明在小程序协议中', 'none')
  },

  noop() {
    showToast('敬请期待', 'none')
  }
})
