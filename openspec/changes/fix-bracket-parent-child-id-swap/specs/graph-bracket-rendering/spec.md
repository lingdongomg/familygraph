## MODIFIED Requirements

### Requirement: Parent-Child Edge Grouping for Bracket Drawing

The bracket drawing code SHALL correctly identify parent and child nodes from relationship edges following the database convention `"from_id is [relation_type] of to_id"`:

- For FATHER/MOTHER edges: `edge.source` (from_id) is the **parent**, `edge.target` (to_id) is the **child**
- For SON/DAUGHTER edges: `edge.source` (from_id) is the **child**, `edge.target` (to_id) is the **parent**

The couple group's `originX`/`originY` SHALL be derived from the **parent** node(s), and `children` SHALL contain the **child** nodes positioned below the parent in the graph.

#### Scenario: FATHER edge correctly identifies parent

- **WHEN** a relationship edge has `type=FATHER`, `source=PersonA`, `target=PersonB`
- **THEN** PersonA is identified as the parent and PersonB is identified as the child
- **AND** the bracket originates from PersonA's position downward toward PersonB

#### Scenario: SON edge correctly identifies parent

- **WHEN** a relationship edge has `type=SON`, `source=PersonC`, `target=PersonD`
- **THEN** PersonD is identified as the parent and PersonC is identified as the child
- **AND** the bracket originates from PersonD's position downward toward PersonC

#### Scenario: Bracket distribution line is between parent and child

- **WHEN** parent and child nodes are correctly identified
- **THEN** the horizontal distribution line is drawn between the parent's label area and the topmost child's circle top edge
- **AND** the line appears visually centered in the gap between parent and child generations
