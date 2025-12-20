// pages/wardrobe/add/add.js
const app = getApp()
const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')

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
      note: ''
    },
    editingId: null,
    seasons: ['春', '夏', '秋', '冬'],
    selectedSeason: ''
  },

  onLoad(options) {
    if (options.categoryId) {
      this.setData({
        categoryId: options.categoryId,
        categoryName: decodeURIComponent(options.categoryName || '')
      })
      this.loadItems()
    }
  },

  async loadItems() {
    try {
      const res = await request({
        url: `/wardrobe/items?category_id=${this.data.categoryId}`,
        method: 'GET'
      })
      this.setData({ items: res.items })
    } catch (err) {
      console.error('加载衣服列表失败:', err)
      showToast('加载失败', 'error')
    }
  },

  showAdd() {
    this.setData({ 
      showAddDialog: true,
      editingId: null,
      form: {
        name: '',
        color: '',
        size: '',
        season: '',
        brand: '',
        price: '',
        purchaseDate: '',
        imageUrl: '',
        note: ''
      }
    })
  },

  showEdit(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showAddDialog: true,
      editingId: item.id,
      form: {
        name: item.name,
        color: item.color || '',
        size: item.size || '',
        season: item.season || '',
        brand: item.brand || '',
        price: item.price || '',
        purchaseDate: item.purchaseDate || '',
        imageUrl: item.imageUrl || '',
        note: item.note || ''
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
    const season = this.data.seasons[e.detail.value]
    this.setData({
      'form.season': season
    })
  },

  async chooseImage() {
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
        this.setData({ 'form.imageUrl': data.url })
        showToast('上传成功', 'success')
      }
    } catch (err) {
      wx.hideLoading()
      console.error('图片上传失败:', err)
      showToast('上传失败', 'error')
    }
  },

  removeImage() {
    this.setData({ 'form.imageUrl': '' })
  },

  async saveItem() {
    const { form, editingId, categoryId } = this.data
    
    if (!form.name || !form.name.trim()) {
      showToast('请输入衣服名称', 'error')
      return
    }

    try {
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
        note: form.note
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
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      urls: [url],
      current: url
    })
  }
})
