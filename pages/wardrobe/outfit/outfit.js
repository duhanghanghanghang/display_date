// pages/wardrobe/outfit/outfit.js
const app = getApp()
const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')

Page({
  data: {
    categories: [],
    allItems: {},
    selectedItems: {
      // 结构：{ categoryId: itemId }
    },
    avatarParts: {
      // 虚拟人物各部位的图片URL
    },
    showSaveDialog: false,
    outfitName: '',
    savedOutfits: []
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    try {
      // 加载分类
      const catRes = await request({
        url: '/wardrobe/categories',
        method: 'GET'
      })
      
      const categories = catRes.categories.filter(cat => cat.count > 0)
      this.setData({ categories })

      // 加载所有衣服
      const itemsRes = await request({
        url: '/wardrobe/items',
        method: 'GET'
      })

      // 按分类组织衣服
      const allItems = {}
      itemsRes.items.forEach(item => {
        if (!allItems[item.categoryId]) {
          allItems[item.categoryId] = []
        }
        allItems[item.categoryId].push(item)
      })
      
      this.setData({ allItems })

      // 加载已保存的搭配
      const outfitRes = await request({
        url: '/wardrobe/outfits',
        method: 'GET'
      })
      this.setData({ savedOutfits: outfitRes.outfits })
    } catch (err) {
      console.error('加载数据失败:', err)
      showToast('加载失败', 'error')
    }
  },

  // 选择某个分类的衣服
  selectItem(e) {
    const { categoryId, itemId } = e.currentTarget.dataset
    const { selectedItems } = this.data

    if (selectedItems[categoryId] === itemId) {
      // 取消选择
      delete selectedItems[categoryId]
    } else {
      // 选择
      selectedItems[categoryId] = itemId
    }

    this.setData({ selectedItems: { ...selectedItems } })
  },

  // 显示保存搭配对话框
  showSave() {
    const selectedCount = Object.keys(this.data.selectedItems).length
    if (selectedCount === 0) {
      showToast('请先选择衣服', 'error')
      return
    }
    
    this.setData({ 
      showSaveDialog: true,
      outfitName: ''
    })
  },

  closeSaveDialog() {
    this.setData({ showSaveDialog: false })
  },

  onOutfitNameInput(e) {
    this.setData({ outfitName: e.detail.value })
  },

  // 保存搭配方案
  async saveOutfit() {
    const { outfitName, selectedItems } = this.data

    if (!outfitName || !outfitName.trim()) {
      showToast('请输入搭配名称', 'error')
      return
    }

    try {
      await request({
        url: '/wardrobe/outfits',
        method: 'POST',
        data: {
          name: outfitName.trim(),
          items: selectedItems
        }
      })

      showToast('保存成功', 'success')
      this.closeSaveDialog()
      this.loadData()
    } catch (err) {
      console.error('保存失败:', err)
      showToast('保存失败', 'error')
    }
  },

  // 加载已保存的搭配
  loadOutfit(e) {
    const { outfit } = e.currentTarget.dataset
    this.setData({ selectedItems: outfit.items })
    showToast('已加载搭配', 'success')
  },

  // 删除搭配
  async deleteOutfit(e) {
    const { id } = e.currentTarget.dataset

    const res = await wx.showModal({
      title: '提示',
      content: '确定要删除这个搭配吗？'
    })

    if (res.confirm) {
      try {
        await request({
          url: `/wardrobe/outfits/${id}`,
          method: 'DELETE'
        })
        showToast('删除成功', 'success')
        this.loadData()
      } catch (err) {
        console.error('删除失败:', err)
        showToast('删除失败', 'error')
      }
    }
  },

  // 清除所有选择
  clearSelection() {
    this.setData({ selectedItems: {} })
    showToast('已清空', 'success')
  }
})
