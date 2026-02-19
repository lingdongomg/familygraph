const api = require('../../../utils/api')
const auth = require('../../../utils/auth')

Page({
  data: {
    personId: '',
    familyId: '',
    phone: '',
    wechatId: '',
    birthDate: '',
    city: '',
    occupation: '',
    customTitle: '',
    remark: '',
    loading: true,
    submitting: false
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

    this.loadNote()
  },

  async loadNote() {
    try {
      await auth.ensureLogin()
      const note = await api.callFunction('note/get', {
        family_id: this.data.familyId,
        person_id: this.data.personId
      })

      if (note) {
        this.setData({
          phone: note.phone || '',
          wechatId: note.wechat_id || '',
          birthDate: note.birth_date || '',
          city: note.city || '',
          occupation: note.occupation || '',
          customTitle: note.custom_title || '',
          remark: note.remark || '',
          loading: false
        })
      } else {
        this.setData({ loading: false })
      }
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onWechatIdInput(e) {
    this.setData({ wechatId: e.detail.value })
  },

  onBirthDateChange(e) {
    this.setData({ birthDate: e.detail.value })
  },

  onCityInput(e) {
    this.setData({ city: e.detail.value })
  },

  onOccupationInput(e) {
    this.setData({ occupation: e.detail.value })
  },

  onCustomTitleInput(e) {
    this.setData({ customTitle: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  async onSubmit() {
    this.setData({ submitting: true })

    try {
      await auth.ensureLogin()

      const params = {
        family_id: this.data.familyId,
        person_id: this.data.personId
      }

      const { phone, wechatId, birthDate, city, occupation, customTitle, remark } = this.data

      if (phone) params.phone = phone
      if (wechatId) params.wechat_id = wechatId
      if (birthDate) params.birth_date = birthDate
      if (city) params.city = city
      if (occupation) params.occupation = occupation
      if (customTitle) params.custom_title = customTitle
      if (remark) params.remark = remark

      await api.callWithLoading('note/upsert', params, '保存中...')

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
