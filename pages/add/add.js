// pages/add/add.js
const app = getApp()

Page({
  data: {
    id: '',
    name: '',
    category: '',
    expireDate: '',
    note: '',
    barcode: '', // 条形码
    productImage: '', // 商品图片
    isEdit: false,
    
    // 常用分类
    categories: ['食品', '药品', '化妆品', '调味品', '证件', '饮料', '零食', '其他'],
    
    // 日期选择
    minDate: '',
    maxDate: '',
    
    // API配置
    apiKey: '91abc81fde78c04df860e64efdb47c00' // TianAPI密钥
  },

  onLoad(options) {
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

  // 加载物品信息（编辑模式）
  loadItem(id) {
    const items = wx.getStorageSync('items') || []
    const item = items.find(i => i.id === id)
    
    if (item) {
      this.setData({
        id: item.id,
        name: item.name,
        category: item.category || '',
        expireDate: item.expireDate,
        note: item.note || '',
        barcode: item.barcode || '',
        isEdit: true
      })
      
      wx.setNavigationBarTitle({
        title: '编辑物品'
      })
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
  queryProductInfo(barcode) {
    const { apiKey } = this.data
    
    // 检查是否配置了API Key
    if (!apiKey || apiKey === 'YOUR_TIANAPI_KEY') {
      wx.hideLoading()
      wx.showModal({
        title: '提示',
        content: '请先在代码中配置TianAPI的key\n\n1. 访问 tianapi.com 注册账号\n2. 获取API key\n3. 在 add.js 中替换 YOUR_TIANAPI_KEY',
        showCancel: false
      })
      return
    }
    
    wx.request({
      url: 'https://apis.tianapi.com/barcode/index',
      method: 'GET',
      data: {
        key: apiKey,
        barcode: barcode
      },
      success: (res) => {
        wx.hideLoading()
        
        console.log('API返回:', res.data)
        
        if (res.data.code === 200 && res.data.result) {
          const product = res.data.result
          
          // 自动填充商品信息（兼容不同字段名）
          const productName = product.name || product.goodsname || ''
          const productBrand = product.brand || ''
          const productSpec = product.spec || ''
          const productImage = product.goods_pic || product.image || ''
          const category = this.guessCategory(productName)
          const note = `${productBrand} ${productSpec}`.trim()
          
          this.setData({
            name: productName,
            category: category,
            note: note,
            productImage: productImage
          })
          
          // 保存到本地历史记录
          this.saveToLocalHistory(barcode, {
            name: productName,
            category: category,
            note: note,
            image: productImage
          })
          
          wx.showToast({
            title: '✅ 识别成功',
            icon: 'none',
            duration: 2000
          })
        } else {
          // 识别失败，保留条码号，让用户手动输入
          wx.showModal({
            title: '未找到商品信息',
            content: `条码：${barcode}\n\n数据库中暂无此商品信息，请手动输入商品名称\n\n提示：手动输入后，下次扫此条码会自动匹配`,
            showCancel: false
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('API请求失败', err)
        
        wx.showModal({
          title: '查询失败',
          content: `条码：${barcode}\n\n网络请求失败，请手动输入商品名称`,
          showCancel: false
        })
      }
    })
  },

  // 根据商品名称猜测分类
  guessCategory(name) {
    if (!name) return ''
    
    const foodKeywords = ['奶', '饮料', '零食', '饼干', '糖', '巧克力', '面包', '蛋糕', '水果', '肉', '蔬菜']
    const medicineKeywords = ['药', '片', '胶囊', '颗粒', '口服液', '药膏', '贴']
    const cosmeticKeywords = ['面霜', '乳液', '精华', '面膜', '口红', '香水', '洗面奶']
    const condimentKeywords = ['酱油', '醋', '油', '盐', '糖', '味精', '鸡精', '料酒']
    
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
    
    return '食品' // 默认为食品
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
  saveItem() {
    const { id, name, category, expireDate, note, barcode, productImage, isEdit } = this.data

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

    let items = wx.getStorageSync('items') || []

    if (isEdit) {
      // 编辑模式：更新物品
      const index = items.findIndex(i => i.id === id)
      if (index !== -1) {
        items[index] = {
          ...items[index],
          name: name.trim(),
          category: category.trim(),
          expireDate,
          note: note.trim(),
          updateDate: this.formatDate(new Date())
        }
      }
    } else {
      // 新增模式：添加物品
      const newItem = {
        id: this.generateId(),
        name: name.trim(),
        category: category.trim(),
        expireDate,
        note: note.trim(),
        barcode: barcode || '', // 保存条码
        productImage: productImage || '', // 保存商品图片
        addDate: this.formatDate(new Date())
      }
      items.push(newItem)
      
      // 如果手动输入了商品名（有条码但API没识别到），保存到本地历史
      if (barcode && name.trim()) {
        this.saveToLocalHistory(barcode, {
          name: name.trim(),
          category: category.trim(),
          note: note.trim(),
          image: productImage || ''
        })
      }
    }

    // 保存到本地存储
    wx.setStorageSync('items', items)

    wx.showToast({
      title: isEdit ? '修改成功' : '添加成功',
      icon: 'success'
    })

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack()
    }, 1000)
  },

  // 生成唯一ID
  generateId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  },

  // 删除物品（编辑模式下）
  deleteItem() {
    const { id, name } = this.data

    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${name}」吗？`,
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

          setTimeout(() => {
            wx.navigateBack()
          }, 1000)
        }
      }
    })
  }
})
