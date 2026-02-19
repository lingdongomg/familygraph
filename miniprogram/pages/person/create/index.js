const api = require('../../../utils/api')
const auth = require('../../../utils/auth')
const { RELATION_TYPES, RELATION_TYPE_LABELS, GENDER } = require('../../../utils/constants')

Page({
  data: {
    familyId: '',
    referencePersonId: '',
    referencePersonName: '',
    name: '',
    gender: GENDER.MALE,
    birthYear: '',
    isDeceased: false,
    selectedRelation: '',
    relationTypes: [],
    submitting: false
  },

  onLoad(options) {
    const { family_id, reference_person_id } = options
    if (!family_id || !reference_person_id) {
      api.showError('缺少必要参数')
      wx.navigateBack()
      return
    }

    // Build relation type grid data
    const relationTypes = Object.keys(RELATION_TYPES).map(key => ({
      value: RELATION_TYPES[key],
      label: RELATION_TYPE_LABELS[key]
    }))

    this.setData({
      familyId: family_id,
      referencePersonId: reference_person_id,
      relationTypes
    })

    this.loadReferencePerson()
  },

  async loadReferencePerson() {
    try {
      await auth.ensureLogin()
      const person = await api.callFunction('person/getDetail', {
        person_id: this.data.referencePersonId,
        family_id: this.data.familyId
      })
      this.setData({
        referencePersonName: person.name || '未知'
      })
    } catch (err) {
      api.showError(err)
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

  onDeceasedChange(e) {
    this.setData({ isDeceased: e.detail.value })
  },

  onRelationSelect(e) {
    this.setData({ selectedRelation: e.detail.value })
  },

  async onSubmit() {
    const { name, gender, birthYear, isDeceased, selectedRelation, familyId, referencePersonId } = this.data

    if (!name.trim()) {
      api.showError('请输入姓名')
      return
    }
    if (!selectedRelation) {
      api.showError('请选择关系')
      return
    }

    this.setData({ submitting: true })

    try {
      await auth.ensureLogin()
      await api.callWithLoading('person/create', {
        family_id: familyId,
        reference_person_id: referencePersonId,
        relation_type: selectedRelation,
        name: name.trim(),
        gender,
        birth_year: birthYear ? parseInt(birthYear) : undefined,
        is_deceased: isDeceased
      }, '添加中...')

      api.showSuccess('添加成功')
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
