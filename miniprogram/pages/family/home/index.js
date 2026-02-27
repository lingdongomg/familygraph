const api = require('../../../utils/api')
const auth = require('../../../utils/auth')

Page({
  data: {
    familyId: '',
    family: null,
    members: [],
    // Graph data
    graphNodes: [],
    graphEdges: [],
    graphTitles: {},
    currentUserId: '',
    loading: true,
    activeTab: 'graph', // 'graph' or 'list'
    showRefPicker: false
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
      const user = await auth.ensureLogin()

      const [family, membersResult, graphData] = await Promise.all([
        api.callFunction('family/getDetail', { family_id: this.data.familyId }),
        api.callFunction('person/list', { family_id: this.data.familyId }),
        api.callFunction('relationship/getGraph', { family_id: this.data.familyId })
      ])

      wx.setNavigationBarTitle({ title: family.name || '家庭' })

      const members = Array.isArray(membersResult) ? membersResult : (membersResult.members || membersResult || [])

      this.setData({
        family,
        members,
        graphNodes: graphData.nodes || [],
        graphEdges: graphData.edges || [],
        graphTitles: graphData.titles || {},
        currentUserId: user.openid_hash || '',
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  onMemberTap(e) {
    const personId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/person/detail/index?person_id=${personId}&family_id=${this.data.familyId}`
    })
  },

  onNodeTap(e) {
    const personId = e.detail.personId
    if (!personId) return

    const { members, familyId } = this.data
    const detailUrl = `/pages/person/detail/index?person_id=${personId}&family_id=${familyId}`

    // Find the current user's bound person in this family
    const myPerson = members.find(m => m.bound_user_id === this.data.currentUserId)

    // Navigate immediately
    wx.navigateTo({ url: detailUrl })

    // Show relationship toast in the background (non-blocking)
    if (myPerson && myPerson._id !== personId) {
      api.callFunction('relationship/computeTitle', {
        family_id: familyId,
        from_person_id: myPerson._id,
        to_person_id: personId
      }).then(result => {
        const title = result && (result.formal_title || result.title)
        if (title) {
          wx.showToast({ title: title, icon: 'none', duration: 2000 })
        }
      }).catch(() => {})
    }
  },

  onAddMember() {
    const { members, familyId } = this.data

    // No members yet — first member mode (no reference needed)
    if (!members || members.length === 0) {
      wx.navigateTo({
        url: `/pages/person/create/index?family_id=${familyId}`
      })
      return
    }

    // Has members — show custom picker (wx.showActionSheet limited to 6 items)
    this.setData({ showRefPicker: true })
  },

  onSelectRef(e) {
    const index = e.currentTarget.dataset.index
    const { members, familyId } = this.data
    const refPerson = members[index]
    this.setData({ showRefPicker: false })
    if (refPerson) {
      wx.navigateTo({
        url: `/pages/person/create/index?family_id=${familyId}&reference_person_id=${refPerson._id}`
      })
    }
  },

  onClosePicker() {
    this.setData({ showRefPicker: false })
  },

  onSettings() {
    wx.navigateTo({
      url: `/pages/family/settings/index?family_id=${this.data.familyId}`
    })
  },

  onShareTap() {
    wx.navigateTo({
      url: `/pages/family/invite/index?family_id=${this.data.familyId}`
    })
  }
})
