// pages/wardrobe/edit/edit.js
const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')
const { ImageUploader } = require('../../../utils/imageUploader')
const { COLORS, SEASONS, WEAR_FLAG_OPTIONS } = require('../../../utils/constants')

Page({
  data: {
    id: '',
    categories: [],
    categoryIndex: -1,
    categoryId: '',
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
    colors: COLORS,
    seasons: SEASONS,
    wearFlagOptions: WEAR_FLAG_OPTIONS,
    wearFlagIndex: 0,
    colorIndex: -1,
    seasonIndex: -1,
    submitting: false
  },

  async onLoad(options) {
    const id = options.id
    if (!id) {
      showToast('参数错误', 'error')
      return
    }
    this.setData({ id })
    const [categoriesRes, item] = await Promise.all([
      request({ url: '/wardrobe/categories', method: 'GET' }),
      request({ url: `/wardrobe/items/${id}`, method: 'GET' })
    ])
    const categories = categoriesRes.categories || []
    const catIdx = categories.findIndex(c => c.id === item.categoryId)
    const colorIdx = COLORS.indexOf(item.color || '')
    const seasonIdx = SEASONS.indexOf(item.season || '')
    let wfIdx = WEAR_FLAG_OPTIONS.findIndex(w => w.value === (item.wearFlag || ''))
    if (wfIdx < 0) wfIdx = 0
    this.setData({
      categories,
      categoryIndex: catIdx >= 0 ? catIdx : -1,
      categoryId: item.categoryId || '',
      colorIndex: colorIdx >= 0 ? colorIdx : -1,
      seasonIndex: seasonIdx >= 0 ? seasonIdx : -1,
      wearFlagIndex: wfIdx,
      form: {
        name: item.name || '',
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

  onCategoryChange(e) {
    const idx = parseInt(e.detail.value, 10)
    const cat = this.data.categories[idx]
    this.setData({ categoryIndex: idx, categoryId: cat ? cat.id : '' })
  },

  onColorChange(e) {
    const idx = parseInt(e.detail.value, 10)
    this.setData({ colorIndex: idx, 'form.color': this.data.colors[idx] || '' })
  },

  onSeasonChange(e) {
    const idx = parseInt(e.detail.value, 10)
    this.setData({ seasonIndex: idx, 'form.season': this.data.seasons[idx] || '' })
  },

  onWearFlagChange(e) {
    const idx = parseInt(e.detail.value, 10)
    this.setData({ wearFlagIndex: idx })
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onPurchaseDateChange(e) {
    this.setData({ 'form.purchaseDate': e.detail.value })
  },

  async chooseImage() {
    try {
      const imageUrl = await ImageUploader.chooseAndUploadWardrobe()
      this.setData({ 'form.imageUrl': imageUrl })
    } catch (err) {
      console.error('图片上传失败:', err)
    }
  },

  removeImage() {
    this.setData({ 'form.imageUrl': '' })
    showToast('已移除图片', 'success')
  },

  async saveItem() {
    const { id, categoryId, form, wearFlagOptions, wearFlagIndex } = this.data
    if (!form.name || !form.name.trim()) {
      showToast('请输入衣服名称', 'error')
      return
    }
    if (!form.imageUrl) {
      showToast('请上传衣服图片', 'error')
      return
    }
    if (!categoryId) {
      showToast('请选择分类', 'error')
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中...' })
    try {
      const wearFlag = wearFlagOptions[wearFlagIndex]?.value || null
      const data = {
        categoryId,
        name: form.name.trim(),
        imageUrl: form.imageUrl,
        color: form.color || null,
        size: form.size || null,
        season: form.season || null,
        brand: form.brand || null,
        price: form.price ? parseFloat(form.price) : null,
        purchaseDate: form.purchaseDate || null,
        note: form.note || null,
        tags: form.tags ? form.tags.trim() : null,
        wearFlag: wearFlag || null
      }
      await request({
        url: `/wardrobe/items/${id}`,
        method: 'PATCH',
        data
      })
      wx.hideLoading()
      showToast('保存成功', 'success')
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      this.setData({ submitting: false })
      wx.hideLoading()
      showToast(err.message || '保存失败', 'error')
    }
  }
})
