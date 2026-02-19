## ADDED Requirements

### Requirement: Photo Upload Parameter Consistency
The photo album page SHALL pass `file_size` (not `size`) to the `photo/upload` cloud function, matching the expected parameter name.

#### Scenario: Photo upload succeeds
- **WHEN** a user selects and uploads a photo from the album page
- **THEN** the cloud function receives `file_size` and the upload completes without a "缺少必填参数" error

### Requirement: Relation Picker Event Compatibility
The person creation page SHALL correctly read the relation type from the `relation-picker` component's event detail using the `type` field.

#### Scenario: User selects a relation type
- **WHEN** a user taps a relation type button in the relation picker
- **THEN** `selectedRelation` is set to the chosen relation type value without "Setting data field to undefined" warnings

### Requirement: Avatar Tap to Edit
The person detail page avatar image SHALL be tappable to navigate to the edit page, allowing the user to change the avatar directly.

#### Scenario: User taps avatar on detail page
- **WHEN** a user taps the avatar image on the person detail page
- **THEN** the app navigates to the person edit page where the avatar can be changed
