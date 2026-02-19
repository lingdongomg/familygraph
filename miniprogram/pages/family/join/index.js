const api = require('../../../utils/api')
const auth = require('../../../utils/auth')

Page({
  data: {
    // Step control: 1 = enter invite code, 2 = select person
    step: 1,

    // Step 1
    inviteCode: '',
    validating: false,

    // Step 2
    familyName: '',
    familyId: '',
    persons: [],        // unbound persons list
    selectedPersonId: '',
    submitting: false
  },

  onLoad(options) {
    // Support receiving invite_code via query param (e.g. from QR scan)
    if (options.invite_code) {
      this.setData({ inviteCode: options.invite_code })
      // Auto-validate if code was passed in
      this.onValidate()
    }
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value.trim() })
  },

  /**
   * Step 1: Validate the invite code and fetch family info + unbound persons.
   * Calls member/validateInvite which should return family_name, family_id,
   * and a list of unbound persons (persons where bound_user_id is null).
   */
  async onValidate() {
    const { inviteCode } = this.data

    if (!inviteCode) {
      api.showError('请输入邀请码')
      return
    }

    if (inviteCode.length !== 6) {
      api.showError('邀请码为6位字符')
      return
    }

    if (this.data.validating) return
    this.setData({ validating: true })

    try {
      await auth.ensureLogin()

      const result = await api.callWithLoading('member/validateInvite', {
        invite_code: inviteCode
      }, '验证中...')

      // result should contain: family_id, family_name, persons (unbound only)
      const persons = (result.persons || []).filter(function (p) {
        return !p.bound_user_id
      })

      if (persons.length === 0) {
        api.showError('该家庭暂无可绑定的成员')
        this.setData({ validating: false })
        return
      }

      this.setData({
        step: 2,
        familyId: result.family_id,
        familyName: result.family_name,
        persons: persons,
        validating: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ validating: false })
    }
  },

  /**
   * Go back to step 1 to re-enter invite code
   */
  onBackToStep1() {
    this.setData({
      step: 1,
      familyName: '',
      familyId: '',
      persons: [],
      selectedPersonId: ''
    })
  },

  /**
   * User selects a person from the radio list
   */
  onPersonSelect(e) {
    this.setData({ selectedPersonId: e.detail.value })
  },

  /**
   * Step 2: Submit the join request with invite_code and selected person_id.
   * Calls member/applyJoin which validates and creates a join_request.
   */
  async onSubmit() {
    const { inviteCode, selectedPersonId } = this.data

    if (!selectedPersonId) {
      api.showError('请选择您对应的成员')
      return
    }

    if (this.data.submitting) return
    this.setData({ submitting: true })

    try {
      await auth.ensureLogin()

      await api.callWithLoading('member/applyJoin', {
        invite_code: inviteCode,
        person_id: selectedPersonId
      }, '提交中...')

      api.showSuccess('申请已提交')

      // Navigate back after a short delay
      setTimeout(function () {
        wx.navigateBack({ delta: 1 })
      }, 1500)
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ submitting: false })
    }
  }
})
