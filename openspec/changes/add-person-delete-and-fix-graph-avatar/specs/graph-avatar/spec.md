# Graph Avatar

## MODIFIED Requirements

### Requirement: REQ-GRAPH-AVATAR — Graph canvas MUST display avatar images by converting cloud file IDs to HTTP URLs

The family graph component MUST convert cloud storage file IDs to HTTP temporary URLs before loading them into canvas Image objects. The `<image>` WXML component natively supports cloud file IDs, but `canvas.createImage()` requires HTTP URLs. The `loadAvatars` method MUST call `wx.cloud.getTempFileURL` for batch conversion before creating canvas images.

#### Scenario: Graph loads avatars from cloud storage

- **Given** persons in the family have avatar fields containing cloud file IDs
- **When** the graph component calls `loadAvatars`
- **Then** it collects all non-empty avatar cloud file IDs
- **And** calls `wx.cloud.getTempFileURL` to obtain HTTP temporary URLs
- **And** uses the HTTP URLs as the `src` for canvas Image objects
- **And** renders loaded avatars as circular clipped images inside nodes

#### Scenario: Person has no avatar

- **Given** a person's avatar field is empty or null
- **When** the graph renders
- **Then** the node displays the person's initial letter as a fallback (no getTempFileURL call for this person)

#### Scenario: Avatar URL conversion fails

- **Given** `wx.cloud.getTempFileURL` fails for a specific file ID
- **When** the graph renders
- **Then** the affected node falls back to displaying the initial letter without error
