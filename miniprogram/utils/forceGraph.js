/**
 * ForceGraph - Force-directed graph layout engine for family graph visualization.
 *
 * Implements a spring-electrical model with generation constraints and
 * spouse-alignment forces, tailored for hierarchical family trees.
 *
 * Usage:
 *   var fg = new ForceGraph({ nodes: [...], edges: [...], width: 750, height: 1200 });
 *   fg.initPositions();
 *   fg.simulate();
 *   var layout = fg.getLayout();
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var NODE_RADIUS = 30;
var REPULSION = 5000;
var ATTRACTION = 0.01;
var GENERATION_Y_SPACING = 140;
var SPOUSE_X_SPACING = 70;
var MAX_ITERATIONS = 100;
var DAMPING = 0.9;
var PADDING = 40;

// Minimum distance to avoid division-by-zero in Coulomb calculation.
var MIN_DISTANCE = 1;

// Strength of the vertical constraint that keeps nodes on their generation row.
var GENERATION_Y_STRENGTH = 0.8;

// Strength of the horizontal/vertical pull between spouses.
var SPOUSE_X_STRENGTH = 0.5;
var SPOUSE_Y_STRENGTH = 0.6;

// Rest length used in Hooke's law for edge springs.
var REST_LENGTH = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clamp a value between min and max (inclusive).
 */
function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// ---------------------------------------------------------------------------
// ForceGraph class
// ---------------------------------------------------------------------------

function ForceGraph(options) {
  options = options || {};

  this.width = options.width || 750;
  this.height = options.height || 1200;

  // Deep-copy nodes so the caller's data is not mutated.
  this.nodes = (options.nodes || []).map(function (n) {
    return {
      id: n.id,
      x: n.x != null ? n.x : 0,
      y: n.y != null ? n.y : 0,
      vx: 0,
      vy: 0,
      generation: n.generation != null ? n.generation : 0,
      gender: n.gender || '',
      isSpouse: !!n.isSpouse,
      spouseId: n.spouseId || null
    };
  });

  // Shallow-copy edges.
  this.edges = (options.edges || []).map(function (e) {
    return {
      source: e.source,
      target: e.target,
      type: e.type || ''
    };
  });

  // --- Lookup structures ---

  // Map: node id -> node reference.
  this.nodeMap = new Map();
  var self = this;
  this.nodes.forEach(function (n) {
    self.nodeMap.set(n.id, n);
  });

  // Map: node id -> Set of connected node ids (built from edges).
  this.edgeMap = new Map();
  this.edges.forEach(function (e) {
    if (!self.edgeMap.has(e.source)) {
      self.edgeMap.set(e.source, new Set());
    }
    self.edgeMap.get(e.source).add(e.target);

    if (!self.edgeMap.has(e.target)) {
      self.edgeMap.set(e.target, new Set());
    }
    self.edgeMap.get(e.target).add(e.source);
  });

  // Group nodes by generation for fast iteration during constraint passes.
  this.generationGroups = new Map();
  this.nodes.forEach(function (n) {
    var gen = n.generation;
    if (!self.generationGroups.has(gen)) {
      self.generationGroups.set(gen, []);
    }
    self.generationGroups.get(gen).push(n);
  });

  // Constants (exposed so tests / callers can introspect).
  this.NODE_RADIUS = NODE_RADIUS;
  this.REPULSION = REPULSION;
  this.ATTRACTION = ATTRACTION;
  this.GENERATION_Y_SPACING = GENERATION_Y_SPACING;
  this.SPOUSE_X_SPACING = SPOUSE_X_SPACING;
  this.MAX_ITERATIONS = MAX_ITERATIONS;
  this.DAMPING = DAMPING;
  this.PADDING = PADDING;
}

// ---------------------------------------------------------------------------
// initPositions
// ---------------------------------------------------------------------------

/**
 * Assign initial positions to every node based on generation and spouse data.
 *
 * Nodes of the same generation share the same Y coordinate.  Within a
 * generation row, nodes are evenly spaced along X.  Spouse pairs are placed
 * next to each other with a gap of SPOUSE_X_SPACING.
 */
