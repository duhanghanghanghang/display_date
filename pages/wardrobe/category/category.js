// pages/wardrobe/category/category.js
const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')

Page({
  data: {
    categories: [],
    loading: true,
    showAddModal: false,
    addName: ''
  },

  onLoad() {
    this.loadCategories()
  },

  onShow() {
    this.loadCategories()
  },

  async loadCategories() {
    this.setData({ loading: true })
    try {
      const res = await request({ url: '/wardrobe/categories', method: 'GET' })
      this.setData({ categories: res.categories || [], loading: false })
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  showAdd() {
    this.setData({ showAddModal: true, addName: '' })
  },

  hideAdd() {
    this.setData({ showAddModal: false })
  },

  stopPropagation() {
    // 阻止点击弹窗内容时冒泡到 mask，避免误关闭
  },

  onAddNameInput(e) {
    this.setData({ addName: e.detail.value })
  },

  async submitAdd() {
    const name = this.data.addName?.trim()
    if (!name) {
      showToast('请输入分类名称', 'error')
      return
    }
    try {
      await request({
        url: '/wardrobe/categories',
        method: 'POST',
        data: { name, sortOrder: this.data.categories.length }
      })
      this.setData({ showAddModal: false, addName: '' })
      showToast('添加成功', 'success')
      this.loadCategories()
    } catch (err) {}
  },

  showEdit(e) {
    const cat = e.currentTarget.dataset.cat
    if (!cat) return
    const name = encodeURIComponent(cat.name || '')
    wx.navigateTo({
      url: `/pages/wardrobe/category-edit/category-edit?id=${cat.id}&name=${name}`
    })
  },

  async deleteCategory(e) {
    const cat = e.currentTarget.dataset.cat
    if (cat.count > 0) {
      showToast('请先移出或删除该分类下的衣服', 'error')
      return
    }
    wx.showModal({
      title: '确认删除',
      content: `确定删除分类「${cat.name}」？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await request({
              url: `/wardrobe/categories/${cat.id}`,
              method: 'DELETE'
            })
            showToast('已删除', 'success')
            this.loadCategories()
          } catch (err) {}
        }
      }
    })
  },

  goItemList(e) {
    const categoryId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/wardrobe/item-list/item-list?category_id=${categoryId}` })
  }
})
