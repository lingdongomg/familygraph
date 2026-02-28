## MODIFIED Requirements

### Requirement: Bracket Distribution Line Positioning

The bracket distribution line (horizontal connector between parent and children) SHALL be positioned at the vertical midpoint between the **parent node circle bottom edge** and the **topmost child node circle top edge**, ensuring it appears visually centered in the gap between parent and child nodes.

The vertical connector from parent to distribution line SHALL originate from below the label area (`parent.y + NODE_RADIUS + LABEL_AREA_HEIGHT`), but the distribution line's Y coordinate SHALL be computed using only the circle edges:

```
parentBottomY = parent.y + NODE_RADIUS
minChildTopY  = min(child.y - NODE_RADIUS)
midY          = (parentBottomY + minChildTopY) / 2
```

If `midY` falls at or above the label area bottom (`startY`), a minimum offset of 10px below `startY` SHALL be applied as a safety fallback.

#### Scenario: Standard generation spacing (140px)

- **WHEN** a parent at y=100 has children at y=240 with NODE_RADIUS=30
- **THEN** parentBottomY = 130, minChildTopY = 210, midY = 170
- **AND** the distribution line is at the visual center between the two circles

#### Scenario: Couple with multiple children

- **WHEN** two spouses share children placed at varying X positions
- **THEN** the distribution line is drawn at the same centered midY across all children
- **AND** vertical drop lines connect from midY to each child's circle top

#### Scenario: Parent and child very close together

- **WHEN** parent and child are positioned with minimal vertical gap
- **AND** the computed midY would fall at or above startY (label area bottom)
- **THEN** midY SHALL be clamped to startY + 10px to keep the line below the text labels
