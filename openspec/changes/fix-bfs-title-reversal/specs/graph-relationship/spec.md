## MODIFIED Requirements

### Requirement: BFS Kinship Title Computation
The system SHALL compute formal kinship titles via BFS shortest-path traversal from the current user's bound person to each target person, reversing each edge's `relation_type` using `REVERSE_RELATION[type][neighborGender]` to produce path keys compatible with `FORMAL_TITLE_MAP`.

The BFS function SHALL log diagnostic information (edge type, reversed type, final path key) when invoked, to support deployment verification.

#### Scenario: Father node title from child's perspective
- **WHEN** user is bound to person A (male, generation 0)
- **AND** person B (male) is created as A's FATHER (forward edge: B->A type=FATHER, reverse edge: A->B type=SON)
- **THEN** BFS from A to B traverses edge A->B (type=SON), reverses to FATHER via `REVERSE_RELATION['SON']['male']`
- **AND** path key is `FATHER|male`
- **AND** `FORMAL_TITLE_MAP['FATHER|male']` returns "父亲"
- **AND** B's node label on the graph displays "父亲"

#### Scenario: Child node title from parent's perspective
- **WHEN** user is bound to person B (male, the parent)
- **AND** person A (male) is B's SON (forward edge: A->B type=FATHER, reverse edge: B->A type=SON... actually forward: B->A type=SON exists as the stored reverse edge)
- **THEN** BFS from B to A traverses edge B->A (type=SON... wait, the edges are: forwardEdge newPerson->refPerson=FATHER, reverseEdge refPerson->newPerson=SON)
- **AND** if B is the newPerson (father), adjacency[B] has {to_id: A, type: FATHER}, BFS reverses FATHER via `REVERSE_RELATION['FATHER'][genderMap[A]='male']='SON'`
- **AND** path key is `SON|male`, `FORMAL_TITLE_MAP['SON|male']` returns "儿子"
- **AND** A's node label on the graph displays "儿子"
