// pages/wardrobe/add/add.js
const app = getApp()
const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')
const { ImageUploader } = require('../../../utils/imageUploader')
const { COLORS, SEASONS, WEAR_FLAG_OPTIONS } = require('../../../utils/constants')

Page({
  data: {
    categoryId: '',
    categoryName: '',
    items: [],
    showAddDialog: false,
    form: {
      name: '',
      color: '',
      size: '',
      season: '',
      brand: '',
      price: '',
      purchaseDate: '',
      imageUrl: '',
      note: '',
      tags: ''
    },
    editingId: null,
    seasons: SEASONS,
    colors: COLORS,
    wearFlagOptions: WEAR_FLAG_OPTIONS,
    wearFlagIndex: 0,
    colorIndex: -1,
    seasonIndex: -1
  },

  onLoad(options) {
    if (options.categoryId) {
      this._skipFirstShow = true
      this.setData({
        categoryId: options.categoryId,
        categoryName: decodeURIComponent(options.categoryName || '')
      })
      this.loadItems()
    }
  },

  onShow() {
    if (!this.data.categoryId) return
    if (this._skipFirstShow) {
      this._skipFirstShow = false
      return
    }
    this.loadItems()
  },

  async loadItems() {
    try {
      const res = await request({
        url: `/wardrobe/items?category_id=${this.data.categoryId}`,
        method: 'GET'
      })
      this.setData({ items: res.items || [] })
    } catch (err) {
      console.error('加载衣服列表失败:', err)
      showToast('加载失败', 'error')
    }
  },

  showAdd() {
    this.setData({ 
      showAddDialog: true,
      editingId: null,
      colorIndex: -1,
      seasonIndex: -1,
      wearFlagIndex: 0,
      form: {
        name: '',
        color: '',
        size: '',
        season: '',
        brand: '',
        price: '',
        purchaseDate: '',
        imageUrl: '',
        note: '',
        tags: ''
      }
    })
  },

  showEdit(e) {
    const item = e.currentTarget.dataset.item
    const colorIdx = COLORS.indexOf(item.color || '')
    const seasonIdx = SEASONS.indexOf(item.season || '')
    let wfIdx = WEAR_FLAG_OPTIONS.findIndex(w => w.value === (item.wearFlag || ''))
    if (wfIdx < 0) wfIdx = 0
    this.setData({
      showAddDialog: true,
      editingId: item.id,
      colorIndex: colorIdx >= 0 ? colorIdx : -1,
      seasonIndex: seasonIdx >= 0 ? seasonIdx : -1,
      wearFlagIndex: wfIdx,
      form: {
        name: item.name,
        color: item.color || '',
        size: item.size || '',
        season: item.season || '',
        brand: item.brand || '',
        price: item.price ? String(item.price) : '',
        purchaseDate: item.purchaseDate || '',
        imageUrl: item.imageUrl || '',
        note: item.note || '',
        tags: item.tags || ''
      }
    })
  },

  closeDialog() {
    this.setData({ showAddDialog: false })
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  onSeasonChange(e) {
    const idx = parseInt(e.detail.value, 10)
    const season = this.data.seasons[idx] || ''
    this.setData({ seasonIndex: idx, 'form.season': season })
  },

  onColorChange(e) {
    const idx = parseInt(e.detail.value, 10)
    const color = this.data.colors[idx] || ''
    this.setData({ colorIndex: idx, 'form.color': color })
  },

  onWearFlagChange(e) {
    this.setData({ wearFlagIndex: parseInt(e.detail.value, 10) })
  },

  onPurchaseDateChange(e) {
    this.setData({ 'form.purchaseDate': e.detail.value })
  },

  async chooseImage() {
    try {
      const imageUrl = await ImageUploader.chooseAndUploadWardrobe()
      this.setData({ 'form.imageUrl': imageUrl })
    } catch (err) {
      // 错误已在 ImageUploader 中处理
      console.error('图片上传失败:', err)
    }
  },

  removeImage() {
    this.setData({ 'form.imageUrl': '' })
    showToast('已移除图片', 'success')
  },

  async saveItem() {
    const { form, editingId, categoryId, wearFlagOptions, wearFlagIndex } = this.data
    
    if (!form.name || !form.name.trim()) {
      showToast('请输入衣服名称', 'error')
      return
    }

    try {
      const wearFlag = wearFlagOptions[wearFlagIndex]?.value || null
      const data = {
        categoryId: categoryId,
        name: form.name.trim(),
        color: form.color,
        size: form.size,
        season: form.season,
        brand: form.brand,
        price: form.price ? parseFloat(form.price) : null,
        purchaseDate: form.purchaseDate || null,
        imageUrl: form.imageUrl,
        note: form.note,
        tags: form.tags ? form.tags.trim() : null,
        wearFlag: wearFlag || null
      }

      if (editingId) {
        await request({
          url: `/wardrobe/items/${editingId}`,
          method: 'PATCH',
          data
        })
        showToast('保存成功', 'success')
      } else {
        await request({
          url: '/wardrobe/items',
          method: 'POST',
          data
        })
        showToast('添加成功', 'success')
      }

      this.closeDialog()
      this.loadItems()
    } catch (err) {
      console.error('保存失败:', err)
      showToast(err.message || '保存失败', 'error')
    }
  },

  async deleteItem(e) {
    const { id } = e.currentTarget.dataset
    
    const res = await wx.showModal({
      title: '提示',
      content: '确定要删除这件衣服吗？'
    })

    if (res.confirm) {
      try {
        await request({
          url: `/wardrobe/items/${id}`,
          method: 'DELETE'
        })
        showToast('删除成功', 'success')
        this.loadItems()
      } catch (err) {
        console.error('删除失败:', err)
        showToast('删除失败', 'error')
      }
    }
  },

  previewImage(e) {
    e.stopPropagation()
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      urls: [url],
      current: url
    })
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/wardrobe/item-detail/item-detail?id=${id}`
    })
  },

  onImageError(e) {
    const id = e.currentTarget.dataset.id
    const items = this.data.items.map(it =>
      it.id === id ? { ...it, _imgFailed: true } : it
    )
    this.setData({ items })
  }
})
