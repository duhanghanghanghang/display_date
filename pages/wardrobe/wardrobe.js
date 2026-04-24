// pages/wardrobe/wardrobe.js
const { request } = require('../../utils/request')

const PLACE = ['上衣', '裙子', '裤子']

function showToast(title, icon = 'none', duration = 1500) {
  wx.showToast({ title, icon, duration })
}

function buildCategoryCells(categories) {
  const emojis = ['👕', '👗', '👖', '➕']
  const keys = ['c0', 'c1', 'c2', 'add']
  const cells = []
  for (let i = 0; i < 3; i++) {
    const c = categories[i]
    cells.push({
      key: keys[i],
      kind: 'cat',
      id: c ? c.id : '',
      name: c ? c.name : PLACE[i],
      emoji: emojis[i]
    })
  }
  cells.push({ key: keys[3], kind: 'add', name: '新增', emoji: '➕' })
  return cells
}

Page({
  data: {
    statTotal: 0,
    statCategoryCount: 0,
    statValueText: '0',
    categoryCells: [],
    homeItems: []
  },

  onLoad() {
    this.loadHomeData()
  },

  onShow() {
    if (!wx.getStorageSync('openid')) {
      wx.reLaunch({ url: '/pages/wardrobe/login/login' })
      return
    }
    this.loadHomeData()
  },

  async loadHomeData() {
    try {
      const [catRes, itemRes] = await Promise.all([
        request({ url: '/wardrobe/categories', method: 'GET' }),
        request({ url: '/wardrobe/items?page=1&size=500', method: 'GET' })
      ])
      const categories = catRes.categories || []
      const allItems = itemRes.items || []
      const total = typeof itemRes.total === 'number' ? itemRes.total : allItems.length
      const statValue = allItems.reduce((s, it) => {
        const p = it.price
        if (p == null || p === '') return s
        const n = parseFloat(p)
        return s + (Number.isNaN(n) ? 0 : n)
      }, 0)
      const statValueText =
        statValue >= 10000 ? String(Math.round(statValue)) : String(Math.round(statValue * 100) / 100)
      this.setData({
        statTotal: total,
        statCategoryCount: categories.length,
        statValueText: statValueText.replace(/\.0$/, ''),
        categoryCells: buildCategoryCells(categories),
        homeItems: allItems.slice(0, 2)
      })
    } catch (err) {
      console.error('loadHomeData', err)
    }
  },

  goToCategory() {
    wx.navigateTo({ url: '/pages/wardrobe/category/category' })
  },

  goToItemList() {
    wx.navigateTo({ url: '/pages/wardrobe/item-list/item-list' })
  },

  onCategoryCellTap(e) {
    const cell = e.currentTarget.dataset.cell
    if (!cell) return
    if (cell.kind === 'add') {
      wx.navigateTo({ url: '/pages/wardrobe/category/category' })
      return
    }
    if (!cell.id) {
      showToast('请先在「管理分类」中新建分类')
      return
    }
    wx.navigateTo({
      url: `/pages/wardrobe/item-list/item-list?categoryId=${cell.id}`
    })
  },

  goToAddItem() {
    const { categoryCells } = this.data
    const first = categoryCells && categoryCells[0] && categoryCells[0].id
    if (!first) {
      showToast('请先添加分类', 'error')
      return
    }
    const name = encodeURIComponent(categoryCells[0].name || '分类')
    wx.navigateTo({
      url: `/pages/wardrobe/add/add?categoryId=${first}&categoryName=${name}&openAdd=1`
    })
  },

  goItemDetail(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/pages/wardrobe/item-detail/item-detail?id=${id}` })
  }
})
