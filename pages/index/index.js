// pages/index/index.js
const app = getApp()

Page({
  data: {
    items: [],
    filterType: 'all', // all, expired, warning, normal
    sortBy: 'expireDate', // expireDate, addDate, name
    isEmpty: true,
    // 统计数据
    totalCount: 0,
    expiredCount: 0,
    warningCount: 0
  },

  onLoad() {
    this.loadItems()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadItems()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadItems()
    wx.stopPullDownRefresh()
  },

  // 加载物品列表
  loadItems() {
    let items = wx.getStorageSync('items') || []
    
    // 计算每个物品的剩余天数和状态
    items = items.map(item => {
      const daysRemaining = app.calculateDaysRemaining(item.expireDate)
      const statusInfo = app.getStatusInfo(daysRemaining)
      return {
        ...item,
        daysRemaining,
        statusText: statusInfo.text,
        statusColor: statusInfo.color,
        statusBgColor: statusInfo.bgColor
      }
    })

    // 计算统计数据
    const totalCount = items.length
    const expiredCount = items.filter(item => item.daysRemaining < 0).length
    const warningCount = items.filter(item => item.daysRemaining >= 0 && item.daysRemaining <= 7).length

    // 筛选
    items = this.filterItems(items)
    
    // 排序（按过期日期升序，最先过期的在前面）
    items.sort((a, b) => a.daysRemaining - b.daysRemaining)

    this.setData({
      items,
      isEmpty: items.length === 0,
      totalCount,
      expiredCount,
      warningCount
    })
  },

  // 筛选物品
  filterItems(items) {
    const { filterType } = this.data
    switch (filterType) {
      case 'expired':
        return items.filter(item => item.daysRemaining < 0)
      case 'warning':
        return items.filter(item => item.daysRemaining >= 0 && item.daysRemaining <= 7)
      case 'normal':
        return items.filter(item => item.daysRemaining > 7)
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

  // 编辑物品
  editItem(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/add/add?id=${id}`
    })
  },

  // 删除物品
  deleteItem(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i.id === id)
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${item.name}」吗？`,
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          let items = wx.getStorageSync('items') || []
          items = items.filter(i => i.id !== id)
          wx.setStorageSync('items', items)
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
          
          this.loadItems()
        }
      }
    })
  },

  // 长按显示操作菜单
  showActionSheet(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i.id === id)
    
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
  }
})
