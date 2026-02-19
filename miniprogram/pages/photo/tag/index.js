const api = require('../../../utils/api')
const auth = require('../../../utils/auth')

Page({
  data: {
    photoId: '',
    familyId: '',
    photo: null,
    tags: [],
    persons: [],
    loading: true,
    showPersonPicker: false,
    pendingPosition: null // { x, y } in 0-100 range from component
  },

  onLoad(options) {
    const { photo_id, family_id } = options
    if (!photo_id || !family_id) {
      api.showError('缺少必要参数')
      wx.navigateBack()
      return
    }

    this.setData({
      photoId: photo_id,
      familyId: family_id
    })
  },

  onShow() {
    this.loadData()
  },

  /**
   * Load photo detail, existing tags, and the person list in parallel.
   */
  async loadData() {
    this.setData({ loading: true })
    try {
      await auth.ensureLogin()

      const [photoResult, personResult] = await Promise.all([
        api.callFunction('photo/detail', {
          photo_id: this.data.photoId,
          family_id: this.data.familyId
        }),
        api.callFunction('person/list', {
          family_id: this.data.familyId
        })
      ])

      const photo = photoResult.photo || photoResult
      const tags = photoResult.tags || photo.tags || []
      const persons = personResult.persons || personResult || []

      this.setData({
        photo: photo,
        tags: tags,
        persons: persons,
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  /**
   * Handle tagplace event from photo-tagger component.
   * The component provides x/y in 0-100 percentage range.
   * Store the position and show the person picker.
   */
  onTagPlace(e) {
    const { x, y } = e.detail
    this.setData({
      pendingPosition: { x: x, y: y },
      showPersonPicker: true
    })
  },

  /**
   * Handle tagtap event from photo-tagger component.
   * Show a confirmation dialog to remove the tag.
   */
  onTagTap(e) {
    const { tagId } = e.detail
    var that = this
    var tag = this.data.tags.find(function (t) { return t._id === tagId })
    var tagName = (tag && tag.person_name) ? tag.person_name : '此标记'

    wx.showModal({
      title: '移除标记',
      content: '确定要移除「' + tagName + '」的标记吗？',
      confirmColor: '#8B4513',
      success: function (res) {
        if (res.confirm) {
          that.removeTag(tagId)
        }
      }
    })
  },

  /**
   * Select a person from the picker list.
   */
  onSelectPerson(e) {
    var index = e.currentTarget.dataset.index
    var person = this.data.persons[index]
    if (!person) return

    this.setData({ showPersonPicker: false })
    this.addTag(person)
  },

  /**
   * Close the person picker without selecting anyone.
   * Also clear the pending tag dot in the component.
   */
  onClosePicker() {
    this.setData({
      showPersonPicker: false,
      pendingPosition: null
    })
    var tagger = this.selectComponent('#photoTagger')
    if (tagger) {
      tagger.clearPending()
    }
  },

  /**
   * Add a tag for the selected person at the pending position.
   * Converts x/y from 0-100 range to 0-1 for the API.
   */
  async addTag(person) {
    var position = this.data.pendingPosition
    if (!position) return

    try {
      await api.callWithLoading('photo/addTag', {
        photo_id: this.data.photoId,
        person_id: person._id,
        x: position.x / 100,
        y: position.y / 100
      }, '标记中...')

      api.showSuccess('标记成功')
      this.setData({ pendingPosition: null })

      var tagger = this.selectComponent('#photoTagger')
      if (tagger) {
        tagger.clearPending()
      }

      // Reload tags to get the updated list
      this.reloadTags()
    } catch (err) {
      api.showError(err)
    }
  },

  /**
   * Remove an existing tag.
   */
  async removeTag(tagId) {
    try {
      await api.callWithLoading('photo/removeTag', {
        tag_id: tagId
      }, '移除中...')

      api.showSuccess('已移除')
      this.reloadTags()
    } catch (err) {
      api.showError(err)
    }
  },

  /**
   * Reload only the tags (after add/remove) without a full page reload.
   */
  async reloadTags() {
    try {
      var result = await api.callFunction('photo/detail', {
        photo_id: this.data.photoId,
        family_id: this.data.familyId
      })
      var photo = result.photo || result
      var tags = result.tags || photo.tags || []
      this.setData({ tags: tags })
    } catch (err) {
      api.showError(err)
    }
  }
})
