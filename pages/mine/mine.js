const app = getApp()
const { request } = require('../../utils/request')

function mapTeam(apiTeam = {}) {
  return {
    id: apiTeam.id || apiTeam._id,
    _id: apiTeam.id || apiTeam._id, // 兼容旧字段
    name: apiTeam.name || '我的小组',
    inviteCode: apiTeam.invite_code || apiTeam.inviteCode,
    ownerOpenId: apiTeam.owner_openid || apiTeam.ownerOpenId,
    memberOpenIds: apiTeam.member_openids || apiTeam.memberOpenIds || []
  }
}

Page({
  data: {
    reminderDays: 3,
    minDays: 1,
    maxDays: 30,
    // 请在此填写官方订阅消息模板ID
    subscribeTemplateIds: ['MrQmebYU1N-8tGI-9Ux1XxibqBsYuN-ncDMFkHFcdlI'],
    teamInfo: null,
    inviteCodeInput: '',
    creating: false,
    joining: false,
    teamNameInput: '我的小组',
    teamMembers: [],
    loadingTeam: false,
    renaming: false,
    regenerating: false,
    leaving: false,
    currentTab: 'created', // created | joined
    createdTeams: [],
    joinedTeams: []
  },

  onLoad() {
    this.loadSettings()
    this.loadTeam()
  },

  onShow() {
    this.loadSettings()
    this.loadTeam()
    this.loadTeams()
  },

  // 读取本地提醒设置
  loadSettings() {
    if (typeof app.syncReminderSettings === 'function') {
      app.syncReminderSettings().then((days) => {
        this.setData({ reminderDays: days })
      })
    } else {
      const reminderDays = app.getReminderDays()
      this.setData({ reminderDays })
    }
  },

  // 加载团队信息（本地缓存）
  loadTeam() {
    const teamInfo = wx.getStorageSync('teamInfo') || null
    const id = teamInfo && (teamInfo.id || teamInfo._id)
    if (id) {
      this.fetchTeamDetail(id)
    } else {
      this.setData({ teamInfo: null, teamMembers: [] })
    }
  },

  async loadTeams() {
    try {
      await this.ensureOpenId()
      const createdRes = await request({ url: '/teams?type=created', method: 'GET' })
      const joinedRes = await request({ url: '/teams?type=joined', method: 'GET' })
      this.setData({
        createdTeams: (createdRes.teams || []).map(mapTeam),
        joinedTeams: (joinedRes.teams || []).map(mapTeam)
      })
    } catch (err) {
      console.error('加载团队列表失败', err)
    }
  },

  async fetchTeamDetail(teamId) {
    if (!teamId) return
    this.setData({ loadingTeam: true })
    try {
      const res = await request({ url: `/teams/${teamId}`, method: 'GET' })
      const team = mapTeam(res.team)
      wx.setStorageSync('teamInfo', team)
      this.setData({
        teamInfo: team,
        teamMembers: team.memberOpenIds || [],
        teamNameInput: team.name
      })
    } catch (err) {
      console.error('获取团队信息失败', err)
      wx.showToast({ title: '加载团队失败', icon: 'none' })
    } finally {
      this.setData({ loadingTeam: false })
    }
  },

  // 选项卡切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  // 设为当前团队
  selectTeam(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.currentTab === 'created' ? this.data.createdTeams : this.data.joinedTeams
    const team = list.find(t => t._id === id)
    if (!team) return
    const teamInfo = {
      id: team.id || team._id,
      _id: team.id || team._id,
      name: team.name,
      inviteCode: team.inviteCode,
      ownerOpenId: team.ownerOpenId,
      memberOpenIds: team.memberOpenIds || []
    }
    wx.setStorageSync('teamInfo', teamInfo)
    this.setData({ teamInfo, teamMembers: teamInfo.memberOpenIds || [] })
    wx.showToast({ title: '已切换团队', icon: 'success' })
    this.fetchTeamDetail(team._id)
  },

  // 输入框通用
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  async ensureOpenId() {
    return app.ensureOpenId()
  },

  // 滑动选择临期天数
  onReminderChange(e) {
    const reminderDays = Number(e.detail.value) || 3
    this.setData({ reminderDays })
  },

  // 保存提醒设置
  saveSettings() {
    const { reminderDays } = this.data
    const days = Number(reminderDays) || 3
    wx.showLoading({ title: '保存中', mask: true })
    const doSave = async () => {
      if (typeof app.updateReminderSettings === 'function') {
        await app.updateReminderSettings(days)
      } else {
        wx.setStorageSync('reminderSettings', { reminderDays: days })
      }
    }
    doSave()
      .then(() => {
        this.setData({ reminderDays: days })
        wx.showToast({
          title: '提醒设置已更新',
          icon: 'success'
        })
        // 保存后立即检查是否有需要立即提醒的物品
        this.checkImmediateNotify(days)
      })
      .catch((err) => {
        console.error('保存提醒设置失败', err)
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
      .finally(() => wx.hideLoading())
  },

  // 预览提醒效果
  previewReminder() {
    const { reminderDays } = this.data
    wx.showToast({
      title: `示例：到期前${reminderDays}天提醒`,
      icon: 'none'
    })
  },

  // 申请订阅消息授权
  requestSubscribe() {
    if (this.sending) {
      wx.showToast({ title: '正在处理，请稍候', icon: 'none' })
      return
    }
    this.sending = true
    const { subscribeTemplateIds } = this.data
    if (!Array.isArray(subscribeTemplateIds) || subscribeTemplateIds.length === 0 || subscribeTemplateIds[0].includes('请替换')) {
      wx.showModal({
        title: '请先配置模板ID',
        content: '在 mine.js 的 subscribeTemplateIds 中填入微信公众平台的订阅消息模板ID',
        showCancel: false
      })
      this.sending = false
      return
    }

    wx.requestSubscribeMessage({
      tmplIds: subscribeTemplateIds,
      success: (res) => {
        const accept = Object.values(res).includes('accept')
        if (!accept) {
          wx.showToast({ title: '未授权，无法发送', icon: 'none' })
        } else {
          wx.showToast({
            title: '订阅请求已发送',
            icon: 'success'
          })
          console.log('订阅结果', res)
        }
        this.sending = false
      },
      fail: (err) => {
        console.error('订阅失败', err)
        wx.showToast({
          title: '订阅失败，请稍后再试',
          icon: 'none'
        })
        this.sending = false
      }
    })
  },

  // 申请订阅并尝试测试推送（需后端/云函数支持）
  requestSubscribeAndSend() {
    if (this.sending) {
      wx.showToast({ title: '正在处理，请稍候', icon: 'none' })
      return
    }
    this.sending = true
    const { subscribeTemplateIds } = this.data
    if (!Array.isArray(subscribeTemplateIds) || subscribeTemplateIds.length === 0 || subscribeTemplateIds[0].includes('请替换')) {
      wx.showModal({
        title: '请先配置模板ID',
        content: '在 mine.js 的 subscribeTemplateIds 中填入微信公众平台的订阅消息模板ID',
        showCancel: false
      })
      this.sending = false
      return
    }

    wx.requestSubscribeMessage({
      tmplIds: subscribeTemplateIds,
      success: (res) => {
        const accept = Object.values(res).includes('accept')
        if (!accept) {
          wx.showToast({ title: '未授权，无法发送', icon: 'none' })
          this.sending = false
          return
        }
        this.sendSubscribe()
      },
      fail: (err) => {
        console.error('订阅失败', err)
        wx.showToast({
          title: '订阅失败，请稍后再试',
          icon: 'none'
        })
        this.sending = false
      }
    })
  },

  // 调用后端发送订阅消息（示例字段需与模板匹配）
  async sendSubscribe() {
    const { subscribeTemplateIds } = this.data
    if (!Array.isArray(subscribeTemplateIds) || subscribeTemplateIds.length === 0) {
      wx.showToast({ title: '请先配置模板ID', icon: 'none' })
      return
    }
    const templateId = subscribeTemplateIds[0]
    // 模板字段：thing1（活动主题/物品名）、date3（到期时间）
    const payload = {
      templateId,
      page: 'pages/index/index',
      miniprogramState: 'formal',
      data: {
        thing1: { value: '样例物品名称' }, // 物品名或活动主题
        date3: { value: '2025-12-31 18:00' } // 过期/截止时间
      }
    }
    try {
      await request({
        url: '/wechat/subscribe/send',
        method: 'POST',
        data: payload
      })
      wx.showToast({ title: '已发送', icon: 'success' })
    } catch (err) {
      console.error('发送订阅失败', err)
      wx.showToast({ title: '发送失败', icon: 'none' })
    } finally {
      this.sending = false
    }
  },

  // 单独测试发送
  sendTestMessage() {
    this.sendSubscribe()
  },

  // 保存提醒后，立即检查需要提醒的物品并询问是否推送
  async checkImmediateNotify(reminderDays) {
    try {
      const res = await request({
        url: '/items',
        method: 'GET',
        data: { teamId: '' }
      })
      const items = res.items || []
      if (!items.length) return
      const due = items
        .map((it) => {
          const expireDate = it.expireDate || it.expire_date || ''
          const daysRemaining = app.calculateDaysRemaining(expireDate)
          return { ...it, expireDate, daysRemaining, id: it.id || it._id }
        })
        .filter((it) => it.daysRemaining <= reminderDays)
      if (!due.length) return

      const preview = due
        .slice(0, 10)
        .map((it) => `${it.name || '未命名'}（${it.expireDate || '无日期'}）`)
        .join('\n')
      const content =
        `有 ${due.length} 个物品需要立即提醒：\n` +
        preview +
        (due.length > 10 ? '\n...' : '') +
        '\n是否发送微信通知？'

      wx.showModal({
        title: '立即提醒',
        content,
        confirmText: '发送微信',
        cancelText: '仅标记',
        success: async (res) => {
          if (res.cancel && res.confirm) return
          const send = !!res.confirm
          const ids = due.map((d) => d.id).filter(Boolean)
          try {
            await request({
              url: '/items/notify',
              method: 'POST',
              data: { item_ids: ids, send }
            })
            wx.showToast({ title: send ? '已通知' : '已标记', icon: 'success' })
          } catch (err) {
            console.error('立即提醒失败', err)
            wx.showToast({ title: '提醒失败', icon: 'none' })
          }
        }
      })
    } catch (err) {
      console.warn('检查立即提醒失败', err)
    }
  },

  // 创建团队
  async createTeam() {
    if (this.data.creating) return
    this.setData({ creating: true })
    try {
      const openid = await this.ensureOpenId()
      const inviteCode = this.generateCode()
      const name = (this.data.teamNameInput || '我的小组').trim() || '我的小组'
      const res = await request({
        url: '/teams',
        method: 'POST',
        data: { name, inviteCode }
      })
      const teamInfo = mapTeam(res)
      if (!teamInfo.memberOpenIds.includes(openid)) {
        teamInfo.memberOpenIds.push(openid)
      }
      wx.setStorageSync('teamInfo', teamInfo)
      this.setData({ teamInfo, teamMembers: [openid] })
      wx.showToast({ title: '创建成功', icon: 'success' })
      this.loadTeams()
    } catch (err) {
      console.error('创建团队失败', err)
      wx.showToast({ title: '创建失败', icon: 'none' })
    } finally {
      this.setData({ creating: false })
    }
  },

  // 加入团队
  async joinTeam() {
    if (this.data.joining) return
    const code = (this.data.inviteCodeInput || '').trim()
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' })
      return
    }
    this.setData({ joining: true })
    try {
      const openid = await this.ensureOpenId()
      const team = await request({
        url: '/teams/join',
        method: 'POST',
        data: { inviteCode: code }
      })
      const teamInfo = mapTeam(team)
      if (teamInfo.memberOpenIds.indexOf(openid) === -1) {
        teamInfo.memberOpenIds.push(openid)
      }
      wx.setStorageSync('teamInfo', teamInfo)
      this.setData({ teamInfo, teamMembers: teamInfo.memberOpenIds })
      wx.showToast({ title: '已加入团队', icon: 'success' })
      this.loadTeams()
    } catch (err) {
      console.error('加入团队失败', err)
      wx.showToast({ title: '加入失败', icon: 'none' })
    } finally {
      this.setData({ joining: false })
    }
  },

  onInviteInput(e) {
    this.setData({ inviteCodeInput: e.detail.value })
  },

  // 移除成员（仅拥有者）
  async removeMember(e) {
    const target = e.currentTarget.dataset.id
    const teamInfo = this.data.teamInfo
    if (!teamInfo || !teamInfo._id) return
    const openid = await this.ensureOpenId()
    if (teamInfo.ownerOpenId !== openid) {
      wx.showToast({ title: '仅创建者可操作', icon: 'none' })
      return
    }
    if (target === openid) {
      wx.showToast({ title: '不能移除自己', icon: 'none' })
      return
    }
    wx.showModal({
      title: '移除成员',
      content: '确定移除该成员吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({
            url: `/teams/${teamInfo._id}/remove-member`,
            method: 'PATCH',
            data: { memberOpenId: target }
          })
          const newMembers = (teamInfo.memberOpenIds || []).filter(m => m !== target)
          const latest = { ...teamInfo, memberOpenIds: newMembers }
          wx.setStorageSync('teamInfo', latest)
          this.setData({ teamInfo: latest, teamMembers: newMembers })
          wx.showToast({ title: '已移除', icon: 'success' })
        } catch (err) {
          console.error('移除失败', err)
          wx.showToast({ title: '移除失败', icon: 'none' })
        }
      }
    })
  },

  // 刷新团队信息
  async refreshTeam() {
    const teamInfo = this.data.teamInfo
    if (!teamInfo || !teamInfo._id) {
      wx.showToast({ title: '尚未加入团队', icon: 'none' })
      return
    }
    await this.fetchTeamDetail(teamInfo._id)
  },

  copyInvite() {
    const teamInfo = this.data.teamInfo
    if (!teamInfo || !teamInfo.inviteCode) {
      wx.showToast({ title: '暂无邀请码', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: teamInfo.inviteCode,
      success: () => wx.showToast({ title: '已复制邀请码', icon: 'success' })
    })
  },

  // 重命名团队（仅拥有者）
  async renameTeam() {
    if (this.data.renaming) return
    const teamInfo = this.data.teamInfo
    const name = (this.data.teamNameInput || '').trim()
    if (!teamInfo || !teamInfo._id) {
      wx.showToast({ title: '尚未加入团队', icon: 'none' })
      return
    }
    if (!name) {
      wx.showToast({ title: '请输入团队名称', icon: 'none' })
      return
    }
    const openid = await this.ensureOpenId()
    if (teamInfo.ownerOpenId && teamInfo.ownerOpenId !== openid) {
      wx.showToast({ title: '仅创建者可重命名', icon: 'none' })
      return
    }
    this.setData({ renaming: true })
    try {
      const updated = await request({
        url: `/teams/${teamInfo._id}/rename`,
        method: 'PATCH',
        data: { name }
      })
      const latest = mapTeam(updated)
      wx.setStorageSync('teamInfo', latest)
      this.setData({ teamInfo: latest })
      wx.showToast({ title: '已更新名称', icon: 'success' })
    } catch (err) {
      console.error('重命名失败', err)
      wx.showToast({ title: '重命名失败', icon: 'none' })
    } finally {
      this.setData({ renaming: false })
    }
  },

  // 重新生成邀请码（仅拥有者）
  async regenerateInvite() {
    if (this.data.regenerating) return
    const teamInfo = this.data.teamInfo
    if (!teamInfo || !teamInfo._id) {
      wx.showToast({ title: '尚未加入团队', icon: 'none' })
      return
    }
    const openid = await this.ensureOpenId()
    if (teamInfo.ownerOpenId && teamInfo.ownerOpenId !== openid) {
      wx.showToast({ title: '仅创建者可操作', icon: 'none' })
      return
    }
    this.setData({ regenerating: true })
    try {
      const inviteCode = this.generateCode()
      const updated = await request({
        url: `/teams/${teamInfo._id}/regenerate-invite`,
        method: 'PATCH'
      })
      const latest = { ...mapTeam(updated), inviteCode: updated.invite_code || inviteCode }
      wx.setStorageSync('teamInfo', latest)
      this.setData({ teamInfo: latest })
      wx.showToast({ title: '已重置邀请码', icon: 'success' })
    } catch (err) {
      console.error('重置邀请码失败', err)
      wx.showToast({ title: '重置失败', icon: 'none' })
    } finally {
      this.setData({ regenerating: false })
    }
  },

  // 退出团队
  async leaveTeam() {
    if (this.data.leaving) return
    const teamInfo = this.data.teamInfo
    if (!teamInfo || !teamInfo._id) {
      wx.showToast({ title: '尚未加入团队', icon: 'none' })
      return
    }
    const openid = await this.ensureOpenId()
    if (teamInfo.ownerOpenId === openid) {
      wx.showToast({ title: '创建者暂不支持直接退出', icon: 'none' })
      return
    }
    this.setData({ leaving: true })
    try {
      await request({
        url: `/teams/${teamInfo._id}/leave`,
        method: 'PATCH'
      })
      wx.removeStorageSync('teamInfo')
      this.setData({ teamInfo: null, teamMembers: [] })
      wx.showToast({ title: '已退出团队', icon: 'success' })
    } catch (err) {
      console.error('退出团队失败', err)
      wx.showToast({ title: '退出失败', icon: 'none' })
    } finally {
      this.setData({ leaving: false })
    }
  },

  // 生成简单邀请码
  generateCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase()
  },

  // 复制备案查询链接
  copyBeianUrl() {
    wx.setClipboardData({
      data: 'https://beian.miit.gov.cn',
      success: () => {
        wx.showToast({
          title: '已复制备案查询链接',
          icon: 'success',
          duration: 2000
        })
        // 提示用户打开浏览器
        setTimeout(() => {
          wx.showModal({
            title: '查询备案信息',
            content: '链接已复制，请在浏览器中打开查询\n备案号：渝ICP备2025076154号',
            showCancel: false,
            confirmText: '知道了'
          })
        }, 2000)
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  }
})

