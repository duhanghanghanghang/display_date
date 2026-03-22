// pages/wardrobe/wardrobe.js
const app = getApp()
const { request } = require('../../utils/request')
const { ImageUploader } = require('../../utils/imageUploader')

// 直接使用 wx.showToast，避免导入问题
function showToast(title, icon = 'none', duration = 1500) {
  wx.showToast({ title, icon, duration })
}

Page({
  data: {
    categories: [],
    showCategoryDialog: false,
    newCategoryName: '',
    showAddItemDialog: false,
    selectedCategoryId: '',
    selectedCategoryIndex: 0,
    itemForm: { name: '', imageUrl: '', price: '' },
    savedOutfits: []
  },

  onLoad() {
    this.loadCategories()
    this.loadSavedOutfits()
  },

  onShow() {
    this.loadCategories()
    this.loadSavedOutfits()
  },

  async loadCategories() {
    try {
      const res = await request({ url: '/wardrobe/categories', method: 'GET' })
      this.setData({ categories: res.categories || [] })
    } catch (err) {
      showToast('加载失败', 'error')
    }
  },

  async loadSavedOutfits() {
    try {
      const [outfitRes, itemsRes, catRes] = await Promise.all([
        request({ url: '/wardrobe/outfits', method: 'GET' }),
        request({ url: '/wardrobe/items', method: 'GET', data: { size: 100 } }),
        request({ url: '/wardrobe/categories', method: 'GET' })
      ])
      const outfits = outfitRes.outfits || []
      const items = itemsRes.items || []
      const categories = catRes.categories || []
      const itemMap = {}
      items.forEach(i => { itemMap[i.id] = i })

      const savedOutfits = outfits.map(o => {
        const previewImages = []
        let validCount = 0
        if (o.items && categories.length > 0) {
          categories.forEach(cat => {
            const itemId = o.items[cat.id]
            if (itemId && itemMap[itemId]?.imageUrl) {
              validCount++
              if (previewImages.length < 3) previewImages.push(itemMap[itemId].imageUrl)
            }
          })
        }
        if (previewImages.length === 0 && o.items) {
          Object.values(o.items).forEach(id => {
            if (itemMap[id]?.imageUrl) {
              validCount++
              if (previewImages.length < 3) previewImages.push(itemMap[id].imageUrl)
            }
          })
        }
        return { ...o, previewImages, previewImage: previewImages[0] || '', itemCount: validCount }
      })
      this.setData({ savedOutfits })
    } catch (err) {
      this.setData({ savedOutfits: [] })
    }
  },

  // 显示添加分类对话框
  showAddCategory() {
    this.setData({ 
      showCategoryDialog: true,
      newCategoryName: ''
    })
  },

  // 关闭对话框
  closeCategoryDialog() {
    this.setData({ showCategoryDialog: false })
  },

  // 阻止冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 输入分类名称
  onCategoryNameInput(e) {
    this.setData({ newCategoryName: e.detail.value })
  },

  // 创建分类
  async createCategory() {
    const { newCategoryName } = this.data
    
    if (!newCategoryName || !newCategoryName.trim()) {
      showToast('请输入标签名称', 'error')
      return
    }

    try {
      await request({
        url: '/wardrobe/categories',
        method: 'POST',
        data: { name: newCategoryName.trim() }
      })
      
      showToast('创建成功', 'success')
      this.closeCategoryDialog()
      this.loadCategories()
    } catch (err) {
      console.error('创建分类失败:', err)
      showToast(err.message || '创建失败', 'error')
    }
  },

  // 跳转到分类下的衣服列表
  goToCategoryItems(e) {
    const { id, name } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/wardrobe/add/add?categoryId=${id}&categoryName=${encodeURIComponent(name)}`
    })
  },

  // 跳转到分类管理
  goToCategory() {
    wx.navigateTo({ url: '/pages/wardrobe/category/category' })
  },

  // 跳转到全部衣服列表
  goToItemList() {
    wx.navigateTo({ url: '/pages/wardrobe/item-list/item-list' })
  },

  goToOutfit(e) {
    const outfit = e?.currentTarget?.dataset?.outfit
    let url = '/pages/wardrobe/outfit/outfit'
    if (outfit && outfit.id) {
      url += '?outfitId=' + outfit.id
    }
    wx.navigateTo({ url })
  },

  // 显示添加衣服对话框
  showAddItem() {
    if (this.data.categories.length === 0) {
      showToast('请先添加标签', 'error')
      return
    }
    
    this.setData({
      showAddItemDialog: true,
      selectedCategoryId: this.data.categories[0].id,
      selectedCategoryIndex: 0,
      itemForm: {
        name: '',
        imageUrl: '',
        price: ''
      }
    })
  },

  // 关闭添加衣服对话框
  closeAddItemDialog() {
    this.setData({ showAddItemDialog: false })
  },

  // 选择分类
  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      selectedCategoryIndex: index,
      selectedCategoryId: this.data.categories[index].id
    })
  },

  // 输入衣服名称
  onItemNameInput(e) {
    this.setData({
      'itemForm.name': e.detail.value
    })
  },

  // 输入价格
  onItemPriceInput(e) {
    this.setData({
      'itemForm.price': e.detail.value
    })
  },

  // 上传图片（使用通用工具）
  async chooseItemImage() {
    try {
      console.log('🎯 开始上传衣服图片...')
      const imageUrl = await ImageUploader.chooseAndUploadWardrobe({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      console.log('✅ 图片URL已保存到表单:', imageUrl)
      this.setData({ 
        'itemForm.imageUrl': imageUrl 
      }, () => {
        console.log('✅ setData完成，当前imageUrl:', this.data.itemForm.imageUrl)
      })
      
    } catch (err) {
      console.error('❌ 图片上传失败:', err)
      // 错误已在 ImageUploader 中处理，这里只记录日志
    }
  },

  // 移除图片
  removeItemImage() {
    this.setData({ 'itemForm.imageUrl': '' })
    showToast('已移除图片', 'success')
  },

  // 预览图片
  previewItemImage() {
    if (this.data.itemForm.imageUrl) {
      ImageUploader.preview(this.data.itemForm.imageUrl)
    }
  },

  // 保存衣服
  async saveItem() {
    const { selectedCategoryId, itemForm } = this.data

    console.log('🔍 表单数据检查:', {
      selectedCategoryId,
      itemForm: itemForm,
      name: itemForm.name,
      imageUrl: itemForm.imageUrl
    })

    // 验证表单
    if (!itemForm.name || !itemForm.name.trim()) {
      showToast('请输入衣服名称', 'error')
      return
    }

    if (!itemForm.imageUrl) {
      showToast('请上传衣服图片', 'error')
      return
    }

    try {
      wx.showLoading({ title: '保存中...', mask: true })
      
      const requestData = {
        categoryId: selectedCategoryId,
        name: itemForm.name.trim(),
        imageUrl: itemForm.imageUrl,
        price: itemForm.price ? parseFloat(itemForm.price) : null
      }
      
      console.log('📝 发送请求:', requestData)

      const res = await request({
        url: '/wardrobe/items',
        method: 'POST',
        data: requestData
      })

      console.log('✅ 保存成功响应:', res)
      
      wx.hideLoading()
      showToast('添加成功', 'success')
      
      // 关闭弹窗
      this.closeAddItemDialog()
      
      // 延迟刷新，确保toast显示
      setTimeout(() => {
        this.loadCategories()
      }, 1500)
      
    } catch (err) {
      wx.hideLoading()
      console.error('❌ 保存失败:', err)
      showToast(err.message || '保存失败', 'error')
    }
  }
})
