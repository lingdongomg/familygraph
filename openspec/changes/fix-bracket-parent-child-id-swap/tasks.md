## 1. Fix parent/child ID assignment

- [x] 1.1 In `miniprogram/components/family-graph/index.js` lines 227-232, swap the parentId/childId assignment:
  - FATHER/MOTHER: `parentId = edge.source`, `childId = edge.target`
  - SON/DAUGHTER: `parentId = edge.target`, `childId = edge.source`
- [x] 1.2 Simplify the midY calculation back to `(startY + minChildTopY) / 2` — removed the `parentBottomY` variable that was a workaround for the inverted IDs
- [x] 1.3 Verified the vertical connector draws from startY (below parent label) down to midY, and the bracket line is between parent and child circles

## 2. Validation

- [x] 2.1 Traced through the math with correct IDs: parent.y=400, child.y=540 → startY=460, minChildTopY=510, midY=485 — correctly centered between parent label bottom and child circle top
- [x] 2.2 Safety guard confirmed: when parent-child very close (50px), midY=440 < startY=460 → clamped to 470, keeping line below label area
