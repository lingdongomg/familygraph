const api = require('../../../utils/api')
const auth = require('../../../utils/auth')

// 关系类型中英文映射
const RELATION_OPTIONS = [
  { label: '爸爸', value: 'FATHER' },
  { label: '妈妈', value: 'MOTHER' },
  { label: '儿子', value: 'SON' },
  { label: '女儿', value: 'DAUGHTER' },
  { label: '丈夫', value: 'HUSBAND' },
  { label: '妻子', value: 'WIFE' },
  { label: '哥哥', value: 'OLDER_BROTHER' },
  { label: '弟弟', value: 'YOUNGER_BROTHER' },
  { label: '姐姐', value: 'OLDER_SISTER' },
  { label: '妹妹', value: 'YOUNGER_SISTER' }
]

const RELATION_LABEL_MAP = {}
const RELATION_VALUE_MAP = {}
for (const opt of RELATION_OPTIONS) {
  RELATION_LABEL_MAP[opt.value] = opt.label
  RELATION_VALUE_MAP[opt.label] = opt.value
}

const MALE_RELATIONS = new Set(['FATHER', 'SON', 'HUSBAND', 'OLDER_BROTHER', 'YOUNGER_BROTHER'])

function inferGender(relationValue) {
  return MALE_RELATIONS.has(relationValue) ? 'male' : 'female'
}

function buildPathKey(pathSteps, gender) {
  if (!pathSteps || pathSteps.length === 0) return ''
  const path = pathSteps.map(s => s.value).join('>')
  return path + '|' + gender
}

function parsePathKeyToDisplay(pathKey) {
  if (!pathKey || !pathKey.includes('|')) return pathKey
  const [pathPart, genderPart] = pathKey.split('|')
  const steps = pathPart.split('>')
  const labels = steps.map(s => RELATION_LABEL_MAP[s] || s)
  const genderLabel = genderPart === 'male' ? '男' : '女'
  return labels.join(' → ') + ' (' + genderLabel + ')'
}

