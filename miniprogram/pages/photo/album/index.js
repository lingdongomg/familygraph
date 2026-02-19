const api = require('../../../utils/api')
const auth = require('../../../utils/auth')
const { MAX_PHOTOS_PER_PERSON } = require('../../../utils/constants')
const { compressImage } = require('../../../utils/imageCompressor')

Page({
  data: {
    personId: '',
    familyId: '',
    personName: '',
    photos: [],
    loading: true,
    uploading: false,
    photoCount: 0,
    maxPhotos: MAX_PHOTOS_PER_PERSON
  },

  onLoad(options) {
    this.setData({
      personId: options.person_id || '',
      familyId: options.family_id || '',
      personName: options.person_name || '照片'
    })
    wx.setNavigationBarTitle({
      title: (options.person_name || '') + '的照片'
    })
  },

  onShow() {
    this.loadPhotos()
  },

  async loadPhotos() {
    this.setData({ loading: true })
    try {
      await auth.ensureLogin()
      const result = await api.callFunction('photo/list', {
        person_id: this.data.personId,
        family_id: this.data.familyId
      })
      const photos = result.photos || result || []
      this.setData({
        photos: photos,
        photoCount: photos.length,
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  onTapPhoto(e) {
    const { photo } = e.currentTarget.dataset
    if (!photo) return
    wx.navigateTo({
      url: '/pages/photo/viewer/index?photo_id=' + photo._id + '&family_id=' + this.data.familyId
    })
  },

  async onUpload() {
    if (this.data.photoCount >= this.data.maxPhotos) {
      api.showError('最多上传 ' + this.data.maxPhotos + ' 张照片')
      return
    }

    try {
      const mediaRes = await new Promise(function (resolve, reject) {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        })
      })

      const tempFile = mediaRes.tempFiles[0]
      if (!tempFile) return

      this.setData({ uploading: true })
      wx.showLoading({ title: '压缩中...', mask: true })

      const compressed = await compressImage(tempFile.tempFilePath)

      wx.showLoading({ title: '上传中...', mask: true })

      const cloudPath = 'photos/' + this.data.familyId + '/' + this.data.personId + '/' + Date.now() + '.jpg'
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: compressed.tempFilePath
      })

      wx.showLoading({ title: '保存中...', mask: true })

      await api.callFunction('photo/upload', {
        person_id: this.data.personId,
        family_id: this.data.familyId,
        file_id: uploadRes.fileID,
        width: compressed.width,
        height: compressed.height,
        size: compressed.size
      })

      wx.hideLoading()
      api.showSuccess('上传成功')
      this.loadPhotos()
    } catch (err) {
      wx.hideLoading()
      if (err.errMsg && err.errMsg.indexOf('chooseMedia:fail cancel') !== -1) {
        return
      }
      api.showError(err)
    } finally {
      this.setData({ uploading: false })
    }
  },

  onPullDownRefresh() {
    this.loadPhotos().then(function () {
      wx.stopPullDownRefresh()
    })
  }
})
