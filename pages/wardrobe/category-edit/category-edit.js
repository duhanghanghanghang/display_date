const { request } = require('../../../utils/request')
const { showToast } = require('../../../utils/toast')

Page({
  data: { id: '', name: '' },

  onLoad(options) {
    const { id, name: n } = options
    if (!id) return
    this.setData({ id, name: n ? decodeURIComponent(n) : '' })
  },

  onName(e) {
    this.setData({ name: e.detail.value })
  },

  async save() {
    const { id, name } = this.data
    if (!id || !name.trim()) {
      showToast('请输入分类名称', 'none')
      return
    }
    try {
      await request({
        url: `/wardrobe/categories/${id}`,
        method: 'PATCH',
        data: { name: name.trim() }
      })
      showToast('保存成功', 'success')
      setTimeout(() => wx.navigateBack(), 400)
    } catch (e) {}
  },

  async remove() {
    const { id, name } = this.data
    const { confirm } = await wx.showModal({ title: '确认', content: `确定删除「${name}」吗？分类下须无衣服。` })
    if (!confirm) return
    try {
      await request({ url: `/wardrobe/categories/${id}`, method: 'DELETE' })
      showToast('已删除', 'success')
      setTimeout(() => wx.navigateBack(), 400)
    } catch (e) {}
  }
})
