// pages/wardrobe/item-list/item-list.js
const { request } = require('../../../utils/request')
const { COLORS_FILTER, SEASONS_FILTER } = require('../../../utils/constants')

Page({
  data: {
    categories: [],
    categoryIndex: 0,
    categoryId: '',
    colorIndex: 0,
    color: '',
    colors: COLORS_FILTER,
    seasonIndex: 0,
    season: '',
    seasons: SEASONS_FILTER,
    items: [],
    total: 0,
    page: 1,
    size: 20,
    loading: false,
    hasMore: true
  },

  onLoad(options) {
    const categoryId = options.category_id || options.categoryId || ''
    this.setData({ categoryId })
    this.loadCategories()
    this.loadItems(true)
  },

  async loadCategories() {
    const res = await request({ url: '/wardrobe/categories', method: 'GET' })
    const list = res.categories || []
    const categories = [{ id: '', name: '全部分类' }, ...list]
    let categoryIndex = 0
    if (this.data.categoryId) {
      const idx = list.findIndex(c => c.id === this.data.categoryId)
      categoryIndex = idx >= 0 ? idx + 1 : 0
    }
    this.setData({ categories, categoryIndex })
  },

  async loadItems(reset, pageOverride) {
    if (this.data.loading) return
    const page = pageOverride !== undefined ? pageOverride : (reset ? 1 : this.data.page)
    if (!reset && !this.data.hasMore) return

    this.setData({ loading: true })
    try {
      let url = `/wardrobe/items?page=${page}&size=${this.data.size}`
      if (this.data.categoryId) url += `&category_id=${this.data.categoryId}`
      if (this.data.color) url += `&color=${encodeURIComponent(this.data.color)}`
      if (this.data.season) url += `&season=${encodeURIComponent(this.data.season)}`

      const res = await request({ url, method: 'GET' })
      const items = res.items || []
      const total = res.total || 0
      const prevItems = reset ? [] : this.data.items
      this.setData({
        items: prevItems.concat(items),
        total,
        page,
        hasMore: prevItems.length + items.length < total,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  onCategoryChange(e) {
    const idx = parseInt(e.detail.value, 10)
    const cat = this.data.categories[idx]
    const categoryId = (cat && cat.id) ? cat.id : ''
    this.setData({ categoryIndex: idx, categoryId })
    this.loadItems(true)
  },

  onColorChange(e) {
    const idx = parseInt(e.detail.value, 10)
    const val = this.data.colors[idx]
    const color = (val === '全部' || !val) ? '' : val
    this.setData({ colorIndex: idx, color })
    this.loadItems(true)
  },

  onSeasonChange(e) {
    const idx = parseInt(e.detail.value, 10)
    const val = this.data.seasons[idx]
    const season = (val === '全部' || !val) ? '' : val
    this.setData({ seasonIndex: idx, season })
    this.loadItems(true)
  },

  resetFilter() {
    this.setData({
      categoryIndex: 0,
      categoryId: '',
      colorIndex: 0,
      color: '',
      seasonIndex: 0,
      season: ''
    })
    this.loadItems(true)
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      const nextPage = this.data.page + 1
      this.setData({ page: nextPage })
      this.loadItems(false, nextPage)
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/wardrobe/item-detail/item-detail?id=${id}` })
  },

  onReachBottom() {
    this.loadMore()
  },

  onPullDownRefresh() {
    this.loadItems(true).then(() => wx.stopPullDownRefresh())
  },

  onImageError(e) {
    const id = e.currentTarget.dataset.id
    const items = this.data.items.map(it =>
      it.id === id ? { ...it, _imgFailed: true } : it
    )
    this.setData({ items })
  }
})
