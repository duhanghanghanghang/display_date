const app = getApp()

Page({
  data: {
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
    joinedTeams: [],
    maxQuota: 5
  },

  onLoad() {
    this.loadTeam()
    this.loadTeams()
  },

  onShow() {
    this.loadTeam()
    this.loadTeams()
  },

  async ensureOpenId() {
    return app.ensureOpenId()
  },

  // 切换到个人空间
  switchToPersonal() {
    wx.removeStorageSync('teamInfo')
    this.setData({ teamInfo: null, teamMembers: [] })
    wx.showToast({ title: '已切换到个人空间', icon: 'none' })
  },

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
      const { request } = require('../../utils/request')
      const createdRes = await request({ url: '/teams', method: 'GET', data: { type: 'created' } })
      const joinedRes = await request({ url: '/teams', method: 'GET', data: { type: 'joined' } })
      this.setData({
        createdTeams: createdRes.teams || [],
        joinedTeams: joinedRes.teams || []
      })
    } catch (err) {
      console.error('加载团队列表失败', err)
    }
  },

  async fetchTeamDetail(teamId) {
    if (!teamId) return
    this.setData({ loadingTeam: true })
    try {
      const { request } = require('../../utils/request')
      const res = await request({ url: `/teams/${teamId}`, method: 'GET' })
      const team = res.team
      if (team && team._id) {
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
      } else {
        // 文档不存在或无权限
        wx.removeStorageSync('teamInfo')
        this.setData({ teamInfo: null, teamMembers: [] })
        wx.showToast({ title: '团队不存在或无权限', icon: 'none' })
      }
    } catch (err) {
      console.error('获取团队信息失败', err)
      wx.removeStorageSync('teamInfo')
      this.setData({ teamInfo: null, teamMembers: [] })
      wx.showToast({ title: '团队不存在或无权限', icon: 'none' })
    } finally {
      this.setData({ loadingTeam: false })
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

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

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  async createTeam() {
    if (this.data.creating) return
    this.setData({ creating: true })
    try {
      const openid = await this.ensureOpenId()
      const { request } = require('../../utils/request')
      const inviteCode = this.generateCode()
      const name = (this.data.teamNameInput || '我的小组').trim() || '我的小组'
      const quota = this.data.maxQuota
      const res = await request({
        url: '/teams',
        method: 'POST',
        data: { name, inviteCode, quota }
      })
      const teamInfo = { _id: res.id, name, inviteCode, ownerOpenId: openid, memberOpenIds: [openid], quota }
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
      const { request } = require('../../utils/request')
      const res = await request({ url: '/teams/join', method: 'POST', data: { inviteCode: code } })
      if (!res.team) {
        wx.showToast({ title: '邀请码无效', icon: 'none' })
        return
      }
      const team = res.team
      const teamInfo = {
        _id: team._id,
        name: team.name,
        inviteCode: team.inviteCode,
        ownerOpenId: team.ownerOpenId,
        memberOpenIds: team.memberOpenIds || [],
        quota: team.quota || this.data.maxQuota
      }
      wx.setStorageSync('teamInfo', teamInfo)
      this.setData({ teamInfo, teamMembers: teamInfo.memberOpenIds || [] })
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

  async removeMember(e) {
    if (this.removing) return
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
    this.removing = true
    wx.showModal({
      title: '移除成员',
      content: '确定移除该成员吗？',
      success: async (res) => {
        if (!res.confirm) {
          this.removing = false
          return
        }
        try {
          const { request } = require('../../utils/request')
          await request({ url: `/teams/${teamInfo._id}/remove-member`, method: 'PATCH', data: { memberOpenId: target } })
          const newMembers = (teamInfo.memberOpenIds || []).filter(m => m !== target)
          const latest = { ...teamInfo, memberOpenIds: newMembers }
          wx.setStorageSync('teamInfo', latest)
          this.setData({ teamInfo: latest, teamMembers: newMembers })
          wx.showToast({ title: '已移除', icon: 'success' })
        } catch (err) {
          console.error('移除失败', err)
          wx.showToast({ title: '移除失败', icon: 'none' })
        }
        this.removing = false
      }
    })
  },

  async refreshTeam() {
    const teamInfo = this.data.teamInfo
    if (!teamInfo || !teamInfo._id) {
      wx.showToast({ title: '尚未加入团队', icon: 'none' })
      return
    }
    await this.fetchTeamDetail(teamInfo._id)
    this.loadTeams()
  },

  copyInvite(e) {
    const code = e.currentTarget.dataset.code || (this.data.teamInfo && this.data.teamInfo.inviteCode)
    if (!code) {
      wx.showToast({ title: '暂无邀请码', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '已复制邀请码', icon: 'success' })
    })
  },

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
      const { request } = require('../../utils/request')
      await request({ url: `/teams/${teamInfo._id}/rename`, method: 'PATCH', data: { name } })
      const latest = { ...teamInfo, name }
      wx.setStorageSync('teamInfo', latest)
      this.setData({ teamInfo: latest })
      wx.showToast({ title: '已更新名称', icon: 'success' })
      this.loadTeams()
    } catch (err) {
      console.error('重命名失败', err)
      wx.showToast({ title: '重命名失败', icon: 'none' })
    } finally {
      this.setData({ renaming: false })
    }
  },

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
      const { request } = require('../../utils/request')
      await request({ url: `/teams/${teamInfo._id}/regenerate-invite`, method: 'PATCH', data: { inviteCode } })
      const latest = { ...teamInfo, inviteCode }
      wx.setStorageSync('teamInfo', latest)
      this.setData({ teamInfo: latest })
      wx.showToast({ title: '已重置邀请码', icon: 'success' })
      this.loadTeams()
    } catch (err) {
      console.error('重置邀请码失败', err)
      wx.showToast({ title: '重置失败', icon: 'none' })
    } finally {
      this.setData({ regenerating: false })
    }
  },

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
      const { request } = require('../../utils/request')
      await request({ url: `/teams/${teamInfo._id}/leave`, method: 'PATCH' })
      wx.removeStorageSync('teamInfo')
      this.setData({ teamInfo: null, teamMembers: [] })
      wx.showToast({ title: '已退出团队', icon: 'success' })
      this.loadTeams()
    } catch (err) {
      console.error('退出团队失败', err)
      wx.showToast({ title: '退出失败', icon: 'none' })
    } finally {
      this.setData({ leaving: false })
    }
  },

  generateCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase()
  }
})

