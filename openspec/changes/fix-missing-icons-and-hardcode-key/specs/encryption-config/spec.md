## ADDED Requirements

### Requirement: Built-in Encryption Key
The AES-256-CBC encryption module SHALL use a hardcoded encryption key built into the source code, eliminating the need to configure the `ENCRYPTION_KEY` environment variable in the cloud development console.

#### Scenario: Encryption works without environment variable
- **WHEN** a cloud function calls `encrypt()` or `decrypt()`
- **THEN** the operation succeeds using the built-in key without requiring `process.env.ENCRYPTION_KEY` to be set

#### Scenario: Existing encrypted data remains compatible
- **WHEN** the hardcoded key is set before any data is written
- **THEN** all subsequent encrypt/decrypt operations use the same key and remain consistent
