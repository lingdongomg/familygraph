const api = require('../../../utils/api')
const auth = require('../../../utils/auth')

Page({
  data: {
    photoId: '',
    familyId: '',
    photo: null,
    tags: [],
    loading: true,
    isOwnerOrUploader: false,
    showTags: true
  },

  onLoad(options) {
    this.setData({
      photoId: options.photo_id || '',
      familyId: options.family_id || ''
    })
  },

  onShow() {
    this.loadPhotoDetail()
  },

  async loadPhotoDetail() {
    this.setData({ loading: true })
    try {
      const user = await auth.ensureLogin()
      const result = await api.callFunction('photo/detail', {
        photo_id: this.data.photoId,
        family_id: this.data.familyId
      })
      const photo = result.photo || result
      const tags = result.tags || photo.tags || []
      const isOwnerOrUploader = photo.uploader_id === user._id || photo.owner_id === user._id

      this.setData({
        photo: photo,
        tags: tags,
        isOwnerOrUploader: isOwnerOrUploader,
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  onToggleTags() {
    this.setData({ showTags: !this.data.showTags })
  },

  onTapTag(e) {
    const { tag } = e.currentTarget.dataset
    if (!tag || !tag.person_id) return
    wx.navigateTo({
      url: '/pages/person/detail/index?person_id=' + tag.person_id + '&family_id=' + this.data.familyId
    })
  },

  onTagPhoto() {
    wx.navigateTo({
      url: '/pages/photo/tag/index?photo_id=' + this.data.photoId + '&family_id=' + this.data.familyId
    })
  },

  onDeletePhoto() {
    var that = this
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这张照片吗？',
      confirmColor: '#e64340',
      success: function (res) {
        if (res.confirm) {
          that.doDelete()
        }
      }
    })
  },

  async doDelete() {
    try {
      await api.callWithLoading('photo/delete', {
        photo_id: this.data.photoId,
        family_id: this.data.familyId
      }, '删除中...')
      api.showSuccess('已删除')
      setTimeout(function () {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      api.showError(err)
    }
  },

  onPreviewImage() {
    if (!this.data.photo) return
    wx.previewImage({
      current: this.data.photo.file_id,
      urls: [this.data.photo.file_id]
    })
  }
})
