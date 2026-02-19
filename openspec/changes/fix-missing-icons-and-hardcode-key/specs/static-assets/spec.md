## ADDED Requirements

### Requirement: Complete Icon Assets
The mini program SHALL include all icon files referenced in WXML templates as local static assets, so that no `Failed to load local image resource` errors occur at runtime.

#### Scenario: Settings icon loads on family home page
- **WHEN** the user navigates to the family home page
- **THEN** the settings gear icon displays correctly without console errors

#### Scenario: Default avatar loads on person pages
- **WHEN** a person has no custom avatar set
- **THEN** the default avatar placeholder icon displays correctly on person detail, person edit, and family settings pages
