const api = require('../../../utils/api')
const auth = require('../../../utils/auth')
const { GENDER } = require('../../../utils/constants')

Page({
  data: {
    familyName: '',
    personName: '',
    gender: GENDER.MALE,
    birthYear: '',
    submitting: false
  },

  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value.trim() })
  },

  onPersonNameInput(e) {
    this.setData({ personName: e.detail.value.trim() })
  },

  onGenderChange(e) {
    this.setData({ gender: e.detail.value })
  },

  onBirthYearInput(e) {
    this.setData({ birthYear: e.detail.value.trim() })
  },

  validateForm() {
    const { familyName, personName, birthYear } = this.data
    if (!familyName) {
      api.showError('请输入家庭名称')
      return false
    }
    if (!personName) {
      api.showError('请输入您的姓名')
      return false
    }
    if (birthYear) {
      const year = parseInt(birthYear, 10)
      const currentYear = new Date().getFullYear()
      if (isNaN(year) || year < 1900 || year > currentYear) {
        api.showError('请输入有效的出生年份')
        return false
      }
    }
    return true
  },

  async onSubmit() {
    if (!this.validateForm()) return
    if (this.data.submitting) return

    this.setData({ submitting: true })

    try {
      const { familyName, personName, gender, birthYear } = this.data

      const result = await api.callWithLoading('family/create', {
        name: familyName,
        person_name: personName,
        person_gender: gender,
        person_birth_year: birthYear ? parseInt(birthYear, 10) : undefined
      }, '创建中...')

      // Refresh user info to get updated family_ids
      await auth.login()

      api.showSuccess('创建成功')

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/family/home/index?family_id=${result.family_id}`
        })
      }, 1500)
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ submitting: false })
    }
  }
})
