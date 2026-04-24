const { request } = require('../../../utils/request')

Page({
  data: {
    loading: true,
    categoryShare: [],
    recentMonthlySpend: [],
    wearFrequency: 0,
    idleRate: 0
  },

  onLoad() {
    this.load()
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const s = await request({ url: '/wardrobe/stats', method: 'GET' })
      const spend = (s.recentMonthlySpend || []).map((x, i) => ({
        mkey: `${x.year}-${x.month}-${i}`,
        year: x.year,
        month: x.month,
        amt: formatMoney(x.amount)
      }))
      this.setData({
        loading: false,
        categoryShare: s.categoryShare || [],
        recentMonthlySpend: spend,
        wearFrequency: s.wearFrequency != null ? s.wearFrequency : 0,
        idleRate: s.idleRate != null ? s.idleRate : 0
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  }
})

function formatMoney(n) {
  if (n == null) return '0'
  const v = Number(n)
  if (Number.isNaN(v)) return '0'
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}
