# Person Delete

## ADDED Requirements

### Requirement: REQ-PERSON-DELETE-PERM — Members MUST be able to delete persons they created

Members with `member` role MUST be able to delete persons where `created_by` matches their openid. Owner role MUST be able to delete any person. Restricted role MUST NOT be able to delete any person. No user MUST be allowed to delete the person bound to themselves (`bound_user_id === openid`).

#### Scenario: Owner deletes a member they did not create

- **Given** the user has `owner` role in the family
- **And** the target person was created by another member
- **And** the target person is not bound to the current user
- **When** the user requests to delete the target person
- **Then** the deletion succeeds with cascading removal of relationships, photos, photo_tags, and person_notes

#### Scenario: Member deletes a person they created

- **Given** the user has `member` role in the family
- **And** the target person has `created_by` equal to the user's openid
- **And** the target person is not bound to the current user
- **When** the user requests to delete the target person
- **Then** the deletion succeeds with cascading removal of relationships, photos, photo_tags, and person_notes

#### Scenario: Member attempts to delete a person they did not create

- **Given** the user has `member` role in the family
- **And** the target person has `created_by` not equal to the user's openid
- **When** the user requests to delete the target person
- **Then** the request is rejected with an error message

#### Scenario: User attempts to delete themselves

- **Given** the target person has `bound_user_id` equal to the current user's openid
- **When** the user requests to delete the target person
- **Then** the request is rejected with an error message regardless of role

### Requirement: REQ-PERSON-CREATED-BY — Person records MUST track their creator

When a new person is created, the `persons` record MUST include a `created_by` field containing the openid of the creating user. For legacy records without `created_by`, only Owner role SHALL be able to delete them.

#### Scenario: New person is created with created_by field

- **Given** a member creates a new person in a family
- **When** the person record is written to the database
- **Then** the record includes `created_by` set to the creator's openid

### Requirement: REQ-PERSON-DELETE-UI — Detail page MUST show delete button for authorized users

The person detail page MUST display a "删除成员" button when the current user has permission to delete the viewed person. The button MUST trigger a confirmation dialog before executing the deletion.

#### Scenario: Authorized user sees delete button

- **Given** the user is viewing a person detail page
- **And** the user has permission to delete this person (owner, or member who created it)
- **And** the person is not bound to the current user
- **When** the page loads
- **Then** a red "删除成员" button is displayed at the bottom

#### Scenario: User confirms deletion

- **Given** the user taps the "删除成员" button
- **When** a confirmation dialog appears and the user confirms
- **Then** the person is deleted and the user is navigated back to the previous page
