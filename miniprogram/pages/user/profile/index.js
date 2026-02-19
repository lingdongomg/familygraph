const auth = require('../../../utils/auth')
const api = require('../../../utils/api')

Page({
  data: {
    user: null,
    families: [],
    loading: true,
    editingNickname: false,
    nicknameInput: ''
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const user = await auth.ensureLogin()
      this.setData({
        user,
        nicknameInput: user.nick_name || ''
      })

      await this.loadFamilies(user)
    } catch (err) {
      api.showError('加载失败，请重试')
    }
    this.setData({ loading: false })
  },

  async loadFamilies(user) {
    if (!user.family_ids || user.family_ids.length === 0) {
      this.setData({ families: [] })
      return
    }

    const families = []
    for (const fid of user.family_ids) {
      try {
        const detail = await api.callFunction('family/getDetail', { family_id: fid })
        families.push(detail)
      } catch (e) {
        console.error('加载家庭失败', fid, e)
      }
    }
    this.setData({ families })
  },

  // --- Avatar ---

  onChangeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadAvatar(tempFilePath)
      }
    })
  },

  async uploadAvatar(filePath) {
    wx.showLoading({ title: '上传中...', mask: true })
    try {
      const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })

      const avatar_url = uploadRes.fileID
      await api.callFunction('user/updateProfile', { avatar_url })

      const user = this.data.user
      user.avatar_url = avatar_url
      auth.setUser(user)
      this.setData({ user })

      api.showSuccess('头像已更新')
    } catch (err) {
      api.showError('上传头像失败')
    }
    wx.hideLoading()
  },

  // --- Nickname ---

  onEditNickname() {
    this.setData({
      editingNickname: true,
      nicknameInput: this.data.user.nick_name || ''
    })
  },

  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value })
  },

  onNicknameCancel() {
    this.setData({
      editingNickname: false,
      nicknameInput: this.data.user.nick_name || ''
    })
  },

  async onNicknameConfirm() {
    const nick_name = this.data.nicknameInput.trim()
    if (!nick_name) {
      api.showError('昵称不能为空')
      return
    }
    if (nick_name === this.data.user.nick_name) {
      this.setData({ editingNickname: false })
      return
    }

    try {
      await api.callWithLoading('user/updateProfile', { nick_name }, '保存中...')

      const user = this.data.user
      user.nick_name = nick_name
      auth.setUser(user)
      this.setData({ user, editingNickname: false })

      api.showSuccess('昵称已更新')
    } catch (err) {
      api.showError('更新昵称失败')
    }
  },

  // --- Navigation ---

  onEnterFamily(e) {
    const familyId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/family/home/index?family_id=${familyId}` })
  },

  onAbout() {
    wx.showModal({
      title: '关于亲记',
      content: '亲记 — 用心记录家庭的故事\n\n版本：1.0.0',
      showCancel: false,
      confirmText: '好的',
      confirmColor: '#8B4513'
    })
  }
})
