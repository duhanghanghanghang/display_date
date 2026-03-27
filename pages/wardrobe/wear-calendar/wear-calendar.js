// pages/wardrobe/wear-calendar/wear-calendar.js
const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')

Page({
  data: {
    year: 0,
    month: 1,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    paddingBefore: [],
    days: [],
    logByDate: {},
    outfits: [],
    outfitPickerLabels: ['（请选择）'],
    outfitPickerIndex: 0,
    showDayModal: false,
    selectedDate: '',
    dayNote: '',
    existingLogId: ''
  },

  onLoad() {
    const now = new Date()
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth() + 1
    })
    this.refresh()
  },

  onShow() {
    this.loadMonthLogs()
  },

  async refresh() {
    await this.loadOutfits()
    await this.loadMonthLogs()
  },

  async loadOutfits() {
    try {
      const res = await request({ url: '/wardrobe/outfits', method: 'GET' })
      const outfits = res.outfits || []
      const labels = ['（请选择）', ...outfits.map(o => o.name || '未命名')]
      this.setData({ outfits, outfitPickerLabels: labels })
    } catch (e) {
      this.setData({ outfits: [], outfitPickerLabels: ['（请选择）'] })
    }
  },

  async loadMonthLogs() {
    const { year, month } = this.data
    try {
      const res = await request({
        url: `/wardrobe/wear-log?year=${year}&month=${month}`,
        method: 'GET'
      })
      const logs = res.logs || []
      const logByDate = {}
      logs.forEach(l => {
        if (l.wearDate) logByDate[l.wearDate] = l
      })
      this.setData({ logByDate }, () => this.buildGrid())
    } catch (e) {
      this.setData({ logByDate: {} }, () => this.buildGrid())
    }
  },

  buildGrid() {
    const { year, month, logByDate } = this.data
    const first = new Date(year, month - 1, 1)
    const last = new Date(year, month, 0)
    const pad = first.getDay()
    const paddingBefore = new Array(pad).fill(0)
    const today = new Date()
    const days = []
    for (let d = 1; d <= last.getDate(); d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const hasLog = !!logByDate[dateStr]
      const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === d
      days.push({ day: d, dateStr, hasLog, isToday })
    }
    this.setData({ paddingBefore, days })
  },

  prevMonth() {
    let { year, month } = this.data
    month--
    if (month < 1) { month = 12; year-- }
    this.setData({ year, month }, () => this.loadMonthLogs())
  },

  nextMonth() {
    let { year, month } = this.data
    month++
    if (month > 12) { month = 1; year++ }
    this.setData({ year, month }, () => this.loadMonthLogs())
  },

  onTapDay(e) {
    const dateStr = e.currentTarget.dataset.date
    const log = this.data.logByDate[dateStr]
    let outfitPickerIndex = 0
    if (log && log.outfitId) {
      const idx = this.data.outfits.findIndex(o => o.id === log.outfitId)
      outfitPickerIndex = idx >= 0 ? idx + 1 : 0
    }
    this.setData({
      showDayModal: true,
      selectedDate: dateStr,
      dayNote: log?.note || '',
      existingLogId: log?.id || '',
      outfitPickerIndex
    })
  },

  onOutfitPick(e) {
    this.setData({ outfitPickerIndex: parseInt(e.detail.value, 10) })
  },

  onDayNoteInput(e) {
    this.setData({ dayNote: e.detail.value })
  },

  closeModal() {
    this.setData({ showDayModal: false })
  },

  noop() {},

  async saveDayLog() {
    const { selectedDate, outfitPickerIndex, outfits, dayNote } = this.data
    if (outfitPickerIndex < 1 || !outfits[outfitPickerIndex - 1]) {
      showToast('请选择一套搭配', 'error')
      return
    }
    const outfit = outfits[outfitPickerIndex - 1]
    wx.showLoading({ title: '保存中' })
    try {
      await request({
        url: '/wardrobe/wear-log',
        method: 'POST',
        data: {
          wearDate: selectedDate,
          outfitId: outfit.id,
          note: dayNote || null
        }
      })
      wx.hideLoading()
      showToast('已记录', 'success')
      this.closeModal()
      this.loadMonthLogs()
    } catch (err) {
      wx.hideLoading()
      showToast(err.message || '失败', 'error')
    }
  },

  deleteDayLog() {
    const id = this.data.existingLogId
    if (!id) return
    wx.showModal({
      title: '删除记录',
      content: '确定删除这天的穿搭记录？',
      success: async (r) => {
        if (!r.confirm) return
        try {
          await request({ url: `/wardrobe/wear-log/${id}`, method: 'DELETE' })
          showToast('已删除', 'success')
          this.closeModal()
          this.loadMonthLogs()
        } catch (e) {
          showToast('删除失败', 'error')
        }
      }
    })
  }
})