ForceGraph.prototype.initPositions = function () {
  var self = this;
  var usableWidth = this.width - 2 * PADDING;
  var usableHeight = this.height - 2 * PADDING;

  // Determine generation range to compute Y positions.
  var generations = Array.from(this.generationGroups.keys()).sort(function (a, b) {
    return a - b;
  });

  if (generations.length === 0) return;

  // Compute the Y for each generation.
  // We centre the generation rows vertically within the canvas.
  var totalGenHeight = (generations.length - 1) * GENERATION_Y_SPACING;
  var startY = Math.max(PADDING, (this.height - totalGenHeight) / 2);

  var generationY = new Map();
  generations.forEach(function (gen, idx) {
    generationY.set(gen, startY + idx * GENERATION_Y_SPACING);
  });

  // For each generation, lay out nodes along X.
  generations.forEach(function (gen) {
    var group = self.generationGroups.get(gen);
    var y = generationY.get(gen);

    // Separate spouse-paired nodes so we can place them adjacently.
    // A "spouse cluster" is a pair whose ids reference each other.
    var placed = new Set();
    var clusters = []; // each cluster is an array of nodes

    group.forEach(function (node) {
      if (placed.has(node.id)) return;

      if (node.isSpouse && node.spouseId && self.nodeMap.has(node.spouseId)) {
        var spouse = self.nodeMap.get(node.spouseId);
        // Only cluster if the spouse is in the same generation.
        if (spouse.generation === node.generation && !placed.has(spouse.id)) {
          clusters.push([node, spouse]);
          placed.add(node.id);
          placed.add(spouse.id);
          return;
        }
      }
      clusters.push([node]);
      placed.add(node.id);
    });

    // Spread clusters evenly across the usable width.
    var totalSlots = clusters.length;
    var spacing = totalSlots > 1 ? usableWidth / (totalSlots - 1) : 0;
    var offsetX = totalSlots > 1 ? PADDING : self.width / 2;

    clusters.forEach(function (cluster, i) {
      var cx = offsetX + i * spacing;

      if (cluster.length === 2) {
        // Place the two spouses side-by-side.
        cluster[0].x = cx - SPOUSE_X_SPACING / 2;
        cluster[0].y = y;
        cluster[1].x = cx + SPOUSE_X_SPACING / 2;
        cluster[1].y = y;
      } else {
        cluster[0].x = cx;
        cluster[0].y = y;
      }
    });
  });
};

// ---------------------------------------------------------------------------
// simulate
// ---------------------------------------------------------------------------

/**
 * Run the force-directed simulation for MAX_ITERATIONS steps.
 */
