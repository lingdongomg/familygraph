## ADDED Requirements

### Requirement: No Erroneous Unique Index on edit_history
The `edit_history` database collection SHALL NOT have a unique index on `openid_hash`, as this field does not exist in edit_history records and causes duplicate key errors on insert.

#### Scenario: Multiple edit_history records can be created
- **WHEN** a user creates multiple family members in sequence
- **THEN** each edit_history record is inserted successfully without E11000 duplicate key errors
