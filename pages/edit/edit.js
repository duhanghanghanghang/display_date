// pages/add/add.js
const app = getApp()
const { request } = require('../../utils/request')

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

function mapItem(apiItem = {}) {
  const id = apiItem.id || apiItem._id
  return {
    id,
    _id: id,
    name: apiItem.name || '',
    category: apiItem.category || '',
    expireDate: apiItem.expire_date || apiItem.expireDate || '',
    note: apiItem.note || '',
    barcode: apiItem.barcode || '',
    productImage: apiItem.product_image || apiItem.productImage || '',
    quantity: apiItem.quantity || 1,
    teamId: apiItem.team_id || apiItem.teamId || null,
    notifiedAt: apiItem.notified_at || apiItem.notifiedAt || ''
  }
}

Page({
  data: {
    id: '',
    name: '',
    category: '',
    expireDate: '',
    note: '',
    barcode: '', // 条形码
    productImage: '', // 商品图片
    quantity: 1, // 件数，默认1
    isEdit: false,
    pushStatus: '未推送',
    
    // 常用分类
    categories: ['食品', '药品', '化妆品', '调味品', '证件', '饮料', '零食', '其他'],
    
    // 日期选择
    minDate: '',
    maxDate: '',
    
    // API配置
    apiKey: '91abc81fde78c04df860e64efdb47c00' // TianAPI密钥
  },

  async onLoad(options) {
    this.teamInfo = wx.getStorageSync('teamInfo') || null
    // 设置日期范围
    const today = new Date()
    const minDate = this.formatDate(today)
    const maxYear = today.getFullYear() + 10
    const maxDate = `${maxYear}-12-31`
    
    this.setData({ minDate, maxDate })

    // 如果有id参数，说明是编辑模式
    if (options.id) {
      this.loadItem(options.id)
    }
  },

  // 生成唯一ID
  generateId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  },

  // 加载物品信息（编辑模式）
  loadItem(id) {
    request({
      url: `/items/${id}`,
      method: 'GET'
    })
      .then((res) => {
        const item = mapItem(res)
        this.teamInfo = wx.getStorageSync('teamInfo') || null
        this.setData({
          id: item._id,
          name: item.name,
          category: item.category || '',
          expireDate: item.expireDate,
          note: item.note || '',
          barcode: item.barcode || '',
          productImage: item.productImage || '',
          quantity: item.quantity || 1,
          pushStatus: item.notifiedAt ? '已推送' : '未推送',
          isEdit: true
        })
        wx.setNavigationBarTitle({ title: '编辑物品' })
      })
      .catch((err) => {
        console.error('加载物品失败', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 标记为未推送
  async unnotify() {
    if (!this.data.id) return
    wx.showLoading({ title: '处理中', mask: true })
    try {
      await request({
        url: `/items/${this.data.id}/unnotify`,
        method: 'PATCH'
      })
      this.setData({ pushStatus: '未推送' })
      wx.showToast({ title: '已标记为未推送', icon: 'success' })
    } catch (err) {
      console.error('标记未推送失败', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 输入物品名称
  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  // 扫描条形码
  scanBarcode() {
    wx.scanCode({
      onlyFromCamera: false, // 允许从相册选择
      scanType: ['barCode'], // 只扫条形码
      success: (res) => {
        const barcode = res.result
        this.setData({ barcode })
        
        wx.showLoading({
          title: '识别中...',
          mask: true
        })
        
        // 先查询本地历史记录
        this.searchLocalHistory(barcode)
      },
      fail: (err) => {
        console.error('扫码失败', err)
        wx.showToast({
          title: '扫码失败',
          icon: 'none'
        })
      }
    })
  },

  // 查询本地历史记录
  searchLocalHistory(barcode) {
    const barcodeHistory = wx.getStorageSync('barcodeHistory') || {}
    
    if (barcodeHistory[barcode]) {
      // 本地有记录，直接使用
      wx.hideLoading()
      const product = barcodeHistory[barcode]
      
      this.setData({
        name: product.name,
        category: product.category,
        note: product.note,
        productImage: product.image
      })
      
      wx.showToast({
        title: '✅ 从历史记录识别',
        icon: 'none',
        duration: 2000
      })
    } else {
      // 本地没有，调用API
      this.queryProductInfo(barcode)
    }
  },

  // 保存到本地历史
  saveToLocalHistory(barcode, productData) {
    const barcodeHistory = wx.getStorageSync('barcodeHistory') || {}
    
    barcodeHistory[barcode] = {
      name: productData.name,
      category: productData.category,
      note: productData.note,
      image: productData.image,
      timestamp: Date.now()
    }
    
    wx.setStorageSync('barcodeHistory', barcodeHistory)
  },

  // 查询商品信息
  async queryProductInfo(barcode) {
    try {
      // 调用我们自己的后端接口（已集成多个API源）
      const data = await request({
        url: `/barcode/query?code=${barcode}`,
        method: 'GET'
      })
      
      wx.hideLoading()
      console.log('后端API返回:', data)
      
      if (data.found) {
        // 找到商品信息
        const productName = data.name || ''
        const productBrand = data.brand || ''
        const productImage = data.image || ''
        const category = this.guessCategory(productName, data.category)
        const note = productBrand ? `品牌: ${productBrand}` : ''
        
        const productData = {
          name: productName,
          category: category,
          note: note,
          image: productImage
        }
        
        this.setData({
          name: productName,
          category: category,
          note: note,
          productImage: productImage
        })
        
        // 保存到本地历史记录
        this.saveToLocalHistory(barcode, productData)
        
        wx.showToast({
          title: '✅ 识别成功',
          icon: 'none',
          duration: 2000
        })
      } else {
        // 未找到商品信息
        wx.showModal({
          title: '未找到商品信息',
          content: `条码：${barcode}\n\n数据库中暂无此商品信息，请手动输入商品名称\n\n提示：手动输入后，下次扫此条码会自动匹配`,
          showCancel: false
        })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('条形码查询失败:', err)
      
      wx.showModal({
        title: '查询失败',
        content: `条码：${barcode}\n\n网络请求失败，请检查网络连接后重试\n\n或手动输入商品名称`,
        showCancel: false
      })
    }
  },

  // 根据商品名称猜测分类
  guessCategory(name, apiCategory) {
    // 如果API返回了分类，优先使用
    if (apiCategory) {
      const categoryMap = {
        '纸巾': '其他',
        '饮料': '饮料',
        '零食': '零食',
        '食品': '食品',
        '药品': '药品',
        '化妆品': '化妆品'
      }
      if (categoryMap[apiCategory]) {
        return categoryMap[apiCategory]
      }
    }
    
    if (!name) return ''
    
    // 根据商品名称关键词猜测分类
    const foodKeywords = ['奶', '饮料', '零食', '饼干', '糖', '巧克力', '面包', '蛋糕', '水果', '肉', '蔬菜', '面', '米']
    const medicineKeywords = ['药', '片', '胶囊', '颗粒', '口服液', '药膏', '贴']
    const cosmeticKeywords = ['面霜', '乳液', '精华', '面膜', '口红', '香水', '洗面奶']
    const condimentKeywords = ['酱油', '醋', '油', '盐', '糖', '味精', '鸡精', '料酒']
    const beverageKeywords = ['可乐', '雪碧', '茶', '水', '汁', '奶茶']
    const tissueKeywords = ['纸巾', '卫生纸', '餐巾纸', '湿巾']
    
    for (let keyword of tissueKeywords) {
      if (name.includes(keyword)) return '其他'
    }
    for (let keyword of beverageKeywords) {
      if (name.includes(keyword)) return '饮料'
    }
    for (let keyword of foodKeywords) {
      if (name.includes(keyword)) return '食品'
    }
    for (let keyword of medicineKeywords) {
      if (name.includes(keyword)) return '药品'
    }
    for (let keyword of cosmeticKeywords) {
      if (name.includes(keyword)) return '化妆品'
    }
    for (let keyword of condimentKeywords) {
      if (name.includes(keyword)) return '调味品'
    }
    
    return '其他' // 默认为其他
  },

  // 输入条码
  onBarcodeInput(e) {
    this.setData({ barcode: e.detail.value })
  },

  // 输入分类
  onCategoryInput(e) {
    this.setData({ category: e.detail.value })
  },

  // 选择快捷分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ category })
  },

  // 选择日期
  onDateChange(e) {
    this.setData({ expireDate: e.detail.value })
  },

  // 输入备注
  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  // 上传图片
  uploadImage() {
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
                this.setData({ productImage: imageUrl })
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

  // 删除图片
  removeImage(e) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ productImage: '' })
          wx.showToast({
            title: '已删除',
            icon: 'success',
            duration: 1500
          })
        }
      }
    })
  },

  // 预览图片
  previewImage() {
    if (this.data.productImage) {
      wx.previewImage({
        urls: [this.data.productImage],
        current: this.data.productImage
      })
    }
  },

  // 输入件数
  onQuantityInput(e) {
    let value = parseInt(e.detail.value) || 1
    if (value < 1) value = 1
    if (value > 999) value = 999
    this.setData({ quantity: value })
  },

  // 件数加减
  adjustQuantity(e) {
    const action = e.currentTarget.dataset.action
    let quantity = this.data.quantity
    if (action === 'minus' && quantity > 1) {
      quantity--
    } else if (action === 'plus' && quantity < 999) {
      quantity++
    }
    this.setData({ quantity })
  },

  // 快速设置日期（今天起几天后）
  quickSetDate(e) {
    const days = parseInt(e.currentTarget.dataset.days)
    const date = new Date()
    date.setDate(date.getDate() + days)
    const expireDate = this.formatDate(date)
    this.setData({ expireDate })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 保存物品
  async saveItem() {
    if (this.saving) return
    this.saving = true
    wx.showLoading({ title: '保存中...', mask: true })
    const { id, name, category, expireDate, note, barcode, productImage, quantity, isEdit } = this.data
    let teamInfo = this.teamInfo
    // 验证
    if (!name.trim()) {
      wx.showToast({
        title: '请输入物品名称',
        icon: 'none'
      })
      return
    }

    if (!expireDate) {
      wx.showToast({
        title: '请选择过期日期',
        icon: 'none'
      })
      return
    }

    const teamId = teamInfo && teamInfo._id ? teamInfo._id : null

    const payload = {
      name: name.trim(),
      category: category.trim(),
      expire_date: expireDate,
      note: note.trim(),
      barcode: barcode || '',
      product_image: productImage || '',
      quantity: quantity || 1,
      teamId
    }

    if (isEdit && id) {
      try {
        await request({
          url: `/items/${id}`,
          method: 'PATCH',
          data: payload
        })
        wx.showToast({ title: '修改成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 800)
      } catch (err) {
        console.error('更新失败', err)
        wx.showToast({ title: '更新失败', icon: 'none' })
      }
    } else {
      try {
        await request({
          url: '/items',
          method: 'POST',
          data: payload
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
        if (barcode && name.trim()) {
          this.saveToLocalHistory(barcode, {
            name: name.trim(),
            category: category.trim(),
            note: note.trim(),
            image: productImage || ''
          })
        }
        this.afterAddSuccess(false)
      } catch (err) {
        console.error('添加失败', err)
        wx.showToast({ title: '添加失败', icon: 'none' })
      }
    }
    wx.hideLoading()
    this.saving = false
  },

  // 生成唯一ID
  generateId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  },

  // 添加/恢复后给用户选择返回首页或继续添加
  afterAddSuccess(isEdit) {
    if (isEdit) {
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    wx.showModal({
      title: '添加成功',
      content: '返回首页或继续添加？',
      confirmText: '返回首页',
      cancelText: '继续添加',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/index/index' })
        } else {
          this.resetForm()
        }
      }
    })
  },

  // 重置表单，便于继续添加
  resetForm() {
    this.setData({
      id: '',
      name: '',
      category: '',
      expireDate: '',
      note: '',
      barcode: '',
      productImage: '',
      quantity: 1,
      isEdit: false
    })
  },

  // 删除物品（编辑模式下）
  deleteItem() {
    if (this.deleting) return
    const { id, name } = this.data

    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${name}」吗？`,
      confirmColor: '#FF4444',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true })
          try {
            const openid = await app.ensureOpenId()
            await request({
              url: `/items/${id}/delete`,
              method: 'PATCH',
              data: { deletedBy: openid }
            })
            wx.showToast({ title: '删除成功', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 800)
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
  }
})

// 确保个人团队（无团队时创建一个）
Page.prototype.ensurePersonalTeam = async function () {
  const cached = wx.getStorageSync('teamInfo')
  if (cached && cached._id) {
    this.teamInfo = cached
    return cached
  }
  try {
    await app.ensureOpenId()
    const createdRes = await request({ url: '/teams?type=created', method: 'GET' })
    const existed = (createdRes.teams || []).map(mapTeam).find(t => t.name === '我的团队')
    if (existed) {
      wx.setStorageSync('teamInfo', existed)
      this.teamInfo = existed
      return existed
    }
    const newTeam = await request({
      url: '/teams',
      method: 'POST',
      data: { name: '我的团队' }
    })
    const teamInfo = mapTeam(newTeam)
    wx.setStorageSync('teamInfo', teamInfo)
    this.teamInfo = teamInfo
    return teamInfo
  } catch (err) {
    console.error('创建个人团队失败', err)
    wx.showToast({ title: '初始化团队失败', icon: 'none' })
    throw err
  }
}
