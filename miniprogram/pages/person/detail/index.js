const api = require('../../../utils/api')
const auth = require('../../../utils/auth')
const { GENDER, RELATION_TYPE_LABELS } = require('../../../utils/constants')

Page({
  data: {
    personId: '',
    familyId: '',
    person: null,
    photos: [],
    loading: true,
    genderLabel: ''
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
  },

  onShow() {
    if (this.data.personId) {
      this.loadPersonDetail()
    }
  },

  async loadPersonDetail() {
    this.setData({ loading: true })

    try {
      await auth.ensureLogin()
      const person = await api.callFunction('person/getDetail', {
        person_id: this.data.personId,
        family_id: this.data.familyId
      })

      const genderLabel = person.gender === GENDER.MALE ? '男' : person.gender === GENDER.FEMALE ? '女' : '未填写'

      this.setData({
        person,
        genderLabel,
        photos: person.photos ? person.photos.slice(0, 4) : [],
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  onEditShared() {
    wx.navigateTo({
      url: `/pages/person/edit/index?person_id=${this.data.personId}&family_id=${this.data.familyId}`
    })
  },

  onEditPrivate() {
    wx.navigateTo({
      url: `/pages/person/privacy/index?person_id=${this.data.personId}&family_id=${this.data.familyId}`
    })
  },

  onViewAlbum() {
    wx.navigateTo({
      url: `/pages/photo/album/index?person_id=${this.data.personId}&family_id=${this.data.familyId}`
    })
  },

  onPreviewPhoto(e) {
    const { url } = e.currentTarget.dataset
    const urls = this.data.photos.map(p => p.url)
    wx.previewImage({
      current: url,
      urls
    })
  }
})
