const { request } = require('../../../utils/request')

Page({
  data: {
    pair: [],
    subText: '上衣+下装 | 适合通勤'
  },

  onLoad() {
    this.load()
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const res = await request({ url: '/wardrobe/items?page=1&size=50', method: 'GET' })
      const items = res.items || []
      if (items.length === 0) {
        this.setData({ pair: [] })
        return
      }
      if (items.length === 1) {
        this.setData({ pair: [items[0]] })
        return
      }
      const a = randomPick(items)
      const rest = items.filter(x => x.id !== a.id)
      const b = randomPick(rest)
      this.setData({
        pair: [a, b].filter(Boolean),
        subText: (a && b && a.categoryName && b.categoryName)
          ? `${a.categoryName}+${b.categoryName} | 适合通勤`
          : '组合搭配 | 适合通勤'
      })
    } catch (e) {
      this.setData({ pair: [] })
    }
  }
})

function randomPick(arr) {
  if (!arr || arr.length === 0) return null
  const i = Math.floor(Math.random() * arr.length)
  return arr[i]
}
