const app = getApp()
const ENV_ID = 'cloudbase-3gw3eh5if5bb010a'

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
    const reminderDays = app.getReminderDays()
    this.setData({ reminderDays })
  },

  // 加载团队信息（本地缓存）
  loadTeam() {
    const teamInfo = wx.getStorageSync('teamInfo') || null
    if (teamInfo && teamInfo._id) {
      this.fetchTeamDetail(teamInfo._id)
    } else {
      this.setData({ teamInfo: null, teamMembers: [] })
    }
  },

  async loadTeams() {
    try {
      const openid = await this.ensureOpenId()
      const db = wx.cloud.database()
      const createdRes = await db.collection('teams').where({ ownerOpenId: openid }).get()
      const joinedRes = await db.collection('teams').where({
        memberOpenIds: db.command.elemMatch(openid)
      }).get()
      this.setData({
        createdTeams: createdRes.data || [],
        joinedTeams: joinedRes.data || []
      })
    } catch (err) {
      console.error('加载团队列表失败', err)
    }
  },

  async fetchTeamDetail(teamId) {
    if (!teamId) return
    this.setData({ loadingTeam: true })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('teams').doc(teamId).get()
      const team = res.data
      if (team) {
        const teamInfo = {
          _id: team._id,
          name: team.name || '我的小组',
          inviteCode: team.inviteCode,
          ownerOpenId: team.ownerOpenId,
          memberOpenIds: team.memberOpenIds || []
        }
        wx.setStorageSync('teamInfo', teamInfo)
        this.setData({
          teamInfo,
          teamMembers: team.memberOpenIds || [],
          teamNameInput: teamInfo.name
        })
      }
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
      _id: team._id,
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
    wx.setStorageSync('reminderSettings', { reminderDays })
    wx.showToast({
      title: '提醒设置已更新',
      icon: 'success'
    })
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
        this.sendTestMessage()
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

  // 测试发送订阅消息（示例，需云函数/服务端实现）
  sendTestMessage() {
    const { reminderDays, subscribeTemplateIds } = this.data
    const templateId = subscribeTemplateIds[0]

    // 如果已接入云开发，可直接调用云函数 sendReminderTest
    if (wx.cloud && typeof wx.cloud.callFunction === 'function') {
      wx.cloud.callFunction({
        name: 'sendReminderTest',
        config: { env: ENV_ID },
        data: {
          templateId,
          page: 'pages/index/index',
          // 请根据模板字段自行调整字段名和值
          data: {
            thing1: { value: '临期提醒测试' },
            date2: { value: '2025-12-31' },
            thing3: { value: `到期前${reminderDays}天提醒` },
            thing4: { value: '请及时处理' }
          }
        },
        success: () => {
          wx.showToast({ title: '已触发测试推送', icon: 'success' })
          this.sending = false
        },
        fail: (err) => {
          console.error('发送失败', err)
          wx.showModal({
            title: '发送失败',
            content: '请检查云函数 sendReminderTest 是否已部署并匹配模板字段',
            showCancel: false
          })
          this.sending = false
        }
      })
    } else {
      // 未配置云开发时给出指引
      wx.showModal({
        title: '缺少发送通道',
        content: '需在云函数或服务端调用订阅消息发送接口。\n建议：\n1）开通云开发，在云函数中实现 sendReminderTest；\n2）服务端调用 https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
        showCancel: false
      })
      this.sending = false
    }
  },

  // 创建团队
  async createTeam() {
    if (this.data.creating) return
    this.setData({ creating: true })
    try {
      const openid = await this.ensureOpenId()
      const db = wx.cloud.database()
      const inviteCode = this.generateCode()
      const name = (this.data.teamNameInput || '我的小组').trim() || '我的小组'
      const res = await db.collection('teams').add({
        data: {
          name,
          ownerOpenId: openid,
          memberOpenIds: [openid],
          inviteCode,
          createdAt: new Date()
        }
      })
      const teamInfo = { _id: res._id, name, inviteCode, ownerOpenId: openid, memberOpenIds: [openid] }
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
      const db = wx.cloud.database()
      const _ = db.command
      const res = await db.collection('teams').where({ inviteCode: code }).get()
      if (!res.data || !res.data.length) {
        wx.showToast({ title: '邀请码无效', icon: 'none' })
        return
      }
      const team = res.data[0]
      // 已在团队或自身是创建者
      if (team.ownerOpenId === openid || (team.memberOpenIds || []).indexOf(openid) > -1) {
        const teamInfo = {
          _id: team._id,
          name: team.name,
          inviteCode: team.inviteCode,
          ownerOpenId: team.ownerOpenId,
          memberOpenIds: team.memberOpenIds || []
        }
        wx.setStorageSync('teamInfo', teamInfo)
        this.setData({ teamInfo, teamMembers: teamInfo.memberOpenIds || [] })
        wx.showToast({ title: '你已在该团队', icon: 'none' })
        return
      }
      await db.collection('teams').doc(team._id).update({
        data: {
          memberOpenIds: _.addToSet(openid)
        }
      })
      const teamInfo = {
        _id: team._id,
        name: team.name,
        inviteCode: team.inviteCode,
        ownerOpenId: team.ownerOpenId,
        memberOpenIds: team.memberOpenIds || []
      }
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
          const db = wx.cloud.database()
          const _ = db.command
          await db.collection('teams').doc(teamInfo._id).update({
            data: { memberOpenIds: _.pull(target) }
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
      const db = wx.cloud.database()
      await db.collection('teams').doc(teamInfo._id).update({
        data: { name }
      })
      const latest = { ...teamInfo, name }
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
      const db = wx.cloud.database()
      await db.collection('teams').doc(teamInfo._id).update({
        data: { inviteCode }
      })
      const latest = { ...teamInfo, inviteCode }
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
      const db = wx.cloud.database()
      const _ = db.command
      await db.collection('teams').doc(teamInfo._id).update({
        data: {
          memberOpenIds: _.pull(openid)
        }
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
  }
})

