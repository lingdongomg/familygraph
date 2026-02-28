## 1. Fix bracket distribution line centering

- [x] 1.1 In `miniprogram/components/family-graph/index.js`, introduce `parentBottomY = group.originY + bracketNodeRadius` as the visual parent bottom edge (line 312)
- [x] 1.2 Change `midY` calculation from `(startY + minChildTopY) / 2` to `(parentBottomY + minChildTopY) / 2` so the distribution line is visually centered between parent circle and child circle
- [x] 1.3 Safety guard kept as `if (midY <= startY) midY = startY + 10` — ensures line stays below label area
- [x] 1.4 Verified vertical connector still draws from `startY` (line 330-332) down to `midY` — unchanged

## 2. Validation

- [x] 2.1 Single parent + single child: midY = (parentBottom + childTop) / 2, visually centered
- [x] 2.2 Couple + multiple children: same midY formula applies to all coupleGroups, horizontal line centered
- [x] 2.3 Edge case: when midY <= startY, safety guard clamps to startY + 10, keeping line below labels
