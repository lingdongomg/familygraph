const auth = require('../../utils/auth')
const api = require('../../utils/api')

Page({
  data: {
    families: [],
    loading: true,
    isLoggedIn: false
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      const user = await auth.ensureLogin()
      this.setData({ isLoggedIn: true })

      if (user.family_ids && user.family_ids.length > 0) {
        // Load family details for each family_id
        const families = []
        for (const fid of user.family_ids) {
          try {
            const detail = await api.callFunction('family/getDetail', { family_id: fid })
            families.push(detail)
          } catch (e) {
            console.error('加载家庭失败', fid, e)
          }
        }
        this.setData({ families, loading: false })
      } else {
        this.setData({ families: [], loading: false })
      }
    } catch (err) {
      api.showError('登录失败，请重试')
      this.setData({ loading: false })
    }
  },

  onCreateFamily() {
    wx.navigateTo({ url: '/pages/family/create/index' })
  },

  onJoinFamily() {
    wx.navigateTo({ url: '/pages/family/join/index' })
  },

  onEnterFamily(e) {
    const familyId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/family/home/index?family_id=${familyId}` })
  }
})
