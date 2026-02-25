const api = require('../../../utils/api')
const auth = require('../../../utils/auth')
const { GENDER } = require('../../../utils/constants')

Page({
  data: {
    personId: '',
    familyId: '',
    name: '',
    gender: GENDER.MALE,
    birthYear: '',
    avatar: '',
    avatarPublic: false,
    canToggleAvatarPublic: false,
    loading: true,
    submitting: false,
    cropping: false,
    cropSrc: ''
  },

  onLoad(options) {
    const { person_id, family_id } = options
    if (!person_id || !family_id) {
      api.showError('缺少必要参数')
      wx.navigateBack()
      return
    }

    this.setData({
      personId: person_id,
      familyId: family_id
    })

    this.loadPerson()
  },

  async loadPerson() {
    try {
      const user = await auth.ensureLogin()
      const person = await api.callFunction('person/getDetail', {
        person_id: this.data.personId,
        family_id: this.data.familyId
      })

      // avatar_public can only be toggled by the bound user or owner
      const isSelf = person.bound_user_id === (user.openid_hash || '')
      // We don't know the caller's role here directly, but the server enforces it
      // Show the toggle if bound to this person (simplest check)
      const canToggle = !!isSelf

      this.setData({
        name: person.name || '',
        gender: person.gender || GENDER.MALE,
        birthYear: person.birth_year ? String(person.birth_year) : '',
        avatar: person.avatar || '',
        avatarPublic: !!person.avatar_public,
        canToggleAvatarPublic: canToggle,
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onGenderChange(e) {
    this.setData({ gender: e.detail.value })
  },

  onBirthYearInput(e) {
    this.setData({ birthYear: e.detail.value })
  },

  onAvatarPublicChange(e) {
    this.setData({ avatarPublic: e.detail.value })
  },

  async onChooseAvatar() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        })
      })

      const tempFilePath = res.tempFiles[0].tempFilePath
      this.setData({ cropping: true, cropSrc: tempFilePath })
    } catch (err) {
      if (err.errMsg && err.errMsg.indexOf('cancel') > -1) return
      api.showError('选择图片失败')
    }
  },

  async onCropConfirm(e) {
    const tempFilePath = e.detail.tempFilePath
    this.setData({ cropping: false, cropSrc: '' })

    try {
      wx.showLoading({ title: '上传中...', mask: true })

      const cloudPath = `avatars/${this.data.familyId}/${this.data.personId}_${Date.now()}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath
      })

      this.setData({ avatar: uploadRes.fileID })
      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      api.showError('上传头像失败')
    }
  },

  onCropCancel() {
    this.setData({ cropping: false, cropSrc: '' })
  },

  async onSubmit() {
    const { name, gender, birthYear, avatar, avatarPublic, personId, familyId } = this.data

    if (!name.trim()) {
      api.showError('请输入姓名')
      return
    }

    this.setData({ submitting: true })

    try {
      await auth.ensureLogin()
      await api.callWithLoading('person/update', {
        person_id: personId,
        family_id: familyId,
        name: name.trim(),
        gender,
        birth_year: birthYear ? parseInt(birthYear) : null,
        avatar: avatar || null,
        avatar_public: avatarPublic
      }, '保存中...')

      api.showSuccess('保存成功')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ submitting: false })
    }
  }
})
