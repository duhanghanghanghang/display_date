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
    currentOutfitId: '',
    currentOutfitName: '',
    occasions: OCCASIONS,
    seasons: SEASONS,
    loading: true
  },

  onLoad(options) {
    this._preloadOutfitId = options.outfitId || ''
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
      ;(itemsRes.items || []).forEach(raw => {
        if (!raw || !raw.id) return
        const name = raw.name || ''
        const item = { ...raw, placeholderText: name.substring(0, 2) || '?' }
        const cid = item.categoryId || ''
        if (!allItems[cid]) allItems[cid] = []
        allItems[cid].push(item)
        itemMap[item.id] = item
      })
      const categories = (catRes.categories || [])
        .filter(cat => (cat.count || 0) > 0)
        .map(cat => {
          const items = (allItems[cat.id] || []).filter(i => i && i.id)
          return { ...cat, itemCount: items.length, items, expanded: false }
        })

      const savedOutfits = (outfitRes.outfits || []).map(o => {
        const imgs = this._getOutfitPreviewImages(o.items, itemMap, categories)
        const previewImages = imgs.slice(0, 3)
        return {
          ...o,
          previewImages,
          previewImage: imgs[0] || '',
          itemCount: Object.keys(o.items || {}).length
        }
      })

      let selectedItems = {}
      let selectedForPreview = []
      let currentOutfitId = ''
      let currentOutfitName = ''
      const preloadId = this._preloadOutfitId
      if (preloadId) {
        const outfit = savedOutfits.find(o => o.id === preloadId)
        if (outfit && outfit.items) {
          selectedItems = { ...outfit.items }
          selectedForPreview = this._buildPreview(selectedItems, allItems, categories)
          currentOutfitId = outfit.id
          currentOutfitName = outfit.name || ''
        }
      }

      this.setData({
        categories,
        allItems,
        savedOutfits,
        selectedItems,
        selectedCount: Object.keys(selectedItems).length,
        selectedForPreview,
        currentOutfitId,
        currentOutfitName,
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
    if (Object.keys(next).length > 0) {
      this.saveOutfitImmediate(next)
    }
  },

  _buildPreview(selectedItems, allItems, categories) {
    const list = []
    ;(categories || []).forEach(cat => {
      const itemId = selectedItems[cat.id]
      if (!itemId) return
      const items = allItems[cat.id] || []
      const item = items.find(i => i && i.id === itemId)
      if (item) {
        const name = item.name || ''
        list.push({ categoryName: cat.name, item: { ...item }, placeholderText: (name.substring(0, 2) || '?') })
      }
    })
    return list
  },

  onPreviewImageError(e) {
    const id = e.currentTarget.dataset.id
    const { selectedForPreview } = this.data
    const next = selectedForPreview.map(p => (p.item.id === id ? { ...p, item: { ...p.item, _imgFailed: true } } : p))
    this.setData({ selectedForPreview: next })
  },

  toggleCategoryExpand(e) {
    const id = e.currentTarget.dataset.id
    const { categories } = this.data
    const next = categories.map(c => (c.id === id ? { ...c, expanded: !c.expanded } : c))
    this.setData({ categories: next })
  },

  onChipImageError(e) {
    const { categoryId, itemId } = e.currentTarget.dataset
    const { categories, allItems } = this.data
    const nextCat = categories.map(cat => {
      if (cat.id !== categoryId) return cat
      return { ...cat, items: cat.items.map(it => (it.id === itemId ? { ...it, _imgFailed: true, placeholderText: it.placeholderText || ((it.name || '').substring(0, 2)) || '?' } : it)) }
    })
    const nextAll = { ...allItems }
    if (nextAll[categoryId]) {
      nextAll[categoryId] = nextAll[categoryId].map(it => (it.id === itemId ? { ...it, _imgFailed: true } : it))
    }
    const preview = this._buildPreview(this.data.selectedItems, nextAll, nextCat)
    this.setData({ categories: nextCat, allItems: nextAll, selectedForPreview: preview })
  },

  _getOutfitPreviewImages(items, itemMap, categories) {
    if (!items || !itemMap) return []
    if (!categories || categories.length === 0) {
      return Object.values(items).map(id => itemMap[id]?.imageUrl).filter(Boolean)
    }
    const imgs = []
    categories.forEach(cat => {
      const itemId = items[cat.id]
      if (itemId && itemMap[itemId]?.imageUrl) imgs.push(itemMap[itemId].imageUrl)
    })
    return imgs
  },

  _getNextDefaultName() {
    const { savedOutfits } = this.data
    const re = /^未定义的搭配(\d+)$/
    let maxN = 0
    ;(savedOutfits || []).forEach(o => {
      const m = (o.name || '').match(re)
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
    })
    return `未定义的搭配${maxN + 1}`
  },

  async saveOutfitImmediate(selectedItems) {
    const items = selectedItems || this.data.selectedItems
    if (!items || Object.keys(items).length === 0) return
    const { currentOutfitId, currentOutfitName, savedOutfits } = this.data
    const name = currentOutfitId
      ? (savedOutfits.find(o => o.id === currentOutfitId)?.name || currentOutfitName || this._getNextDefaultName())
      : this._getNextDefaultName()
    const payload = { name, items: { ...items } }
    try {
      if (currentOutfitId) {
        await request({
          url: `/wardrobe/outfits/${currentOutfitId}`,
          method: 'PATCH',
          data: payload
        })
      } else {
        const res = await request({
          url: '/wardrobe/outfits',
          method: 'POST',
          data: payload
        })
        this.setData({ currentOutfitId: res?.id || '', currentOutfitName: name })
      }
      await this._refreshOutfits()
    } catch (err) {
      showToast(err?.data?.message || '保存失败', 'error')
    }
  },

  async _refreshOutfits() {
    try {
      const outfitRes = await request({ url: '/wardrobe/outfits', method: 'GET' })
      const itemMap = {}
      Object.values(this.data.allItems || {}).flat().forEach(i => { if (i?.id) itemMap[i.id] = i })
      const categories = this.data.categories || []
      const savedOutfits = (outfitRes.outfits || []).map(o => {
        const imgs = this._getOutfitPreviewImages(o.items, itemMap, categories)
        const previewImages = imgs.slice(0, 3)
        return {
          ...o,
          previewImages,
          previewImage: imgs[0] || '',
          itemCount: Object.keys(o.items || {}).length
        }
      })
      this.setData({ savedOutfits })
    } catch (_) {}
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

  async   saveOutfit() {
    const { outfitName, outfitOccasion, outfitSeason, selectedItems, editingOutfitId } = this.data
    const name = (outfitName || '').trim()
    if (!name) {
      showToast('请输入搭配名称', 'error')
      return
    }
    const payload = {
      name,
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
      this.setData({ currentOutfitName: name })
      this.closeSaveDialog()
      await this._refreshOutfits()
    } catch (err) {
      showToast(err?.data?.message || '保存失败', 'error')
    }
  },

  loadOutfit(e) {
    const { outfit } = e.currentTarget.dataset
    const items = outfit.items || {}
    const preview = this._buildPreview(items, this.data.allItems, this.data.categories)
    this.setData({
      selectedItems: items,
      selectedCount: Object.keys(items).length,
      selectedForPreview: preview,
      currentOutfitId: outfit.id || '',
      currentOutfitName: outfit.name || ''
    })
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
      selectedForPreview: preview,
      currentOutfitId: outfit.id || '',
      currentOutfitName: outfit.name || ''
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
    this.setData({
      selectedItems: {},
      selectedCount: 0,
      selectedForPreview: [],
      currentOutfitId: '',
      currentOutfitName: ''
    })
    showToast('已清空', 'success')
  },

})
