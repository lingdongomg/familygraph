## ADDED Requirements

### Requirement: Show Relationship on Node Tap
When a user taps a person node in the family graph, the app SHALL display the kinship title (relationship) between that person and the current user's bound person, using a toast notification.

#### Scenario: User taps a node with known relationship
- **WHEN** the current user is bound to a person in the family
- **AND** the user taps another person's node in the graph
- **THEN** a toast displays the formal kinship title (e.g., "叔父", "表姐")

#### Scenario: User taps a node but is not bound
- **WHEN** the current user is not bound to any person in this family
- **AND** the user taps a person's node
- **THEN** the app navigates directly to the person detail page without showing a relationship toast

#### Scenario: Same-generation siblings without age data
- **WHEN** the relationship is a sibling type and the relationship edge uses OLDER_BROTHER/YOUNGER_SISTER etc.
- **THEN** the formal title from FORMAL_TITLE_MAP is displayed as-is (e.g., "哥哥", "妹妹")
