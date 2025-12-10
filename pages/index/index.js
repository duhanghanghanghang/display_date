// pages/index/index.js
const app = getApp()
const { request } = require('../../utils/request')

function normalizeItem(apiItem = {}) {
  const id = apiItem.id || apiItem._id
  return {
    ...apiItem,
    id,
    _id: id,
    expireDate: apiItem.expireDate || apiItem.expire_date || '',
    productImage: apiItem.productImage || apiItem.product_image || ''
  }
}

function mapTeam(apiTeam = {}) {
  return {
    id: apiTeam.id || apiTeam._id,
    _id: apiTeam.id || apiTeam._id,
    name: apiTeam.name || '我的团队',
    inviteCode: apiTeam.invite_code || apiTeam.inviteCode || '',
    ownerOpenId: apiTeam.owner_openid || apiTeam.ownerOpenId,
    memberOpenIds: apiTeam.member_openids || apiTeam.memberOpenIds || []
  }
}

Page({
  data: {
    items: [],
    filterType: 'all', // all, expired, warning, normal
    sortBy: 'expireDate', // expireDate, addDate, name
    isEmpty: true,
    reminderDays: 3,
    teamInfo: null,
    hasTeam: false,
    loginReady: false,
    userOpenId: '',
    loading: false,
    pendingSyncCount: 0,
    // 统计数据
    totalCount: 0,
    expiredCount: 0,
    warningCount: 0,
    touchStartX: 0
  },

  async onLoad() {
    await this.initTeam()
  },

  async onShow() {
    // 每次显示页面时刷新数据
    app.checkExpiredItems()
    await this.initTeam()
    this.loadItems()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadItems().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async initTeam() {
    try {
      const openid = await app.ensureOpenId()
      this.setData({
        teamInfo: null,
        hasTeam: false,
        userOpenId: openid,
        loginReady: true
      })
      return null
    } catch (err) {
      console.error('初始化个人空间失败', err)
      wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' })
      this.setData({ loginReady: false })
      return null
    }
  },

  // 加载物品列表
  async loadItems() {
    // 避免并发或重复触发的重复请求
    if (this._loadingItems) return
    this._loadingItems = true
    this.setData({ loading: true })

    const openid = await app.ensureOpenId()
    let items = []
    try {
      const res = await request({
        url: '/items',
        method: 'GET',
        data: { teamId: '' } // 个人空间
      })
      items = res.items || []

      const reminderDays = app.getReminderDays()
      // 计算每个物品的剩余天数和状态
      items = items.map(item => {
        const id = item.id || item._id || ''
        const rawExpire = item.expireDate || item.expire_date || ''
        const expireDate = normalizeDate(rawExpire)
        const daysRemaining = expireDate ? app.calculateDaysRemaining(expireDate) : null
        const statusInfo = app.getStatusInfo(daysRemaining, reminderDays)
        return {
          ...item,
          id,
          _id: id,
          ...item,
          expireDate,
          expireDisplay: expireDate || '无日期',
          daysRemaining,
          statusText: statusInfo.text,
          statusColor: statusInfo.color,
          statusBgColor: statusInfo.bgColor
        }
      })

      // 计算统计数据
      const totalCount = items.length
      const expiredCount = items.filter(item => item.daysRemaining < 0).length
      const warningCount = items.filter(item => item.daysRemaining >= 0 && item.daysRemaining <= reminderDays).length

      // 筛选
      items = this.filterItems(items, reminderDays)
      
      // 排序（按过期日期升序，最先过期的在前面）
      items.sort((a, b) => a.daysRemaining - b.daysRemaining)

      this.setData({
        items,
        isEmpty: items.length === 0,
        totalCount,
        expiredCount,
        warningCount,
        reminderDays
      })
    } catch (err) {
      console.error('加载云端物品失败', err)
      wx.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
      this.setData({ items: [], isEmpty: true })
    } finally {
      this._loadingItems = false
      this.setData({ loading: false })
    }
  },

  // 快捷添加按钮
  goToQuickAdd() {
    this.goToAdd()
  },

  // 筛选物品
  filterItems(items, reminderDays) {
    const { filterType } = this.data
    const threshold = reminderDays || app.getReminderDays()
    switch (filterType) {
      case 'expired':
        return items.filter(item => item.daysRemaining < 0)
      case 'warning':
        return items.filter(item => item.daysRemaining >= 0 && item.daysRemaining <= threshold)
      case 'normal':
        return items.filter(item => item.daysRemaining > threshold)
      default:
        return items
    }
  },

  // 切换筛选类型
  onFilterChange(e) {
    const filterType = e.currentTarget.dataset.type
    this.setData({ filterType })
    this.loadItems()
  },

  // 跳转到添加页面
  goToAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    })
  },

  // 跳转到我的页面
  goToMine() {
    wx.switchTab({
      url: '/pages/mine/mine'
    })
  },

  // 编辑物品
  editItem(e) {
    const id = e.currentTarget.dataset.id
    if (!id) {
      wx.showToast({ title: '数据异常，请重试', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/add/add?id=${id}`
    })
  },

  // 删除物品
  deleteItem(e) {
    if (this.deleting) return
    this.deleting = true
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i._id === id || i.id === id)
    if (!item) {
      this.deleting = false
      wx.showToast({ title: '数据异常，请重试', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${item.name}」吗？`,
      confirmColor: '#FF4444',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true })
          try {
            await request({
              url: `/items/${id}/delete`,
              method: 'PATCH'
            })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadItems()
          } catch (err) {
            console.error('删除失败', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
          wx.hideLoading()
        } else {
          this.deleting = false
          return
        }
        this.deleting = false
      }
    })
  },

  // 长按显示操作菜单
  showActionSheet(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i._id === id || i.id === id)
    if (!item) {
      wx.showToast({ title: '数据异常，请重试', icon: 'none' })
      return
    }
    
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 编辑
          wx.navigateTo({
            url: `/pages/add/add?id=${id}`
          })
        } else if (res.tapIndex === 1) {
          // 删除
          this.deleteItem({ currentTarget: { dataset: { id } } })
        }
      }
    })
  },

  // 手势滑动切换筛选标签（右滑到下一个，左滑回上一个）
  onTouchStart(e) {
    this.setData({ touchStartX: e.changedTouches[0].pageX })
  },
  onTouchEnd(e) {
    const endX = e.changedTouches[0].pageX
    const deltaX = endX - this.data.touchStartX
    const threshold = 50
    if (Math.abs(deltaX) < threshold) return
    const order = ['all', 'expired', 'warning', 'normal']
    const current = this.data.filterType
    const idx = order.indexOf(current)
    if (deltaX > 0 && idx < order.length - 1) {
      const next = order[idx + 1]
      this.setData({ filterType: next })
      this.loadItems()
    } else if (deltaX < 0 && idx > 0) {
      const prev = order[idx - 1]
      this.setData({ filterType: prev })
      this.loadItems()
    }
  }
})

function normalizeDate(expireDate) {
  if (!expireDate) return ''
  // 仅保留年月日
  const m = expireDate.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m && m[1]) return m[1]
  return expireDate
}
