# Change: Fix bracket distribution line vertical centering

## Why

The horizontal distribution line in parent-child bracket connectors is visually shifted toward the children instead of appearing at the midpoint between parent and child nodes. The previous fix (`fix-bracket-line-proportions`, commit `23781aa`) correctly changed from a fixed offset to a midpoint calculation, but the midpoint is computed between `startY` (parent bottom + LABEL_AREA_HEIGHT) and `minChildTopY` (child circle top). Including the 30px label area in `startY` pushes the anchor point too far down, causing the "center" to be biased toward the children.

## Root Cause

Current calculation:
```
startY       = parent.y + NODE_RADIUS(30) + LABEL_AREA_HEIGHT(30) = parent.y + 60
minChildTopY = child.y  - NODE_RADIUS(30)                        = parent.y + 110  (with 140px gen spacing)
midY         = (60 + 110) / 2                                    = parent.y + 85
```

The user expects the bracket line at the visual center of the gap between node circles:
```
parent bottom = parent.y + 30
child top     = child.y  - 30 = parent.y + 110
visual center = (30 + 110) / 2 = parent.y + 70
```

Current midY (parent.y + 85) is 15px below the true visual center (parent.y + 70), appearing closer to the children.

## What Changes

- Compute the distribution line Y as the midpoint between the **parent circle bottom edge** (`parent.y + NODE_RADIUS`) and the **topmost child circle top edge** (`min(child.y) - NODE_RADIUS`), rather than including the label area in the start point.
- Keep `startY` (with label area) only for the vertical connector's origin (where the line exits below the label text), but use the true parent bottom for centering math.
- Retain the safety guard (`midY <= parentBottom → midY = parentBottom + 10`) for edge cases where parent and child are very close.

## Impact

- Affected code: `miniprogram/components/family-graph/index.js` lines 311-324 (bracket midY calculation)
- No other files affected
- No breaking changes — purely visual correction
