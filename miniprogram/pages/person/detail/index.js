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
    genderLabel: '',
    canDelete: false
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
      const [person, photoResult] = await Promise.all([
        api.callFunction('person/getDetail', {
          person_id: this.data.personId,
          family_id: this.data.familyId
        }),
        api.callFunction('photo/list', {
          person_id: this.data.personId,
          family_id: this.data.familyId
        }).catch(() => ({ photos: [] }))
      ])

      const genderLabel = person.gender === GENDER.MALE ? '男' : person.gender === GENDER.FEMALE ? '女' : '未填写'
      const allPhotos = photoResult.photos || photoResult || []

      this.setData({
        person,
        genderLabel,
        canDelete: !!person._can_delete,
        photos: allPhotos.slice(0, 4),
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
    const personName = this.data.person ? encodeURIComponent(this.data.person.name || '') : ''
    wx.navigateTo({
      url: `/pages/photo/album/index?person_id=${this.data.personId}&family_id=${this.data.familyId}&person_name=${personName}`
    })
  },

  onPreviewPhoto(e) {
    const { fileId } = e.currentTarget.dataset
    const urls = this.data.photos.map(p => p.file_id)
    wx.previewImage({
      current: fileId,
      urls
    })
  },

  onDelete() {
    const { personId, familyId, person } = this.data
    wx.showModal({
      title: '确认删除',
      content: `确定要删除成员「${person.name}」吗？删除后相关关系、照片和备注将一并清除，此操作不可撤销。`,
      confirmColor: '#E53935',
      success: (res) => {
        if (!res.confirm) return
        api.callWithLoading('person/delete', {
          person_id: personId,
          family_id: familyId
        }, '删除中...').then(() => {
          api.showSuccess('已删除')
          wx.navigateBack()
        }).catch((err) => {
          api.showError(err)
        })
      }
    })
  }
})
