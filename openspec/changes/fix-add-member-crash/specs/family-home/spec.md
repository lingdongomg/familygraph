## ADDED Requirements

### Requirement: Add Member Button Navigation
The family home page "+" button SHALL correctly navigate to the person creation page with all required parameters, supporting both "first member" (no reference needed) and "additional member" (reference person selected) flows.

#### Scenario: First member of a new family
- **WHEN** the user taps "+" on a family with zero members
- **THEN** the app navigates directly to the person creation page in "first member" mode without requiring a reference person

#### Scenario: Additional member with reference selection
- **WHEN** the user taps "+" on a family that already has members
- **THEN** the app presents a list of existing members to choose as the reference person
- **AND** after selection, navigates to the person creation page with both `family_id` and `reference_person_id`

#### Scenario: No crash on navigation
- **WHEN** the user taps "+" under any circumstance
- **THEN** the app does not freeze, crash, or flash an error

### Requirement: Person Create First Member Mode
The person creation page SHALL support a "first member" mode where `reference_person_id` is not provided, allowing the user to add basic information without selecting a relationship type.

#### Scenario: First member creation without relationship
- **WHEN** the person creation page loads without `reference_person_id`
- **THEN** the relationship selection area is hidden
- **AND** the user can submit the form with only name, gender, and optional birth year

### Requirement: Deprecation-Free Canvas Initialization
The family-graph component SHALL use non-deprecated WeChat APIs for system information and valid WXSS selectors for component styling.

#### Scenario: No deprecation warnings
- **WHEN** the family home page loads with the graph tab active
- **THEN** no `wx.getSystemInfoSync is deprecated` warning appears in the console
- **AND** no WXSS selector warnings appear for the family-graph component
