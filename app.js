// app.js
App({
  onLaunch() {
    // 初始化本地存储
    const items = wx.getStorageSync('items')
    if (!items) {
      wx.setStorageSync('items', [])
    }
    
    // 检查过期物品并提醒
    this.checkExpiredItems()
  },

  globalData: {
    // 全局数据
  },

  // 检查过期物品
  checkExpiredItems() {
    const items = wx.getStorageSync('items') || []
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
      } else if (diffDays <= 3) {
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

  // 获取状态信息
  getStatusInfo(daysRemaining) {
    if (daysRemaining < 0) {
      return { text: '已过期', color: '#FF4444', bgColor: '#FFE5E5' }
    } else if (daysRemaining === 0) {
      return { text: '今天过期', color: '#FF6600', bgColor: '#FFF0E5' }
    } else if (daysRemaining <= 3) {
      return { text: '即将过期', color: '#FF8800', bgColor: '#FFF5E5' }
    } else if (daysRemaining <= 7) {
      return { text: '注意', color: '#FFAA00', bgColor: '#FFFBE5' }
    } else {
      return { text: '正常', color: '#00AA00', bgColor: '#E5FFE5' }
    }
  }
})
