## MODIFIED Requirements

### Requirement: Parent-Child Bracket Line Drawing
The system SHALL draw parent-to-child bracket lines with the distribution (horizontal) line positioned at the vertical midpoint between the parent's label bottom edge and the topmost child's circle top edge, so that the vertical segments above and below the distribution line are approximately equal in length.

The vertical line from parent bottom SHALL start at `originY + NODE_RADIUS + LABEL_AREA_HEIGHT`.
The vertical line to each child SHALL end at `child.y - NODE_RADIUS` (child circle top edge).
The distribution horizontal line SHALL be at `(startY + minChildTopY) / 2` where `minChildTopY` is the smallest `child.y - NODE_RADIUS` among all children in the group.
When the calculated midY is not greater than startY (parent-child very close), the system SHALL fall back to `startY + 10` as minimum gap.

#### Scenario: Couple with multiple children — balanced bracket
- **WHEN** a couple group has 3 children and GENERATION_Y_SPACING is 140
- **THEN** the distribution line Y coordinate is approximately midway between parent label bottom and topmost child circle top
- **AND** the vertical line from parent to distribution line is approximately equal in length to the vertical line from distribution line to child top

#### Scenario: Single parent with single child — centered connector
- **WHEN** a single parent has one child
- **THEN** the distribution line is at the midpoint between parent bottom and child top
- **AND** a horizontal segment connects from parent X to child X at the distribution line level

#### Scenario: Very close parent-child nodes — fallback minimum
- **WHEN** parent and child nodes are positioned very close vertically (e.g., layout edge case)
- **THEN** the distribution line is placed at least 10px below the parent label bottom to avoid visual overlap
