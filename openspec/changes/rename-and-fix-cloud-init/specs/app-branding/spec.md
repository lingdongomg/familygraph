## ADDED Requirements

### Requirement: App Display Name
The application SHALL display "亲谱" as the Chinese product name in all user-facing UI text, navigation bar titles, about dialogs, and documentation.

#### Scenario: Navigation bar shows correct name
- **WHEN** the user opens the mini program
- **THEN** the navigation bar title displays "亲谱"

#### Scenario: About dialog shows correct name
- **WHEN** the user taps "关于亲谱" in the profile settings
- **THEN** the modal title and content display "亲谱" as the product name

#### Scenario: Project configuration reflects name
- **WHEN** a developer opens the project in WeChat DevTools
- **THEN** the project description reads "亲谱 - 家庭关系图谱"