ForceGraph.prototype.simulate = function () {
  var nodes = this.nodes;
  var edges = this.edges;
  var nodeMap = this.nodeMap;
  var nodeCount = nodes.length;

  if (nodeCount === 0) return;

  // Pre-compute generation target Y values (same logic as initPositions).
  var generations = Array.from(this.generationGroups.keys()).sort(function (a, b) {
    return a - b;
  });
  var totalGenHeight = (generations.length - 1) * GENERATION_Y_SPACING;
  var startY = Math.max(PADDING, (this.height - totalGenHeight) / 2);

  var generationTargetY = new Map();
  generations.forEach(function (gen, idx) {
    generationTargetY.set(gen, startY + idx * GENERATION_Y_SPACING);
  });

  // -----------------------------------------------------------------------
  // Iteration loop
  // -----------------------------------------------------------------------
  for (var iter = 0; iter < MAX_ITERATIONS; iter++) {
    var i, j, dx, dy, dist, force, fx, fy;

    // -- 1. Repulsion (Coulomb's law) between all pairs -- O(n^2) ---------
    for (i = 0; i < nodeCount; i++) {
      for (j = i + 1; j < nodeCount; j++) {
        var a = nodes[i];
        var b = nodes[j];

        dx = b.x - a.x;
        dy = b.y - a.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIN_DISTANCE) dist = MIN_DISTANCE;

        force = REPULSION / (dist * dist);
        fx = (dx / dist) * force;
        fy = (dy / dist) * force;

        // Equal and opposite forces.
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // -- 2. Attraction (Hooke's law) along edges --------------------------
    for (i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var src = nodeMap.get(edge.source);
      var tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      dx = tgt.x - src.x;
      dy = tgt.y - src.y;
      dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_DISTANCE) dist = MIN_DISTANCE;

      force = ATTRACTION * (dist - REST_LENGTH);
      fx = (dx / dist) * force;
      fy = (dy / dist) * force;

      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }

    // -- 3. Generation Y constraint ---------------------------------------
    for (i = 0; i < nodeCount; i++) {
      var node = nodes[i];
      var targetY = generationTargetY.get(node.generation);
      if (targetY != null) {
        node.vy += (targetY - node.y) * GENERATION_Y_STRENGTH;
      }
    }

    // -- 4. Spouse alignment ----------------------------------------------
    //    Pull spouse pairs toward the same Y and close X.
    var visitedSpouses = new Set();
    for (i = 0; i < nodeCount; i++) {
      var n = nodes[i];
      if (!n.isSpouse || !n.spouseId || visitedSpouses.has(n.id)) continue;

      var spouse = nodeMap.get(n.spouseId);
      if (!spouse) continue;

      visitedSpouses.add(n.id);
      visitedSpouses.add(spouse.id);

      // Y alignment – pull both toward their average Y.
      var avgY = (n.y + spouse.y) / 2;
      n.vy += (avgY - n.y) * SPOUSE_Y_STRENGTH;
      spouse.vy += (avgY - spouse.y) * SPOUSE_Y_STRENGTH;

      // X proximity – pull toward target separation of SPOUSE_X_SPACING.
      dx = spouse.x - n.x;
      var absDx = Math.abs(dx);
      if (absDx > SPOUSE_X_SPACING) {
        var sign = dx > 0 ? 1 : -1;
        var pull = (absDx - SPOUSE_X_SPACING) * SPOUSE_X_STRENGTH;
        n.vx += sign * pull;
        spouse.vx -= sign * pull;
      }
    }

    // -- 5. Damping -------------------------------------------------------
    for (i = 0; i < nodeCount; i++) {
      nodes[i].vx *= DAMPING;
      nodes[i].vy *= DAMPING;
    }

    // -- 6. Apply velocities & boundary constraints -----------------------
    var xMin = PADDING;
    var xMax = this.width - PADDING;
    var yMin = PADDING;
    var yMax = this.height - PADDING;

    for (i = 0; i < nodeCount; i++) {
      var nd = nodes[i];
      nd.x += nd.vx;
      nd.y += nd.vy;

      nd.x = clamp(nd.x, xMin, xMax);
      nd.y = clamp(nd.y, yMin, yMax);
    }
  }
};

// ---------------------------------------------------------------------------
// getLayout
// ---------------------------------------------------------------------------

/**
 * Return the current layout as a plain object with nodes and edges.
 * Node objects include all original fields plus final x, y.
 */
ForceGraph.prototype.getLayout = function () {
  var nodesOut = this.nodes.map(function (n) {
    return {
      id: n.id,
      x: n.x,
      y: n.y,
      generation: n.generation,
      gender: n.gender,
      isSpouse: n.isSpouse,
      spouseId: n.spouseId
    };
  });

  var edgesOut = this.edges.map(function (e) {
    return {
      source: e.source,
      target: e.target,
      type: e.type
    };
  });

  return {
    nodes: nodesOut,
    edges: edgesOut
  };
};

// ---------------------------------------------------------------------------
// getNodeAt
// ---------------------------------------------------------------------------

/**
 * Hit-test: return the first node whose centre is within the clickable area
 * of (x, y). The clickable area includes both the circle (NODE_RADIUS) and
 * the label region below it (extra LABEL_HIT_EXTRA pixels).
 * Returns null if no node matches.
 */
ForceGraph.prototype.getNodeAt = function (x, y) {
  var LABEL_HIT_EXTRA = 40;
  var hitRadius = NODE_RADIUS + LABEL_HIT_EXTRA;
  var hitRadiusSq = hitRadius * hitRadius;
  for (var i = 0; i < this.nodes.length; i++) {
    var n = this.nodes[i];
    var dx = n.x - x;
    var dy = n.y - (y - LABEL_HIT_EXTRA / 2);
    if (dx * dx + dy * dy <= hitRadiusSq) {
      return n;
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

module.exports = ForceGraph;
