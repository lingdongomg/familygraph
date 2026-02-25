/**
 * family-graph - Canvas-based family graph visualization component
 *
 * Uses the ForceGraph layout engine and Canvas 2D API to render an
 * interactive, pannable, zoomable family tree graph.
 *
 * Edge styles:
 *   - Spouse edges: red solid line
 *   - Parent-child edges: blue solid line
 *   - Sibling edges: gray dashed line
 *
 * Node styles:
 *   - Circle with gender-based fill colour
 *   - Avatar image or initial letter
 *   - Dual-line label below node: name (bold) + title (gray)
 *   - Self node: gold border highlight
 */
var ForceGraph = require('../../utils/forceGraph')
var constants = require('../../utils/constants')
var GRAPH = constants.GRAPH

var SPOUSE_TYPES = ['HUSBAND', 'WIFE']
var PARENT_CHILD_TYPES = ['FATHER', 'MOTHER', 'SON', 'DAUGHTER']
// Sibling types are everything else.

// Max display length before truncation
var MAX_NAME_LEN = 4
var MAX_TITLE_LEN = 5

function truncate(str, maxLen) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '\u2026' : str
}

Component({
  properties: {
    nodes: { type: Array, value: [] },
    edges: { type: Array, value: [] },
    titles: { type: Object, value: {} },
    currentUserId: { type: String, value: '' },
    width: { type: Number, value: 750 },
    height: { type: Number, value: 1000 }
  },

  data: {
    graph: null,
    ctx: null,
    dpr: 1,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    images: {},
    // Touch tracking
    _touchStartX: 0,
    _touchStartY: 0,
    _touchStartTime: 0,
    _lastOffsetX: 0,
    _lastOffsetY: 0,
    _isPanning: false,
    _isPinching: false,
    _lastPinchDist: 0,
    _lastScale: 1
  },

  lifetimes: {
    attached: function () {
      this.initCanvas()
    }
  },

  observers: {
    'nodes, edges': function () {
      this.buildGraph()
    }
  },

  methods: {
    // ------------------------------------------------------------------
    // Canvas initialization
    // ------------------------------------------------------------------
    initCanvas: function () {
      var self = this
      var query = this.createSelectorQuery()
      query.select('#familyGraph')
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

          self.canvas = canvas
          self.setData({ ctx: ctx, dpr: dpr, width: w, height: h })
          self.buildGraph()
        })
    },

    // ------------------------------------------------------------------
    // Graph construction
    // ------------------------------------------------------------------
    buildGraph: function () {
      if (!this.data.ctx || !this.data.nodes.length) return

      var self = this
      var edges = this.data.edges

      // Detect spouse pairs from edges
      var spouseMap = {}  // personId -> spousePersonId
      edges.forEach(function (e) {
        if (SPOUSE_TYPES.indexOf(e.relation_type) !== -1) {
          spouseMap[e.from_id] = e.to_id
          spouseMap[e.to_id] = e.from_id
        }
      })

      var graph = new ForceGraph({
        nodes: this.data.nodes.map(function (n) {
          var hasSpouse = !!spouseMap[n._id]
          return {
            id: n._id,
            generation: n.generation,
            gender: n.gender,
            isSpouse: hasSpouse,
            spouseId: spouseMap[n._id] || null,
            label: n.name || ''
          }
        }),
        edges: edges.map(function (e) {
          return {
            source: e.from_id,
            target: e.to_id,
            type: e.relation_type
          }
        }),
        width: this.data.width,
        height: this.data.height
      })

      graph.initPositions()
      graph.simulate()

      this.graph = graph
      this.loadAvatars()
      this.render()
    },

    // ------------------------------------------------------------------
    // Node label resolution — returns { name, title }
    // ------------------------------------------------------------------
    getNodeLabels: function (node) {
      var name = (node && node.name) || ''
      var currentUserId = this.data.currentUserId

      // Not logged in / no bound person — name only
      if (!currentUserId) {
        return { name: name, title: '' }
      }

      // Self node
      if (node.bound_user_id === currentUserId) {
        return { name: name, title: '\u672C\u4EBA' }  // '本人'
      }

      // Other nodes: custom_title (user-edited) > formal_title (from title map)
      var titleData = this.data.titles[node._id]
      if (titleData) {
        var title = titleData.custom_title || titleData.formal_title || ''
        // Filter out the generic "亲属" fallback — treat as no title
        if (title === '\u4EB2\u5C5E') title = ''
        return { name: name, title: title }
      }

      return { name: name, title: '' }
    },

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------
    render: function () {
      if (!this.graph || !this.data.ctx) return

      var ctx = this.data.ctx
      var w = this.data.width
      var h = this.data.height
      var offsetX = this.data.offsetX
      var offsetY = this.data.offsetY
      var scale = this.data.scale
      var layout = this.graph.getLayout()
      var nodeMap = {}

      layout.nodes.forEach(function (n) {
        nodeMap[n.id] = n
      })

      // Clear canvas
      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(offsetX, offsetY)
      ctx.scale(scale, scale)

      // -- Draw edges --
      var self = this
      layout.edges.forEach(function (edge) {
        var src = nodeMap[edge.source]
        var tgt = nodeMap[edge.target]
        if (!src || !tgt) return

        ctx.beginPath()
        ctx.moveTo(src.x, src.y)
        ctx.lineTo(tgt.x, tgt.y)
        ctx.lineWidth = 2

        if (SPOUSE_TYPES.indexOf(edge.type) !== -1) {
          // Spouse: red solid
          ctx.strokeStyle = '#E53935'
          ctx.setLineDash([])
        } else if (PARENT_CHILD_TYPES.indexOf(edge.type) !== -1) {
          // Parent-child: blue solid
          ctx.strokeStyle = '#1565C0'
          ctx.setLineDash([])
        } else {
          // Sibling: gray dashed
          ctx.strokeStyle = '#9E9E9E'
          ctx.setLineDash([6, 4])
        }

        ctx.stroke()
        ctx.setLineDash([])
      })

      // -- Draw nodes --
      var nodeRadius = GRAPH.NODE_RADIUS
      var fontSize = GRAPH.FONT_SIZE
      var labelFontSize = GRAPH.LABEL_FONT_SIZE
      var subLabelFontSize = GRAPH.SUB_LABEL_FONT_SIZE
      var currentUserId = this.data.currentUserId

      layout.nodes.forEach(function (node) {
        var original = self.data.nodes.filter(function (n) { return n._id === node.id })[0]
        var isSelf = original && original.bound_user_id === currentUserId && !!currentUserId

        // Self node outer glow
        if (isSelf) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, nodeRadius + 6, 0, 2 * Math.PI)
          ctx.fillStyle = 'rgba(212, 160, 23, 0.2)'
          ctx.fill()
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI)

        if (node.gender === 'male') {
          ctx.fillStyle = '#BBDEFB'
        } else if (node.gender === 'female') {
          ctx.fillStyle = '#F8BBD0'
        } else {
          ctx.fillStyle = '#E0E0E0'
        }
        ctx.fill()

        // Border — gold 4px for self, white for others
        if (isSelf) {
          ctx.strokeStyle = '#D4A017'
          ctx.lineWidth = 4
        } else {
          ctx.strokeStyle = '#FFFFFF'
          ctx.lineWidth = 2
        }
        ctx.stroke()

        // Avatar image or initial letter
        var img = self.data.images[node.id]
        if (img) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(node.x, node.y, nodeRadius - 2, 0, 2 * Math.PI)
          ctx.clip()
          ctx.drawImage(img, node.x - nodeRadius + 2, node.y - nodeRadius + 2, (nodeRadius - 2) * 2, (nodeRadius - 2) * 2)
          ctx.restore()
        } else {
          // Draw initial letter
          var initial = (original && original.name) ? original.name[0] : '?'
          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold ' + fontSize + 'px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(initial, node.x, node.y)
        }

        // Dual-line label below node
        var labels = self.getNodeLabels(original || { name: '' })
        var nameText = truncate(labels.name, MAX_NAME_LEN)
        var titleText = truncate(labels.title, MAX_TITLE_LEN)

        // Line 1: name (bold)
        var labelY = node.y + nodeRadius + 6
        ctx.fillStyle = '#333333'
        ctx.font = 'bold ' + labelFontSize + 'px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(nameText, node.x, labelY)

        // Line 2: title (gray, only if present)
        if (titleText) {
          var titleY = labelY + labelFontSize + 3
          ctx.fillStyle = '#888888'
          ctx.font = subLabelFontSize + 'px sans-serif'
          ctx.fillText(titleText, node.x, titleY)
        }
      })

      ctx.restore()
    },

    // ------------------------------------------------------------------
    // Touch handlers
    // ------------------------------------------------------------------
    onTouchStart: function (e) {
      if (!e.touches || e.touches.length === 0) return

      if (e.touches.length === 2) {
        // Pinch-zoom start
        var t1 = e.touches[0]
        var t2 = e.touches[1]
        var dx = t1.clientX - t2.clientX
        var dy = t1.clientY - t2.clientY
        this._lastPinchDist = Math.sqrt(dx * dx + dy * dy)
        this._lastScale = this.data.scale
        this._isPinching = true
        return
      }

      var touch = e.touches[0]
      this._touchStartX = touch.clientX
      this._touchStartY = touch.clientY
      this._touchStartTime = Date.now()
      this._lastOffsetX = this.data.offsetX
      this._lastOffsetY = this.data.offsetY
      this._isPanning = false
      this._isPinching = false
    },

    onTouchMove: function (e) {
      if (!e.touches || e.touches.length === 0) return

      // Pinch-zoom
      if (e.touches.length === 2) {
        var t1 = e.touches[0]
        var t2 = e.touches[1]
        var dx = t1.clientX - t2.clientX
        var dy = t1.clientY - t2.clientY
        var dist = Math.sqrt(dx * dx + dy * dy)

        if (this._lastPinchDist > 0) {
          var ratio = dist / this._lastPinchDist
          var newScale = this._lastScale * ratio
          // Clamp scale between 0.3 and 3
          newScale = Math.max(0.3, Math.min(3, newScale))
          this.setData({ scale: newScale })
          this.render()
        }
        this._isPinching = true
        return
      }

      if (this._isPinching) return

      var touch = e.touches[0]
      var dx2 = touch.clientX - this._touchStartX
      var dy2 = touch.clientY - this._touchStartY

      // Threshold to distinguish tap from pan
      if (Math.abs(dx2) > 5 || Math.abs(dy2) > 5) {
        this._isPanning = true
      }

      this.setData({
        offsetX: this._lastOffsetX + dx2,
        offsetY: this._lastOffsetY + dy2
      })
      this.render()
    },

    onTouchEnd: function (e) {
      if (this._isPinching) {
        this._isPinching = false
        this._lastPinchDist = 0
        return
      }

      var duration = Date.now() - this._touchStartTime

      // Short tap (< 300ms) and no significant panning => node tap
      if (duration < 300 && !this._isPanning && this.graph) {
        // Convert touch coords to graph coords
        var x = (this._touchStartX - this.data.offsetX) / this.data.scale
        var y = (this._touchStartY - this.data.offsetY) / this.data.scale

        var hitNode = this.graph.getNodeAt(x, y)
        if (hitNode) {
          this.onNodeTap(hitNode)
        }
      }
    },

    onNodeTap: function (node) {
      this.triggerEvent('nodetap', { personId: node.id })
    },

    // ------------------------------------------------------------------
    // Avatar loading
    // ------------------------------------------------------------------
    loadAvatars: function () {
      var self = this
      var images = {}
      var remaining = 0

      this.data.nodes.forEach(function (n) {
        if (!n.avatar) return
        remaining++

        var imgObj = self.canvas.createImage()
        imgObj.onload = function () {
          images[n._id] = imgObj
          remaining--
          if (remaining <= 0) {
            self.setData({ images: images })
            self.render()
          }
        }
        imgObj.onerror = function () {
          remaining--
          if (remaining <= 0) {
            self.setData({ images: images })
            self.render()
          }
        }
        imgObj.src = n.avatar
      })

      // If no avatars to load, just set empty
      if (remaining === 0) {
        self.setData({ images: images })
      }
    }
  }
})
