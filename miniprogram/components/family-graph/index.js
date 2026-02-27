/**
 * family-graph - Canvas-based family graph visualization component
 *
 * Uses the ForceGraph layout engine and Canvas 2D API to render an
 * interactive, pannable, zoomable family tree graph.
 *
 * Edge styles:
 *   - Spouse edges: red solid line
 *   - Parent-child edges: blue bracket lines from couple midpoint
 *   - Sibling edges: hidden (implied by shared parent bracket)
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
var SIBLING_TYPES = ['OLDER_BROTHER', 'YOUNGER_BROTHER', 'OLDER_SISTER', 'YOUNGER_SISTER']

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

      // Build spouse map from edges: personId -> spousePersonId
      var spouseMap = {}
      layout.edges.forEach(function (edge) {
        if (SPOUSE_TYPES.indexOf(edge.type) !== -1) {
          spouseMap[edge.source] = edge.target
          spouseMap[edge.target] = edge.source
        }
      })

      // Group parent-child edges by parent
      // parentChildren: { parentId: [childNode, ...] }
      var parentChildren = {}

      layout.edges.forEach(function (edge) {
        var parentId = null
        var childId = null
        if (edge.type === 'FATHER' || edge.type === 'MOTHER') {
          parentId = edge.target
          childId = edge.source
        } else if (edge.type === 'SON' || edge.type === 'DAUGHTER') {
          parentId = edge.source
          childId = edge.target
        }

        if (parentId && childId) {
          var parentNode = nodeMap[parentId]
          var childNode = nodeMap[childId]
          if (!parentNode || !childNode) return

          if (!parentChildren[parentId]) {
            parentChildren[parentId] = []
          }
          var alreadyAdded = parentChildren[parentId].some(function (c) { return c.id === childNode.id })
          if (!alreadyAdded) {
            parentChildren[parentId].push(childNode)
          }
        }
      })

      // Merge spouse pairs that share children into couple groups
      // Each group: { originX, originY, children: [childNode, ...] }
      var coupleGroups = []
      var processedParents = {}

      var parentIds = Object.keys(parentChildren)
      for (var pi = 0; pi < parentIds.length; pi++) {
        var pId = parentIds[pi]
        if (processedParents[pId]) continue

        var parentNode = nodeMap[pId]
        if (!parentNode) continue
        var children = parentChildren[pId]
        if (!children || children.length === 0) continue

        var spouseId = spouseMap[pId]
        var spouseNode = spouseId ? nodeMap[spouseId] : null
        var spouseChildren = spouseId ? parentChildren[spouseId] : null

        if (spouseNode && spouseChildren && spouseChildren.length > 0) {
          // Merge children from both parents, dedup by id
          var mergedMap = {}
          children.forEach(function (c) { mergedMap[c.id] = c })
          spouseChildren.forEach(function (c) { mergedMap[c.id] = c })
          var mergedChildren = Object.keys(mergedMap).map(function (k) { return mergedMap[k] })

          coupleGroups.push({
            originX: (parentNode.x + spouseNode.x) / 2,
            originY: (parentNode.y + spouseNode.y) / 2,
            children: mergedChildren
          })
          processedParents[pId] = true
          processedParents[spouseId] = true
        } else {
          // Single parent — no spouse in graph
          coupleGroups.push({
            originX: parentNode.x,
            originY: parentNode.y,
            children: children
          })
          processedParents[pId] = true
        }
      }

      // Bracket drawing constants
      var bracketNodeRadius = GRAPH.NODE_RADIUS
      var LABEL_AREA_HEIGHT = 30  // estimated: name 11px + gap 3px + title 10px + gap 6px
      var BRACKET_GAP = 20        // fixed offset below parent bottom for distribution line

      // Draw bracket/tree lines for each couple group
      for (var gi = 0; gi < coupleGroups.length; gi++) {
        var group = coupleGroups[gi]
        var gChildren = group.children
        if (gChildren.length === 0) continue

        ctx.strokeStyle = '#1565C0'
        ctx.lineWidth = 2
        ctx.setLineDash([])

        // Sort children by X coordinate
        gChildren.sort(function (a, b) { return a.x - b.x })

        // Start Y: below parent node bottom edge + label area
        var startY = group.originY + bracketNodeRadius + LABEL_AREA_HEIGHT
        // Distribution line Y: fixed offset below startY
        var midY = startY + BRACKET_GAP

        // Vertical line from parent bottom down to distribution line
        ctx.beginPath()
        ctx.moveTo(group.originX, startY)
        ctx.lineTo(group.originX, midY)
        ctx.stroke()

        if (gChildren.length === 1) {
          // Single child: horizontal to child X, then vertical down to child top
          var childTopY = gChildren[0].y - bracketNodeRadius
          ctx.beginPath()
          ctx.moveTo(group.originX, midY)
          ctx.lineTo(gChildren[0].x, midY)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(gChildren[0].x, midY)
          ctx.lineTo(gChildren[0].x, childTopY)
          ctx.stroke()
        } else {
          // Horizontal line spanning all children at midY
          var leftX = gChildren[0].x
          var rightX = gChildren[gChildren.length - 1].x
          ctx.beginPath()
          ctx.moveTo(leftX, midY)
          ctx.lineTo(rightX, midY)
          ctx.stroke()

          // Vertical lines from midY down to each child's top edge
          for (var ci2 = 0; ci2 < gChildren.length; ci2++) {
            var cTopY = gChildren[ci2].y - bracketNodeRadius
            ctx.beginPath()
            ctx.moveTo(gChildren[ci2].x, midY)
            ctx.lineTo(gChildren[ci2].x, cTopY)
            ctx.stroke()
          }
        }
      }

      // Draw non-parent-child edges (spouse only; sibling lines removed)
      layout.edges.forEach(function (edge) {
        // Skip parent-child edges (already drawn as brackets)
        if (PARENT_CHILD_TYPES.indexOf(edge.type) !== -1) return
        // Skip sibling edges — relationship is implied by shared parent bracket
        if (SIBLING_TYPES.indexOf(edge.type) !== -1) return

        var src = nodeMap[edge.source]
        var tgt = nodeMap[edge.target]
        if (!src || !tgt) return

        // Spouse: red solid
        ctx.beginPath()
        ctx.moveTo(src.x, src.y)
        ctx.lineTo(tgt.x, tgt.y)
        ctx.lineWidth = 2
        ctx.strokeStyle = '#E53935'
        ctx.setLineDash([])
        ctx.stroke()
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

      // Collect cloud file IDs that need URL conversion
      var fileList = []
      var fileIdToNodeId = {}
      this.data.nodes.forEach(function (n) {
        if (!n.avatar) return
        fileList.push({ fileID: n.avatar })
        fileIdToNodeId[n.avatar] = n._id
      })

      // No avatars to load
      if (fileList.length === 0) {
        self.setData({ images: images })
        return
      }

      // Convert cloud file IDs to HTTP temporary URLs
      wx.cloud.getTempFileURL({
        fileList: fileList,
        success: function (res) {
          var urlMap = {} // nodeId -> httpUrl
          if (res.fileList) {
            res.fileList.forEach(function (item) {
              if (item.tempFileURL && item.status === 0) {
                var nodeId = fileIdToNodeId[item.fileID]
                if (nodeId) urlMap[nodeId] = item.tempFileURL
              }
            })
          }

          var remaining = Object.keys(urlMap).length
          if (remaining === 0) {
            self.setData({ images: images })
            return
          }

          Object.keys(urlMap).forEach(function (nodeId) {
            var imgObj = self.canvas.createImage()
            imgObj.onload = function () {
              images[nodeId] = imgObj
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
            imgObj.src = urlMap[nodeId]
          })
        },
        fail: function () {
          // Conversion failed, fall back to initials
          self.setData({ images: images })
        }
      })
    }
  }
})
