// pages/wardrobe/item-list/item-list.js
const { request } = require('../../../utils/request')
const { COLORS_FILTER, SEASONS_FILTER, WEAR_FLAGS } = require('../../../utils/constants')

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
    wearFlagLabels: WEAR_FLAGS.map(f => f.label),
    wearFlagIndex: 0,
    wearFlagValue: '',
    q: '',
    minPrice: '',
    maxPrice: '',
    tagsFilter: '',
    items: [],
    total: 0,
    page: 1,
    size: 20,
    loading: false,
    hasMore: true
  },

  onLoad(options) {
    this._skipFirstShow = true
    const categoryId = options.category_id || options.categoryId || ''
    const wf = options.wearFlag || options.wear_flag || ''
    let wearFlagIndex = 0
    let wearFlagValue = ''
    if (wf) {
      const i = WEAR_FLAGS.findIndex(x => x.value === wf)
      if (i >= 0) {
        wearFlagIndex = i
        wearFlagValue = WEAR_FLAGS[i].value
      }
    }
    this.setData({ categoryId, wearFlagIndex, wearFlagValue })
    this.loadCategories()
    this.loadItems(true)
  },

  onShow() {
    if (this._skipFirstShow) {
      this._skipFirstShow = false
      return
    }
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
      const d = this.data
      if (d.categoryId) url += `&category_id=${d.categoryId}`
      if (d.color) url += `&color=${encodeURIComponent(d.color)}`
      if (d.season) url += `&season=${encodeURIComponent(d.season)}`
      if (d.q && d.q.trim()) url += `&q=${encodeURIComponent(d.q.trim())}`
      if (d.minPrice) url += `&min_price=${encodeURIComponent(d.minPrice)}`
      if (d.maxPrice) url += `&max_price=${encodeURIComponent(d.maxPrice)}`
      if (d.tagsFilter && d.tagsFilter.trim()) url += `&tags=${encodeURIComponent(d.tagsFilter.trim())}`
      if (d.wearFlagValue) url += `&wear_flag=${encodeURIComponent(d.wearFlagValue)}`

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

  onWearFlagChange(e) {
    const idx = parseInt(e.detail.value, 10)
    const f = WEAR_FLAGS[idx]
    this.setData({ wearFlagIndex: idx, wearFlagValue: f ? f.value : '' })
    this.loadItems(true)
  },

  onSearchInput(e) {
    this.setData({ q: e.detail.value })
  },

  onSearchConfirm() {
    this.loadItems(true)
  },

  onMinPrice(e) {
    this.setData({ minPrice: e.detail.value })
  },

  onMaxPrice(e) {
    this.setData({ maxPrice: e.detail.value })
  },

  onTagsFilter(e) {
    this.setData({ tagsFilter: e.detail.value })
  },

  onApplyFilter() {
    this.loadItems(true)
  },

  resetFilter() {
    this.setData({
      categoryIndex: 0,
      categoryId: '',
      colorIndex: 0,
      color: '',
      seasonIndex: 0,
      season: '',
      wearFlagIndex: 0,
      wearFlagValue: '',
      q: '',
      minPrice: '',
      maxPrice: '',
      tagsFilter: ''
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
