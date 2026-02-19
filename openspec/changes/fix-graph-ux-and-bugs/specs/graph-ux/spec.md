## ADDED Requirements

### Requirement: Spacious Graph Canvas
The family graph component SHALL render in a canvas large enough that nodes with typical family sizes (5-50 members) are well-spaced and readable, using the full available screen width and a generous height.

#### Scenario: Graph fills available screen space
- **WHEN** the family home page loads with the graph tab active
- **THEN** the graph canvas occupies the full device width and at least 80vh height

### Requirement: Auto-sizing Canvas
The family graph component SHALL read its actual rendered dimensions from the DOM rather than relying on hardcoded width/height properties.

#### Scenario: Canvas adapts to container size
- **WHEN** the graph component is rendered
- **THEN** the canvas coordinate space matches the component's actual CSS dimensions
