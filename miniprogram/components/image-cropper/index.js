/**
 * image-cropper - Canvas-based image cropper component
 *
 * Supports single-finger drag and two-finger pinch-zoom.
 * Outputs a 300x300 cropped image via the "confirm" event.
 */
var OUTPUT_SIZE = 300

Component({
  properties: {
    src: { type: String, value: '' }
  },

  data: {
    _canvas: null,
    _ctx: null,
    _img: null,
    _imgX: 0,
    _imgY: 0,
    _imgW: 0,
    _imgH: 0,
    _scale: 1,
    _cropBoxX: 0,
    _cropBoxY: 0,
    _cropBoxSize: 0,
    _canvasW: 0,
    _canvasH: 0,
    _touchStartX: 0,
    _touchStartY: 0,
    _lastImgX: 0,
    _lastImgY: 0,
    _isPinching: false,
    _lastPinchDist: 0,
    _lastScale: 1
  },

  observers: {
    'src': function (src) {
      if (src) this.loadImage(src)
    }
  },

  lifetimes: {
    attached: function () {
      this.initCanvas()
    }
  },

  methods: {
    initCanvas: function () {
      var self = this
      var query = this.createSelectorQuery()
      query.select('#cropperCanvas')
        .fields({ node: true, size: true })
        .exec(function (res) {
          if (!res || !res[0]) return
          var canvas = res[0].node
          var ctx = canvas.getContext('2d')
          var dpr = wx.getWindowInfo().pixelRatio

          var w = res[0].width
          var h = res[0].height

          canvas.width = w * dpr
          canvas.height = h * dpr
          ctx.scale(dpr, dpr)

          // Crop box: 75vw centered
          var cropSize = w * 0.75
          var cropX = (w - cropSize) / 2
          var cropY = (h - cropSize) / 2

          self._canvas = canvas
          self._ctx = ctx
          self._canvasW = w
          self._canvasH = h
          self._cropBoxX = cropX
          self._cropBoxY = cropY
          self._cropBoxSize = cropSize

          if (self.properties.src) {
            self.loadImage(self.properties.src)
          }
        })
    },

    loadImage: function (src) {
      var self = this
      if (!self._canvas) return

      var img = self._canvas.createImage()
      img.onload = function () {
        self._img = img

        // Fit image so it covers the crop box
        var cropSize = self._cropBoxSize
        var ratio = img.width / img.height
        var drawW, drawH

        if (ratio >= 1) {
          // Landscape: fit height to crop box
          drawH = cropSize
          drawW = cropSize * ratio
        } else {
          // Portrait: fit width to crop box
          drawW = cropSize
          drawH = cropSize / ratio
        }

        self._imgW = drawW
        self._imgH = drawH
        self._scale = 1
        self._imgX = self._cropBoxX - (drawW - cropSize) / 2
        self._imgY = self._cropBoxY - (drawH - cropSize) / 2

        self.render()
      }
      img.onerror = function () {
        // Could not load image
      }
      img.src = src
    },

    render: function () {
      var ctx = this._ctx
      if (!ctx || !this._img) return

      var w = this._canvasW
      var h = this._canvasH

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)

      // Draw image
      var scale = this._scale
      var imgW = this._imgW * scale
      var imgH = this._imgH * scale
      ctx.drawImage(this._img, this._imgX, this._imgY, imgW, imgH)
    },

    onTouchStart: function (e) {
      if (!e.touches || e.touches.length === 0) return

      if (e.touches.length === 2) {
        var t1 = e.touches[0]
        var t2 = e.touches[1]
        var dx = t1.clientX - t2.clientX
        var dy = t1.clientY - t2.clientY
        this._lastPinchDist = Math.sqrt(dx * dx + dy * dy)
        this._lastScale = this._scale
        this._isPinching = true
        return
      }

      this._touchStartX = e.touches[0].clientX
      this._touchStartY = e.touches[0].clientY
      this._lastImgX = this._imgX
      this._lastImgY = this._imgY
      this._isPinching = false
    },

    onTouchMove: function (e) {
      if (!e.touches || e.touches.length === 0) return

      if (e.touches.length === 2) {
        var t1 = e.touches[0]
        var t2 = e.touches[1]
        var dx = t1.clientX - t2.clientX
        var dy = t1.clientY - t2.clientY
        var dist = Math.sqrt(dx * dx + dy * dy)

        if (this._lastPinchDist > 0) {
          var ratio = dist / this._lastPinchDist
          var newScale = this._lastScale * ratio
          newScale = Math.max(0.5, Math.min(5, newScale))
          this._scale = newScale
          this.render()
        }
        this._isPinching = true
        return
      }

      if (this._isPinching) return

      var touch = e.touches[0]
      this._imgX = this._lastImgX + (touch.clientX - this._touchStartX)
      this._imgY = this._lastImgY + (touch.clientY - this._touchStartY)
      this.render()
    },

    onTouchEnd: function () {
      this._isPinching = false
      this._lastPinchDist = 0
    },

    onConfirm: function () {
      var self = this
      if (!this._canvas || !this._img) return

      wx.showLoading({ title: '裁剪中...', mask: true })

      // Create offscreen canvas for output
      var offscreen = wx.createOffscreenCanvas({
        type: '2d',
        width: OUTPUT_SIZE,
        height: OUTPUT_SIZE
      })
      var octx = offscreen.getContext('2d')

      // Calculate which portion of the drawn image falls within the crop box
      var scale = this._scale
      var imgW = this._imgW * scale
      var imgH = this._imgH * scale

      // Crop box position relative to image
      var srcX = (self._cropBoxX - self._imgX) / imgW * self._img.width
      var srcY = (self._cropBoxY - self._imgY) / imgH * self._img.height
      var srcSize = self._cropBoxSize / imgW * self._img.width

      octx.drawImage(
        self._img,
        srcX, srcY, srcSize, srcSize,
        0, 0, OUTPUT_SIZE, OUTPUT_SIZE
      )

      // Export to temp file
      var tempFilePath = wx.env.USER_DATA_PATH + '/crop_' + Date.now() + '.jpg'
      var imgData = octx.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      var pngData = self._canvas.toDataURL('image/jpeg', 0.9)

      // Use canvas toTempFilePath on the main canvas
      // First draw the cropped region to the main canvas at correct dimensions
      var ctx = self._ctx
      var canvas = self._canvas
      var dpr = wx.getWindowInfo().pixelRatio

      // Reset canvas to output size
      canvas.width = OUTPUT_SIZE * dpr
      canvas.height = OUTPUT_SIZE * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      ctx.drawImage(
        self._img,
        srcX, srcY, srcSize, srcSize,
        0, 0, OUTPUT_SIZE, OUTPUT_SIZE
      )

      wx.canvasToTempFilePath({
        canvas: canvas,
        x: 0,
        y: 0,
        width: OUTPUT_SIZE,
        height: OUTPUT_SIZE,
        destWidth: OUTPUT_SIZE,
        destHeight: OUTPUT_SIZE,
        fileType: 'jpg',
        quality: 0.9,
        success: function (res) {
          wx.hideLoading()
          self.triggerEvent('confirm', { tempFilePath: res.tempFilePath })
        },
        fail: function () {
          wx.hideLoading()
          wx.showToast({ title: '裁剪失败', icon: 'none' })
        }
      })
    },

    onCancel: function () {
      this.triggerEvent('cancel')
    }
  }
})
