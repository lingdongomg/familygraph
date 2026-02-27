/**
 * photo-tagger - Photo tagging interaction component
 *
 * Displays a photo with existing tags rendered as overlay dots.
 * Users can tap on the photo to place a new tag point.
 * Emits 'tagplace' when a new tag position is selected and
 * 'tagtap' when an existing tag dot is tapped.
 */
Component({
  properties: {
    /** Photo URL to display */
    src: { type: String, value: '' },
    /**
     * Existing tags array.  Each tag object should include:
     *   - _id: string
     *   - x: number (percentage 0-100 of image width)
     *   - y: number (percentage 0-100 of image height)
     *   - person_name: string (optional label)
     */
    tags: { type: Array, value: [] },
    /** Whether tagging mode is active (tap to place) */
    editable: { type: Boolean, value: false }
  },

  data: {
    imageWidth: 0,
    imageHeight: 0,
    imageLoaded: false,
    pendingTag: null   // { x, y } percentage position of an uncommitted tag
  },

  methods: {
    /**
     * Called when the photo finishes loading. Records the rendered
     * image dimensions so we can translate tap coordinates to
     * percentage positions.
     */
    onImageLoad: function (e) {
      this.setData({
        imageWidth: e.detail.width,
        imageHeight: e.detail.height,
        imageLoaded: true
      })
    },

    /**
     * Handle tap on the photo area. If editable, calculates the
     * percentage position and emits 'tagplace'.
     */
    onImageTap: function (e) {
      if (!this.data.editable) return
      if (!e.touches || !e.touches.length) return

      var touchX = e.touches[0].clientX
      var touchY = e.touches[0].clientY
      var self = this
      var query = this.createSelectorQuery()
      query.select('.tagger-image-wrap')
        .boundingClientRect(function (rect) {
          if (!rect) return
          var x = ((touchX - rect.left) / rect.width) * 100
          var y = ((touchY - rect.top) / rect.height) * 100

          // Clamp to 0-100
          x = Math.max(0, Math.min(100, x))
          y = Math.max(0, Math.min(100, y))

          self.setData({
            pendingTag: { x: x, y: y }
          })

          self.triggerEvent('tagplace', { x: x, y: y })
        })
        .exec()
    },

    /**
     * Handle tap on an existing tag dot.
     */
    onTagTap: function (e) {
      var tagId = e.currentTarget.dataset.id
      this.triggerEvent('tagtap', { tagId: tagId })
    },

    /**
     * Clear the pending (uncommitted) tag dot.
     */
    clearPending: function () {
      this.setData({ pendingTag: null })
    }
  }
})
