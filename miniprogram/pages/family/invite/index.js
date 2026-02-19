const api = require('../../../utils/api')

Page({
  data: {
    familyId: '',
    familyName: '',
    inviteCode: '',
    expireAt: '',
    loading: false,
    hasCode: false
  },

  onLoad(options) {
    if (options.family_id) {
      this.setData({ familyId: options.family_id })
      this.loadFamily()
    }
  },

  async loadFamily() {
    try {
      const family = await api.callFunction('family/getDetail', {
        family_id: this.data.familyId
      })
      this.setData({ familyName: family.name || '' })
    } catch (err) {
      // ignore, name is optional display
    }
  },

  async onGenerateCode() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const result = await api.callWithLoading('family/generateInviteCode', {
        family_id: this.data.familyId
      }, '生成中...')

      const expireDate = new Date(result.expire_at)
      const expireStr = expireDate.getFullYear() + '-' +
        String(expireDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(expireDate.getDate()).padStart(2, '0')

      this.setData({
        inviteCode: result.invite_code,
        expireAt: expireStr,
        hasCode: true,
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  onCopyCode() {
    if (!this.data.inviteCode) return
    wx.setClipboardData({
      data: this.data.inviteCode,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  }
})
