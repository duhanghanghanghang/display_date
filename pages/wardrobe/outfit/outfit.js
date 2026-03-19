// pages/wardrobe/outfit/outfit.js
const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')

const OCCASIONS = ['上班', '休闲', '约会', '运动', '旅行', '居家', '其他']
const SEASONS = ['春', '夏', '秋', '冬']

Page({
  data: {
    categories: [],
    allItems: {},
    selectedItems: {},
    selectedCount: 0,
    selectedForPreview: [],
    showSaveDialog: false,
    outfitName: '',
    outfitOccasion: '',
    outfitSeason: '',
    savedOutfits: [],
    editingOutfitId: '',
    occasions: OCCASIONS,
    seasons: SEASONS,
    loading: true
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const [catRes, itemsRes, outfitRes] = await Promise.all([
        request({ url: '/wardrobe/categories', method: 'GET' }),
        request({ url: '/wardrobe/items', method: 'GET', data: { size: 100 } }),
        request({ url: '/wardrobe/outfits', method: 'GET' })
      ])

      const allItems = {}
      const itemMap = {}
      ;(itemsRes.items || []).forEach(item => {
        const cid = item.categoryId || ''
        if (!allItems[cid]) allItems[cid] = []
        allItems[cid].push(item)
        itemMap[item.id] = item
      })
      const categories = (catRes.categories || [])
        .filter(cat => (cat.count || 0) > 0)
        .map(cat => {
          const items = allItems[cat.id] || []
          return { ...cat, itemCount: items.length, items }
        })

      const savedOutfits = (outfitRes.outfits || []).map(o => {
        const imgs = this._getOutfitPreviewImages(o.items, itemMap)
        return {
          ...o,
          previewImages: imgs,
          previewImage: imgs[0] || '',
          itemCount: Object.keys(o.items || {}).length
        }
      })

      this.setData({
        categories,
        allItems,
        savedOutfits,
        loading: false
      })
    } catch (err) {
      console.error('加载数据失败:', err)
      showToast('加载失败', 'error')
      this.setData({ loading: false })
    }
  },

  selectItem(e) {
    const { categoryId, itemId } = e.currentTarget.dataset
    const { selectedItems, allItems, categories } = this.data
    const next = { ...selectedItems }
    if (next[categoryId] === itemId) delete next[categoryId]
    else next[categoryId] = itemId
    const preview = this._buildPreview(next, allItems, categories)
    this.setData({ selectedItems: next, selectedCount: Object.keys(next).length, selectedForPreview: preview })
  },

  _buildPreview(selectedItems, allItems, categories) {
    const list = []
    ;(categories || []).forEach(cat => {
      const itemId = selectedItems[cat.id]
      if (!itemId) return
      const items = allItems[cat.id] || []
      const item = items.find(i => i.id === itemId)
      if (item) list.push({ categoryName: cat.name, item })
    })
    return list
  },

  _getOutfitPreviewImages(items, itemMap) {
    if (!items || !itemMap) return []
    return Object.values(items)
      .map(id => itemMap[id]?.imageUrl)
      .filter(Boolean)
  },

  showSave() {
    if (Object.keys(this.data.selectedItems).length === 0) {
      showToast('请先选择衣服', 'error')
      return
    }
    this.setData({
      showSaveDialog: true,
      editingOutfitId: '',
      outfitName: '',
      outfitOccasion: '',
      outfitSeason: ''
    })
  },

  closeSaveDialog() {
    this.setData({ showSaveDialog: false, editingOutfitId: '' })
  },

  stopPropagation() {},

  onOutfitNameInput(e) {
    this.setData({ outfitName: e.detail.value })
  },
  onOutfitOccasionInput(e) {
    this.setData({ outfitOccasion: e.detail.value })
  },
  onOutfitSeasonInput(e) {
    this.setData({ outfitSeason: e.detail.value })
  },

  async saveOutfit() {
    const { outfitName, outfitOccasion, outfitSeason, selectedItems, editingOutfitId } = this.data
    if (!outfitName || !outfitName.trim()) {
      showToast('请输入搭配名称', 'error')
      return
    }
    const payload = {
      name: outfitName.trim(),
      items: { ...selectedItems },
      occasion: outfitOccasion?.trim() || null,
      season: outfitSeason?.trim() || null
    }
    try {
      if (editingOutfitId) {
        await request({
          url: `/wardrobe/outfits/${editingOutfitId}`,
          method: 'PATCH',
          data: payload
        })
        showToast('修改成功', 'success')
      } else {
        await request({
          url: '/wardrobe/outfits',
          method: 'POST',
          data: payload
        })
        showToast('保存成功', 'success')
      }
      this.closeSaveDialog()
      this.loadData()
    } catch (err) {
      showToast(err?.data?.message || '保存失败', 'error')
    }
  },

  loadOutfit(e) {
    const { outfit } = e.currentTarget.dataset
    const items = outfit.items || {}
    const preview = this._buildPreview(items, this.data.allItems, this.data.categories)
    this.setData({ selectedItems: items, selectedCount: Object.keys(items).length, selectedForPreview: preview })
    showToast('已加载搭配', 'success')
  },

  showEditOutfit(e) {
    const { outfit } = e.currentTarget.dataset
    const items = outfit.items || {}
    const preview = this._buildPreview(items, this.data.allItems, this.data.categories)
    this.setData({
      showSaveDialog: true,
      editingOutfitId: outfit.id,
      outfitName: outfit.name || '',
      outfitOccasion: outfit.occasion || '',
      outfitSeason: outfit.season || '',
      selectedItems: items,
      selectedCount: Object.keys(items).length,
      selectedForPreview: preview
    })
  },

  async deleteOutfit(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '提示',
      content: '确定要删除这个搭配吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({ url: `/wardrobe/outfits/${id}`, method: 'DELETE' })
          showToast('删除成功', 'success')
          this.loadData()
        } catch (err) {
          showToast('删除失败', 'error')
        }
      }
    })
  },

  // 清除所有选择
  clearSelection() {
    this.setData({ selectedItems: {}, selectedCount: 0, selectedForPreview: [] })
    showToast('已清空', 'success')
  },

  onImageError() {}
})
