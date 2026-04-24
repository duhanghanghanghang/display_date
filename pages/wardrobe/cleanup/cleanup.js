const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')

Page({
  data: {
    items: [],
    selectedCount: 0
  },

  onLoad() {
    this.load()
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const res = await request({
        url: '/wardrobe/items?wear_flag=RARE&size=200&page=1',
        method: 'GET'
      })
      const list = (res.items || []).map(x => ({ ...x, _sel: false }))
      this.setData({ items: list, selectedCount: 0 })
    } catch (e) {
      this.setData({ items: [] })
    }
  },

  onToggle(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const items = this.data.items.map(x => (x.id === id ? { ...x, _sel: !x._sel } : x))
    const selectedCount = items.filter(x => x._sel).length
    this.setData({ items, selectedCount })
  },

  async onBatchDelete() {
    const ids = this.data.items.filter(x => x._sel).map(x => x.id)
    if (ids.length === 0) return
    const { confirm } = await wx.showModal({
      title: '确认',
      content: '确定删除选中的衣物吗？'
    })
    if (!confirm) return
    try {
      wx.showLoading({ title: '处理中' })
      await request({
        url: '/wardrobe/items/batch-delete',
        method: 'POST',
        data: { ids }
      })
      wx.hideLoading()
      showToast('已删除', 'success')
      this.load()
    } catch (e) {
      wx.hideLoading()
    }
  }
})