Page({
  data: {
    familyId: '',
    loading: true,
    myMaps: [],
    sharedMaps: [],
    adoptedMapId: '',
    adoptedMapName: '',
    // Editor state
    showEditor: false,
    editingMapId: '',
    editorName: '',
    editorShared: false,
    editorOverrides: [],
    // New override builder state
    relationOptions: RELATION_OPTIONS.map(o => o.label),
    pathSteps: [],       // [{ label: '妈妈', value: 'MOTHER', pickerIndex: 1 }, ...]
    overrideGender: '',  // 'male' or 'female'
    newOverrideValue: ''
  },

  onLoad(options) {
    if (options.family_id) {
      this.setData({ familyId: options.family_id })
    }
  },

  onShow() {
    if (this.data.familyId) {
      this.loadData()
    }
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      await auth.ensureLogin()
      const [maps, memberData] = await Promise.all([
        api.callFunction('titlemap/list', { family_id: this.data.familyId }),
        api.callFunction('member/getSelf', { family_id: this.data.familyId }).catch(() => null)
      ])

      const user = auth.getUser()
      const openidHash = user.openid_hash || ''

      const adoptedMapId = (memberData && memberData.adopted_title_map_id) || ''

      const allMaps = Array.isArray(maps) ? maps : []
      const myMaps = []
      const sharedMaps = []

      for (const m of allMaps) {
        const item = Object.assign({}, m, {
          overrideCount: m.overrides ? Object.keys(m.overrides).length : 0
        })
        if (m.creator_id === openidHash || m._isMine) {
          myMaps.push(item)
        } else {
          sharedMaps.push(item)
        }
      }

      let adoptedMapName = ''
      if (adoptedMapId) {
        const found = allMaps.find(m => m._id === adoptedMapId)
        adoptedMapName = found ? found.name : '(已删除)'
      }

      this.setData({
        myMaps,
        sharedMaps,
        adoptedMapId,
        adoptedMapName,
        loading: false
      })
    } catch (err) {
      api.showError(err)
      this.setData({ loading: false })
    }
  },

  onCreateMap() {
    this.setData({
      showEditor: true,
      editingMapId: '',
      editorName: '',
      editorShared: false,
      editorOverrides: [],
      pathSteps: [],
      overrideGender: '',
      newOverrideValue: ''
    })
  },

  async onEditMap(e) {
    const mapId = e.currentTarget.dataset.id
    try {
      const map = await api.callFunction('titlemap/get', { title_map_id: mapId })
      const overrides = map.overrides || {}
      const editorOverrides = Object.entries(overrides).map(([key, value]) => ({
        key,
        value,
        displayKey: parsePathKeyToDisplay(key)
      }))
      this.setData({
        showEditor: true,
        editingMapId: mapId,
        editorName: map.name || '',
        editorShared: !!map.is_shared,
        editorOverrides,
        pathSteps: [],
        overrideGender: '',
        newOverrideValue: ''
      })
    } catch (err) {
      api.showError(err)
    }
  },

  onCloseEditor() {
    this.setData({ showEditor: false })
  },

  onEditorNameInput(e) {
    this.setData({ editorName: e.detail.value })
  },

  onEditorSharedChange(e) {
    this.setData({ editorShared: e.detail.value })
  },

  // --- Path step picker handlers ---

  onAddPathStep() {
    const pathSteps = this.data.pathSteps.slice()
    if (pathSteps.length >= 5) return
    pathSteps.push({ label: '', value: '', pickerIndex: -1 })
    this.setData({ pathSteps })
  },

  onPathStepChange(e) {
    const idx = parseInt(e.currentTarget.dataset.idx, 10)
    const pickerIndex = parseInt(e.detail.value, 10)
    const opt = RELATION_OPTIONS[pickerIndex]
    if (!opt) return

    const pathSteps = this.data.pathSteps.slice()
    pathSteps[idx] = { label: opt.label, value: opt.value, pickerIndex }

    // Auto-infer gender from the last step
    const lastStep = pathSteps[pathSteps.length - 1]
    const overrideGender = lastStep.value ? inferGender(lastStep.value) : this.data.overrideGender

    this.setData({ pathSteps, overrideGender })
  },

  onRemovePathStep(e) {
    const idx = parseInt(e.currentTarget.dataset.idx, 10)
    const pathSteps = this.data.pathSteps.filter((_, i) => i !== idx)

    // Re-infer gender from new last step
    let overrideGender = this.data.overrideGender
    if (pathSteps.length > 0) {
      const lastStep = pathSteps[pathSteps.length - 1]
      if (lastStep.value) overrideGender = inferGender(lastStep.value)
    } else {
      overrideGender = ''
    }

    this.setData({ pathSteps, overrideGender })
  },

  onGenderChange(e) {
    this.setData({ overrideGender: e.currentTarget.dataset.gender })
  },

  onNewOverrideValueInput(e) {
    this.setData({ newOverrideValue: e.detail.value })
  },

  onAddOverride() {
    const { pathSteps, overrideGender, newOverrideValue } = this.data
    const value = (newOverrideValue || '').trim()

    // Validate: at least one step selected, gender set, and value provided
    const validSteps = pathSteps.filter(s => s.value)
    if (validSteps.length === 0 || !overrideGender || !value) return

    const key = buildPathKey(validSteps, overrideGender)
    if (!key) return

    const displayKey = parsePathKeyToDisplay(key)
    const editorOverrides = this.data.editorOverrides.slice()
    const existing = editorOverrides.findIndex(o => o.key === key)
    if (existing >= 0) {
      editorOverrides[existing].value = value
      editorOverrides[existing].displayKey = displayKey
    } else {
      editorOverrides.push({ key, value, displayKey })
    }
    this.setData({
      editorOverrides,
      pathSteps: [],
      overrideGender: '',
      newOverrideValue: ''
    })
  },

  onDeleteOverride(e) {
    const key = e.currentTarget.dataset.key
    const editorOverrides = this.data.editorOverrides.filter(o => o.key !== key)
    this.setData({ editorOverrides })
  },

  async onSaveMap() {
    const { editorName, editorShared, editorOverrides, editingMapId, familyId } = this.data

    if (!editorName.trim()) {
      api.showError('请输入称呼表名称')
      return
    }

    const overrides = {}
    for (const o of editorOverrides) {
      overrides[o.key] = o.value
    }

    try {
      if (editingMapId) {
        await api.callWithLoading('titlemap/update', {
          title_map_id: editingMapId,
          name: editorName.trim(),
          overrides,
          is_shared: editorShared
        }, '保存中...')
      } else {
        await api.callWithLoading('titlemap/create', {
          family_id: familyId,
          name: editorName.trim(),
          overrides,
          is_shared: editorShared
        }, '创建中...')
      }

      this.setData({ showEditor: false })
      api.showSuccess('保存成功')
      this.loadData()
    } catch (err) {
      api.showError(err)
    }
  },

  onDeleteMap(e) {
    const mapId = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除称呼表',
      content: '确定要删除该称呼表吗？使用该表的成员将恢复为默认称呼。',
      confirmColor: '#E53935',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.callWithLoading('titlemap/delete', {
            title_map_id: mapId
          }, '删除中...')
          api.showSuccess('已删除')
          this.loadData()
        } catch (err) {
          api.showError(err)
        }
      }
    })
  },

  async onUseMap(e) {
    const mapId = e.currentTarget.dataset.id
    try {
      await api.callWithLoading('member/updateTitleMap', {
        family_id: this.data.familyId,
        title_map_id: mapId
      }, '设置中...')
      api.showSuccess('已切换称呼表')
      this.loadData()
    } catch (err) {
      api.showError(err)
    }
  },

  async onClearAdopted() {
    try {
      await api.callWithLoading('member/updateTitleMap', {
        family_id: this.data.familyId,
        title_map_id: ''
      }, '恢复中...')
      api.showSuccess('已恢复默认称呼')
      this.loadData()
    } catch (err) {
      api.showError(err)
    }
  }
})
