// pages/wardrobe/wardrobe.js
const app = getApp()
const { request } = require('../../utils/request')
const { showToast, ToastDuration } = require('../../utils/toast')

Page({
  data: {
    categories: [],
    showCategoryDialog: false,
    newCategoryName: '',
    showOutfitBtn: true,
    showAddItemDialog: false,
    selectedCategoryId: '',
    itemForm: {
      name: '',
      imageUrl: ''
    }
  },

  onLoad() {
    this.loadCategories()
  },

  onShow() {
    this.loadCategories()
  },

  async loadCategories() {
    try {
      const res = await request({
        url: '/wardrobe/categories',
        method: 'GET'
      })
      
      // 显示所有分类，包括空的
      this.setData({ categories: res.categories })
    } catch (err) {
      console.error('加载分类失败:', err)
      showToast('加载失败', 'error')
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

  // 跳转到虚拟试衣
  goToOutfit() {
    wx.navigateTo({
      url: '/pages/wardrobe/outfit/outfit'
    })
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
      itemForm: {
        name: '',
        imageUrl: ''
      }
    })
  },

  // 关闭添加衣服对话框
  closeAddItemDialog() {
    this.setData({ showAddItemDialog: false })
  },

  // 选择分类
  onCategoryChange(e) {
    this.setData({
      selectedCategoryId: this.data.categories[e.detail.value].id
    })
  },

  // 输入衣服名称
  onItemNameInput(e) {
    this.setData({
      'itemForm.name': e.detail.value
    })
  },

  // 上传图片
  async chooseItemImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const tempFilePath = res.tempFilePaths[0]
      
      wx.showLoading({ title: '上传中...', mask: true })
      
      const uploadRes = await wx.uploadFile({
        url: `${app.globalData.baseURL}/upload/product-image`,
        filePath: tempFilePath,
        name: 'file',
        header: {
          'X-OpenId': wx.getStorageSync('openid')
        }
      })

      wx.hideLoading()
      
      const data = JSON.parse(uploadRes.data)
      if (data.url) {
        this.setData({ 'itemForm.imageUrl': data.url })
        showToast('上传成功', 'success')
      }
    } catch (err) {
      wx.hideLoading()
      console.error('图片上传失败:', err)
      showToast('上传失败', 'error')
    }
  },

  // 移除图片
  removeItemImage() {
    this.setData({ 'itemForm.imageUrl': '' })
  },

  // 保存衣服
  async saveItem() {
    const { selectedCategoryId, itemForm } = this.data

    if (!itemForm.name || !itemForm.name.trim()) {
      showToast('请输入衣服名称', 'error')
      return
    }

    if (!itemForm.imageUrl) {
      showToast('请上传衣服图片', 'error')
      return
    }

    try {
      await request({
        url: '/wardrobe/items',
        method: 'POST',
        data: {
          categoryId: selectedCategoryId,
          name: itemForm.name.trim(),
          imageUrl: itemForm.imageUrl
        }
      })

      showToast('添加成功', 'success')
      this.closeAddItemDialog()
      this.loadCategories()
    } catch (err) {
      console.error('添加失败:', err)
      showToast(err.message || '添加失败', 'error')
    }
  }
})
