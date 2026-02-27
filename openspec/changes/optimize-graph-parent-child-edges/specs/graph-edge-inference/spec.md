## ADDED Requirements

### Requirement: Sibling Parent Edge Inference
When a new family member is created with a sibling relation type (OLDER_BROTHER, YOUNGER_BROTHER, OLDER_SISTER, YOUNGER_SISTER), the system SHALL automatically create bidirectional parent-child edges between the new member and the reference person's existing parents.

#### Scenario: Sister inherits parent connections
- **WHEN** user creates member "Sister" as OLDER_SISTER of "Me"
- **AND** "Me" has existing parent edges to "Father" (FATHER) and "Mother" (MOTHER)
- **THEN** the system creates bidirectional edges: Father ↔ Sister (FATHER/DAUGHTER) and Mother ↔ Sister (MOTHER/DAUGHTER)
- **AND** the graph displays blue solid lines between Sister and both parents

#### Scenario: Sibling created before parents exist
- **WHEN** user creates member "Brother" as OLDER_BROTHER of "Me"
- **AND** "Me" has no existing parent edges
- **THEN** the system creates only the sibling edges between "Brother" and "Me"
- **AND** no additional edges are inferred

#### Scenario: No duplicate edges created
- **WHEN** user creates member "Sister" as OLDER_SISTER of "Me"
- **AND** "Me" has a parent "Father"
- **AND** an edge between "Father" and "Sister" already exists
- **THEN** the system SHALL NOT create a duplicate edge

### Requirement: Child Spouse Parent Edge Inference
When a new family member is created with a child relation type (SON, DAUGHTER), the system SHALL automatically create bidirectional parent-child edges between the new member and the reference person's existing spouse(s).

#### Scenario: Son inherits mother connection via father
- **WHEN** user creates member "Son" as SON of "Father"
- **AND** "Father" has an existing spouse edge to "Mother" (WIFE)
- **THEN** the system creates bidirectional edges: Mother ↔ Son (MOTHER/SON)
- **AND** the graph displays blue solid lines between Son and Mother

#### Scenario: Child created when parent has no spouse
- **WHEN** user creates member "Daughter" as DAUGHTER of "Mother"
- **AND** "Mother" has no existing spouse edges
- **THEN** the system creates only the parent-child edges between "Mother" and "Daughter"
- **AND** no additional edges are inferred
