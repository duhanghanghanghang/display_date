// pages/wardrobe/wardrobe.js
const app = getApp()
const { request } = require('../../utils/request')
const { showToast, ToastDuration } = require('../../utils/toast')

Page({
  data: {
    categories: [],
    showCategoryDialog: false,
    newCategoryName: '',
    showOutfitBtn: true
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
      
      // 只显示数量大于0的分类
      const categories = res.categories.filter(cat => cat.count > 0)
      this.setData({ categories })
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
  }
})
