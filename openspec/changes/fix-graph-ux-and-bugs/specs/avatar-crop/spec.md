## ADDED Requirements

### Requirement: Avatar Image Cropping
The person edit page SHALL provide an image cropping interface when the user selects a new avatar, allowing them to pan and zoom the image within a square crop frame before uploading.

#### Scenario: User crops avatar before upload
- **WHEN** the user taps the avatar on the edit page and selects an image
- **THEN** a full-screen cropping interface appears with a square crop frame
- **AND** the user can drag to reposition and pinch to zoom the image
- **AND** tapping confirm exports the cropped area as a 300x300 image and uploads it

#### Scenario: User cancels cropping
- **WHEN** the user taps cancel during cropping
- **THEN** the cropping interface closes and no changes are made to the avatar
