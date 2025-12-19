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
    productImage: apiItem.productImage || apiItem.product_image || '',
    quantity: apiItem.quantity || 1
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
    touchStartX: 0,
    // 编辑模态框
    showEditModal: false,
    editingItem: null,
    editForm: {
      id: '',
      name: '',
      category: '',
      expireDate: '',
      note: '',
      quantity: 1,
      productImage: ''
    },
    categories: ['食品', '药品', '化妆品', '调味品', '证件', '饮料', '零食', '其他']
  },

  async onLoad() {
    await this.initTeam()
  },

  async onShow() {
    // 每次显示页面时刷新数据
    // app.checkExpiredItems()  // 已禁用自动提示，改为页面顶部显示过期数量
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
        const pushed = !!item.notifiedAt
        return {
          ...item,
          id,
          _id: id,
          ...item,
          expireDate,
          expireDisplay: expireDate || '无日期',
          pushStatus: pushed ? '已推送' : '未推送',
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

  // 编辑物品 - 弹出模态框
  editItem(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i._id === id || i.id === id)
    
    if (!item) {
      wx.showToast({ title: '数据异常，请重试', icon: 'none' })
      return
    }
    
    // 设置编辑表单数据
    this.setData({
      showEditModal: true,
      editingItem: item,
      editForm: {
        id: item.id || item._id,
        name: item.name,
        category: item.category || '',
        expireDate: item.expireDate || item.expire_date || '',
        note: item.note || '',
        quantity: item.quantity || 1,
        productImage: item.productImage || ''
      }
    })
  },

  // 上传模态框图片
  uploadModalImage() {
    const app = getApp()
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        wx.showLoading({
          title: '上传中...',
          mask: true
        })
        
        // 获取openid用于认证
        const openid = wx.getStorageSync('openid')
        if (!openid) {
          wx.showToast({ title: '请先登录', icon: 'none' })
          return
        }
        
        wx.uploadFile({
          url: `${app.globalData.baseURL}/upload/product-image`,
          filePath: tempFilePath,
          name: 'file',
          header: {
            'X-OpenId': openid
          },
          success: (uploadRes) => {
            wx.hideLoading()
            console.log('📤 上传响应状态:', uploadRes.statusCode)
            console.log('📤 上传响应数据:', uploadRes.data)
            
            // 检查HTTP状态码
            if (uploadRes.statusCode !== 200) {
              console.error('❌ 上传失败，HTTP状态码:', uploadRes.statusCode)
              wx.showToast({
                title: `上传失败(${uploadRes.statusCode})`,
                icon: 'none',
                duration: 2000
              })
              return
            }
            
            try {
              const data = JSON.parse(uploadRes.data)
              console.log('📦 解析后的数据:', data)
              
              if (data.code === 200 && data.data) {
                const imageUrl = `${app.globalData.baseURL}${data.data.url}`
                console.log('✅ 图片URL:', imageUrl)
                this.setData({ 'editForm.productImage': imageUrl })
                wx.showToast({
                  title: '上传成功',
                  icon: 'success',
                  duration: 1500
                })
              } else {
                console.error('❌ 业务错误:', data.message, 'code:', data.code)
                wx.showToast({
                  title: data.message || '上传失败',
                  icon: 'none',
                  duration: 2000
                })
              }
            } catch (e) {
              console.error('❌ 解析响应失败:', e, '原始数据:', uploadRes.data)
              wx.showToast({
                title: '数据解析失败',
                icon: 'none',
                duration: 2000
              })
            }
          },
          fail: (error) => {
            wx.hideLoading()
            console.error('❌ 上传请求失败:', error)
            console.error('错误详情:', JSON.stringify(error))
            wx.showToast({
              title: error.errMsg || '网络请求失败',
              icon: 'none',
              duration: 2000
            })
          }
        })
      }
    })
  },

  // 删除模态框图片
  removeModalImage(e) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ 'editForm.productImage': '' })
          wx.showToast({
            title: '已删除',
            icon: 'success',
            duration: 1500
          })
        }
      }
    })
  },

  // 预览模态框图片
  previewModalImage() {
    if (this.data.editForm.productImage) {
      wx.previewImage({
        urls: [this.data.editForm.productImage],
        current: this.data.editForm.productImage
      })
    }
  },

  // 关闭编辑模态框
  closeEditModal() {
    this.setData({
      showEditModal: false,
      editingItem: null,
      editForm: {
        id: '',
        name: '',
        category: '',
        expireDate: '',
        note: '',
        quantity: 1
      }
    })
  },

  // 编辑表单输入
  onEditNameInput(e) {
    this.setData({ 'editForm.name': e.detail.value })
  },
  onEditCategoryInput(e) {
    this.setData({ 'editForm.category': e.detail.value })
  },
  onEditNoteInput(e) {
    this.setData({ 'editForm.note': e.detail.value })
  },
  onEditDateChange(e) {
    this.setData({ 'editForm.expireDate': e.detail.value })
  },
  onEditQuantityInput(e) {
    let value = parseInt(e.detail.value) || 1
    if (value < 1) value = 1
    if (value > 999) value = 999
    this.setData({ 'editForm.quantity': value })
  },
  adjustEditQuantity(e) {
    const action = e.currentTarget.dataset.action
    let quantity = this.data.editForm.quantity
    if (action === 'minus' && quantity > 1) {
      quantity--
    } else if (action === 'plus' && quantity < 999) {
      quantity++
    }
    this.setData({ 'editForm.quantity': quantity })
  },
  selectEditCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ 'editForm.category': category })
  },

  // 保存编辑
  async saveEdit() {
    const { editForm } = this.data
    
    if (!editForm.name.trim()) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' })
      return
    }
    
    if (!editForm.expireDate) {
      wx.showToast({ title: '请选择过期日期', icon: 'none' })
      return
    }
    
    wx.showLoading({ title: '保存中...', mask: true })
    
    try {
      await request({
        url: `/items/${editForm.id}`,
        method: 'PATCH',
        data: {
          name: editForm.name.trim(),
          category: editForm.category.trim(),
          expire_date: editForm.expireDate,
          note: editForm.note.trim(),
          quantity: editForm.quantity || 1,
          product_image: editForm.productImage || ''
        }
      })
      
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.closeEditModal()
      this.loadItems() // 刷新列表
    } catch (err) {
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 删除物品（从模态框）
  async deleteFromModal() {
    const { editForm, editingItem } = this.data
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${editingItem.name}」吗？`,
      confirmColor: '#FF4444',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true })
          try {
            await request({
              url: `/items/${editForm.id}/delete`,
              method: 'PATCH'
            })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.closeEditModal()
            this.loadItems()
          } catch (err) {
            console.error('删除失败', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
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
    // 主流交互：右滑切到前一个，左滑切到后一个
    if (deltaX > 0 && idx > 0) {
      const prev = order[idx - 1]
      this.setData({ filterType: prev })
      this.loadItems()
    } else if (deltaX < 0 && idx < order.length - 1) {
      const next = order[idx + 1]
      this.setData({ filterType: next })
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
