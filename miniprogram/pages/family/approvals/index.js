const api = require('../../../utils/api')
const auth = require('../../../utils/auth')

Page({
  data: {
    familyId: '',
    requests: [],
    loading: true,
    processing: false
  },

  onLoad(options) {
    if (options.family_id) {
      this.setData({ familyId: options.family_id })
    }
  },

  async onShow() {
    if (this.data.familyId) {
      await this.loadRequests()
    }
  },

  async loadRequests() {
    this.setData({ loading: true })
    try {
      await auth.ensureLogin()
      const result = await api.callFunction('member/listJoinRequests', {
        family_id: this.data.familyId
      })
      this.setData({
        requests: result.requests || result || [],
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  async onPullDownRefresh() {
    await this.loadRequests()
    wx.stopPullDownRefresh()
  },

  async onApprove(e) {
    const requestId = e.detail.requestId
    if (this.data.processing) return
    this.setData({ processing: true })
    try {
      await api.callWithLoading('member/reviewJoin', {
        request_id: requestId,
        approved: true
      }, '审批中...')
      api.showSuccess('已通过')
      await this.loadRequests()
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ processing: false })
    }
  },

  async onReject(e) {
    const requestId = e.detail.requestId
    if (this.data.processing) return
    try {
      const res = await new Promise((resolve) => {
        wx.showModal({
          title: '确认拒绝',
          content: '确定要拒绝该加入申请吗？',
          confirmColor: '#8B4513',
          success: resolve
        })
      })
      if (!res.confirm) return
      this.setData({ processing: true })
      await api.callWithLoading('member/reviewJoin', {
        request_id: requestId,
        approved: false
      }, '处理中...')
      api.showSuccess('已拒绝')
      await this.loadRequests()
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ processing: false })
    }
  }
})
