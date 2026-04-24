const { BASE_URL } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')

const app = getApp()

function phoneValid(p) {
  return /^1\d{10}$/.test(p || '')
}

Page({
  data: {
    phone: '',
    smsCode: '',
    codeSending: false,
    countdown: 0
  },

  onShow() {
    const openid = wx.getStorageSync('openid')
    if (openid) {
      wx.reLaunch({ url: '/pages/wardrobe/wardrobe' })
    }
  },

  onPhone(e) {
    this.setData({ phone: (e.detail.value || '').replace(/\D/g, '').slice(0, 11) })
  },

  onCode(e) {
    this.setData({ smsCode: (e.detail.value || '').replace(/\D/g, '').slice(0, 6) })
  },

  onSendCode() {
    const { phone, countdown } = this.data
    if (countdown > 0) return
    if (!phoneValid(phone)) {
      showToast('请输入正确手机号', 'none')
      return
    }
    this.setData({ codeSending: true })
    setTimeout(() => {
      this.setData({ codeSending: false })
      showToast('已发送（演示可填 123456）', 'none')
      let t = 60
      this.setData({ countdown: t })
      this._timer = setInterval(() => {
        t--
        this.setData({ countdown: t })
        if (t <= 0 && this._timer) {
          clearInterval(this._timer)
          this._timer = null
        }
      }, 1000)
    }, 200)
  },

  onPhoneLogin() {
    const { phone, smsCode } = this.data
    if (!phoneValid(phone)) {
      showToast('请输入正确手机号', 'none')
      return
    }
    if (!smsCode || smsCode.length < 4) {
      showToast('请输入验证码', 'none')
      return
    }
    wx.request({
      url: `${BASE_URL}/login/phone`,
      method: 'POST',
      data: { phone, smsCode },
      header: { 'Content-Type': 'application/json' },
      success: resp => {
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          const { openid } = resp.data || {}
          if (openid) {
            wx.setStorageSync('openid', openid)
            app.globalData.openid = openid
            wx.reLaunch({ url: '/pages/wardrobe/wardrobe' })
            return
          }
        }
        const err = resp.data?.message || '登录失败'
        showToast(String(err), 'none')
      },
      fail: () => showToast('网络异常', 'none')
    })
  },

  onWxLogin() {
    wx.login({
      success: res => {
        if (!res.code) {
          showToast('获取微信 code 失败', 'none')
          return
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
                app.globalData.openid = openid
                wx.reLaunch({ url: '/pages/wardrobe/wardrobe' })
                return
              }
            }
            const err = resp.data?.message || '登录失败'
            showToast(String(err), 'none')
          },
          fail: () => showToast('网络异常', 'none')
        })
      }
    })
  }
})
