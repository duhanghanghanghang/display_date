// app.js
const { request, BASE_URL } = require('./utils/request')

App({
  async onLaunch() {
    // 初始化提醒设置
    const reminderSettings = wx.getStorageSync('reminderSettings')
    if (!reminderSettings || typeof reminderSettings.reminderDays !== 'number') {
      wx.setStorageSync('reminderSettings', { reminderDays: 3 })
    }
    // 登录获取 token/openid
    await this.ensureToken()
    // 同步后端提醒设置
    await this.syncReminderSettings()
    // 可选：检查过期物品（如需改为后端提醒，可移除）
    this.checkExpiredItems()
  },

  globalData: {
    openid: ''
  },

  // 获取并缓存 token
  async ensureToken() {
    const cached = wx.getStorageSync('token')
    if (cached) return cached
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
                const { token, openid } = resp.data || {}
                if (token) wx.setStorageSync('token', token)
                if (openid) {
                  wx.setStorageSync('openid', openid)
                  this.globalData.openid = openid
                }
                resolve(token)
              } else {
                wx.showToast({ title: '登录失败', icon: 'none' })
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
  },

  // 获取并缓存 openid
  async ensureOpenId() {
    if (this.globalData.openid) return this.globalData.openid
    const cached = wx.getStorageSync('openid')
    if (cached) {
      this.globalData.openid = cached
      return cached
    }
    await this.ensureToken()
    const stored = wx.getStorageSync('openid')
    if (stored) {
      this.globalData.openid = stored
      return stored
    }
    throw new Error('openid missing')
  },

  // 检查过期物品
  checkExpiredItems() {
    const items = wx.getStorageSync('items') || []
    const reminderDays = this.getReminderDays()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let expiredCount = 0
    let soonExpireCount = 0
    
    items.forEach(item => {
      const expireDate = new Date(item.expireDate)
      expireDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((expireDate - today) / (1000 * 60 * 60 * 24))
      
      if (diffDays < 0) {
        expiredCount++
      } else if (diffDays <= reminderDays) {
        soonExpireCount++
      }
    })
    
    // 如果有过期或即将过期的物品，显示提醒
    if (expiredCount > 0 || soonExpireCount > 0) {
      let message = ''
      if (expiredCount > 0) {
        message += `${expiredCount}件物品已过期`
      }
      if (soonExpireCount > 0) {
        if (message) message += '，'
        message += `${soonExpireCount}件物品即将过期`
      }
      
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 计算剩余天数
  calculateDaysRemaining(expireDateStr) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expireDate = new Date(expireDateStr)
    expireDate.setHours(0, 0, 0, 0)
    return Math.floor((expireDate - today) / (1000 * 60 * 60 * 24))
  },

  // 获取提醒天数（临期阈值）
  getReminderDays() {
    const settings = wx.getStorageSync('reminderSettings') || {}
    const reminderDays = Number(settings.reminderDays)
    return Number.isFinite(reminderDays) && reminderDays > 0 ? reminderDays : 3
  },

  // 与后端同步提醒天数（获取并写入本地）
  async syncReminderSettings() {
    try {
      const data = await request({ url: '/settings/me', method: 'GET' })
      if (data && typeof data.reminderDays === 'number') {
        wx.setStorageSync('reminderSettings', { reminderDays: data.reminderDays })
        return data.reminderDays
      }
    } catch (err) {
      console.warn('同步提醒设置失败', err)
    }
    return this.getReminderDays()
  },

  // 更新后端提醒设置并写入本地
  async updateReminderSettings(reminderDays) {
    await request({
      url: '/settings/me',
      method: 'PUT',
      data: { reminderDays: Number(reminderDays) || 3 }
    })
    wx.setStorageSync('reminderSettings', { reminderDays })
    return reminderDays
  },

  // 获取状态信息
  getStatusInfo(daysRemaining, reminderDaysParam) {
    const reminderDays = typeof reminderDaysParam === 'number' ? reminderDaysParam : this.getReminderDays()
    if (daysRemaining < 0) {
      return { text: '已过期', color: '#FF4444', bgColor: '#FFE5E5' }
    } else if (daysRemaining === 0) {
      return { text: '今天过期', color: '#FF6600', bgColor: '#FFF0E5' }
    } else if (daysRemaining <= reminderDays) {
      return { text: '即将过期', color: '#FF8800', bgColor: '#FFF5E5' }
    } else if (daysRemaining <= reminderDays + 4) {
      return { text: '注意', color: '#FFAA00', bgColor: '#FFFBE5' }
    } else {
      return { text: '正常', color: '#00AA00', bgColor: '#E5FFE5' }
    }
  }
})
