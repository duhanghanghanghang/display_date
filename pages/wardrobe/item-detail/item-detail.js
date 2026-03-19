// pages/wardrobe/item-detail/item-detail.js
const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')

Page({
  data: {
    id: '',
    item: null,
    loading: true
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      showToast('参数错误', 'error')
      return
    }
    this.setData({ id })
    this.loadDetail()
  },

  async loadDetail() {
    try {
      const item = await request({
        url: `/wardrobe/items/${this.data.id}`,
        method: 'GET'
      })
      this.setData({ item, loading: false })
    } catch (err) {
      this.setData({ loading: false })
      showToast('加载失败', 'error')
    }
  },

  previewImage() {
    const url = this.data.item?.imageUrl
    if (url) {
      wx.previewImage({ urls: [url], current: url })
    }
  },

  goEdit() {
    wx.navigateTo({
      url: `/pages/wardrobe/edit/edit?id=${this.data.id}`
    })
  },

  onImageError() {
    this.setData({ 'item._imgFailed': true })
  },

  deleteItem() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request({
              url: `/wardrobe/items/${this.data.id}`,
              method: 'DELETE'
            })
            showToast('已删除', 'success')
            setTimeout(() => wx.navigateBack(), 400)
          } catch (err) {
            showToast('删除失败', 'error')
          }
        }
      }
    })
  }
})
