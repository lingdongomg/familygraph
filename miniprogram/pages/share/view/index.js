const api = require('../../../utils/api')

Page({
  data: {
    shareCode: '',
    familyName: '',
    persons: [],
    relationships: [],
    graphNodes: [],
    graphEdges: [],
    graphWidth: 375,
    graphHeight: 500,
    loading: true,
    error: false,
    errorMessage: ''
  },

  onLoad(options) {
    if (options.share_code) {
      this.setData({ shareCode: options.share_code })
      this.loadShareData()
    } else {
      this.setData({
        loading: false,
        error: true,
        errorMessage: '缺少分享码'
      })
    }
  },

  async loadShareData() {
    this.setData({ loading: true, error: false })

    try {
      const res = await api.callFunction('family/getByShareCode', {
        share_code: this.data.shareCode
      })

      const persons = res.persons || []
      const relationships = res.relationships || []

      wx.setNavigationBarTitle({ title: res.family_name || '家庭图谱' })

      // Get screen width for graph sizing
      const sysInfo = wx.getSystemInfoSync()
      const graphWidth = sysInfo.windowWidth - 60
      const graphHeight = 500

      this.setData({
        familyName: res.family_name || '',
        persons: persons,
        relationships: relationships,
        graphNodes: persons,
        graphEdges: relationships,
        graphWidth: graphWidth,
        graphHeight: graphHeight,
        loading: false
      })
    } catch (err) {
      this.setData({
        loading: false,
        error: true,
        errorMessage: err.message || '分享链接无效或已过期'
      })
    }
  },

  onJoinFamily() {
    wx.navigateTo({
      url: '/pages/family/join/index'
    })
  },

  onRetry() {
    this.loadShareData()
  }
})
