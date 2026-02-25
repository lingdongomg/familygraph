const api = require('../../../utils/api')
const auth = require('../../../utils/auth')

Page({
  data: {
    familyId: '',
    family: null,
    members: [],
    myRole: '',
    loading: true
  },

  onLoad(options) {
    if (options.family_id) {
      this.setData({ familyId: options.family_id })
    }
  },

  onShow() {
    if (this.data.familyId) {
      this.loadData()
    }
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const [family, membersData] = await Promise.all([
        api.callFunction('family/getDetail', { family_id: this.data.familyId }),
        api.callFunction('member/list', { family_id: this.data.familyId })
      ])

      const user = auth.getUser()
      const membersList = Array.isArray(membersData) ? membersData : (membersData.members || [])
      const me = membersList.find(m => m.openid_hash === user.openid_hash)
      const myRole = me ? me.role : ''

      this.setData({
        family,
        members: membersList,
        myRole,
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  onInvite() {
    wx.navigateTo({
      url: `/pages/family/invite/index?family_id=${this.data.familyId}`
    })
  },

  onApprovals() {
    wx.navigateTo({
      url: `/pages/family/approvals/index?family_id=${this.data.familyId}`
    })
  },

  onEditHistory() {
    wx.navigateTo({
      url: `/pages/history/index/index?family_id=${this.data.familyId}`
    })
  },

  onTitleMap() {
    wx.navigateTo({
      url: `/pages/family/titlemap/index?family_id=${this.data.familyId}`
    })
  },

  async onGenerateShareLink() {
    try {
      const result = await api.callWithLoading('family/generateShareLink', {
        family_id: this.data.familyId
      }, '生成中...')

      wx.setClipboardData({
        data: result.code,
        success() {
          wx.showToast({ title: '分享码已复制', icon: 'success' })
        }
      })
    } catch (err) {
      api.showError(err)
    }
  },

  async onChangeRole(e) {
    const { userId, currentRole } = e.currentTarget.dataset
    const newRole = currentRole === 'member' ? 'restricted' : 'member'
    const roleLabel = newRole === 'restricted' ? '受限成员' : '普通成员'

    wx.showModal({
      title: '修改角色',
      content: `确定将该成员修改为"${roleLabel}"吗？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.callWithLoading('member/changeRole', {
            family_id: this.data.familyId,
            target_user_id: userId,
            new_role: newRole
          }, '修改中...')
          api.showSuccess('角色已修改')
          this.loadData()
        } catch (err) {
          api.showError(err)
        }
      }
    })
  },

  async onLeaveFamily() {
    wx.showModal({
      title: '退出家庭',
      content: '确定要退出该家庭吗？退出后您的绑定关系将被解除。',
      confirmColor: '#E53935',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.callWithLoading('member/leave', {
            family_id: this.data.familyId
          }, '退出中...')
          api.showSuccess('已退出家庭')
          wx.navigateBack({ delta: 10 })
        } catch (err) {
          api.showError(err)
        }
      }
    })
  },

  async onDeleteFamily() {
    wx.showModal({
      title: '删除家庭',
      content: '此操作不可恢复！将删除所有成员、关系、照片和历史记录。确定要删除吗？',
      confirmColor: '#E53935',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.callWithLoading('family/delete', {
            family_id: this.data.familyId
          }, '删除中...')
          api.showSuccess('家庭已删除')
          wx.navigateBack({ delta: 10 })
        } catch (err) {
          api.showError(err)
        }
      }
    })
  }
})
