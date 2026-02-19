const api = require('../../../utils/api')
const auth = require('../../../utils/auth')

const PAGE_SIZE = 20

const ACTION_LABELS = {
  create: '创建',
  update: '更新',
  delete: '删除',
  rollback: '回滚'
}

Page({
  data: {
    familyId: '',
    records: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    currentPage: 0,
    rollingBackId: ''
  },

  onLoad(options) {
    if (options.family_id) {
      this.setData({ familyId: options.family_id })
    }
  },

  onShow() {
    if (this.data.familyId) {
      this.loadFirstPage()
    }
  },

  async loadFirstPage() {
    this.setData({ loading: true, records: [], currentPage: 0, hasMore: true })
    try {
      await auth.ensureLogin()
      await this.fetchPage(0)
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ loading: false })
    }
  },

  async fetchPage(page) {
    try {
      const result = await api.callFunction('history/list', {
        family_id: this.data.familyId,
        page: page,
        page_size: PAGE_SIZE
      })

      const rawRecords = result.records || result.list || result || []
      const formatted = rawRecords.map(function (record) {
        return Object.assign({}, record, {
          actionLabel: ACTION_LABELS[record.action] || record.action,
          personName: this.getPersonName(record),
          changesSummary: this.getChangesSummary(record),
          timeText: this.formatTime(record.created_at),
          canRollback: !!record.snapshot_before && !record.is_rolled_back && record.action !== 'create'
        })
      }.bind(this))

      const allRecords = page === 0 ? formatted : this.data.records.concat(formatted)

      this.setData({
        records: allRecords,
        currentPage: page,
        hasMore: rawRecords.length >= PAGE_SIZE
      })
    } catch (err) {
      api.showError(err)
    }
  },

  getPersonName(record) {
    if (record.snapshot_before && record.snapshot_before.name) {
      return record.snapshot_before.name
    }
    if (record.field_changes) {
      for (var i = 0; i < record.field_changes.length; i++) {
        if (record.field_changes[i].field === 'name') {
          return record.field_changes[i].new_value || record.field_changes[i].old_value || ''
        }
      }
    }
    if (record.person_name) {
      return record.person_name
    }
    return record.person_id || '未知成员'
  },

  getChangesSummary(record) {
    if (!record.field_changes || record.field_changes.length === 0) {
      if (record.action === 'create') return '新建成员记录'
      if (record.action === 'delete') return '删除成员记录'
      if (record.action === 'rollback') return '回滚操作'
      return ''
    }

    var fields = record.field_changes.map(function (change) {
      return change.field_label || change.field || ''
    })

    if (fields.length <= 3) {
      return '修改了 ' + fields.join('、')
    }
    return '修改了 ' + fields.slice(0, 3).join('、') + ' 等' + fields.length + '个字段'
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    var date = new Date(timestamp)
    if (isNaN(date.getTime())) return ''

    var now = new Date()
    var diff = now.getTime() - date.getTime()
    var minute = 60 * 1000
    var hour = 60 * minute
    var day = 24 * hour

    if (diff < minute) return '刚刚'
    if (diff < hour) return Math.floor(diff / minute) + '分钟前'
    if (diff < day) return Math.floor(diff / hour) + '小时前'
    if (diff < 7 * day) return Math.floor(diff / day) + '天前'

    var y = date.getFullYear()
    var m = (date.getMonth() + 1).toString().padStart(2, '0')
    var d = date.getDate().toString().padStart(2, '0')
    var h = date.getHours().toString().padStart(2, '0')
    var min = date.getMinutes().toString().padStart(2, '0')

    if (y === now.getFullYear()) {
      return m + '-' + d + ' ' + h + ':' + min
    }
    return y + '-' + m + '-' + d + ' ' + h + ':' + min
  },

  async onRollback(e) {
    var record = e.currentTarget.dataset.record
    if (!record || !record.canRollback) return

    var that = this
    wx.showModal({
      title: '确认回滚',
      content: '确定要将「' + record.personName + '」回滚到此状态吗？此操作不可撤销。',
      confirmText: '确认回滚',
      confirmColor: '#8B4513',
      success: function (res) {
        if (res.confirm) {
          that.doRollback(record)
        }
      }
    })
  },

  async doRollback(record) {
    this.setData({ rollingBackId: record._id })
    try {
      await api.callWithLoading('history/rollback', {
        history_id: record._id,
        family_id: this.data.familyId
      }, '回滚中...')

      api.showSuccess('回滚成功')
      this.loadFirstPage()
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ rollingBackId: '' })
    }
  },

  onReachBottom() {
    if (this.data.loadingMore || !this.data.hasMore) return
    this.setData({ loadingMore: true })
    var nextPage = this.data.currentPage + 1
    this.fetchPage(nextPage).finally(function () {
      this.setData({ loadingMore: false })
    }.bind(this))
  },

  onPullDownRefresh() {
    this.loadFirstPage().then(function () {
      wx.stopPullDownRefresh()
    })
  }
})
