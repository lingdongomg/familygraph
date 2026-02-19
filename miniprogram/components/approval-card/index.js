/**
 * approval-card - Approval card for join requests
 *
 * Displays applicant info, claimed person, request time, status badge,
 * and approve/reject action buttons (visible only when status is pending).
 */
Component({
  properties: {
    request: { type: Object, value: {} }
  },

  methods: {
    /**
     * Format a timestamp or date string into a readable date.
     */
    formatTime: function (ts) {
      if (!ts) return ''
      var d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
      if (isNaN(d.getTime())) return ''
      var y = d.getFullYear()
      var m = ('0' + (d.getMonth() + 1)).slice(-2)
      var day = ('0' + d.getDate()).slice(-2)
      var hh = ('0' + d.getHours()).slice(-2)
      var mm = ('0' + d.getMinutes()).slice(-2)
      return y + '-' + m + '-' + day + ' ' + hh + ':' + mm
    },

    onApprove: function () {
      this.triggerEvent('approve', { requestId: this.data.request._id })
    },

    onReject: function () {
      this.triggerEvent('reject', { requestId: this.data.request._id })
    }
  }
})
