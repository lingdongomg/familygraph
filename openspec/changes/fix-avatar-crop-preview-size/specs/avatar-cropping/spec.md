# Avatar Cropping

## MODIFIED Requirements

### Requirement: REQ-CROP-EXPORT — Canvas export coordinates must match physical pixel dimensions

When `onConfirm` resets the main canvas for export, the canvas physical pixel dimensions, drawing coordinates, and `canvasToTempFilePath` source rect MUST all use the same coordinate space. The export canvas MUST NOT apply dpr scaling to avoid coordinate mismatch between the drawn content and the exported region.

#### Scenario: User crops an avatar on a dpr=3 device

- **Given** the image cropper has a loaded image and the user taps "确认"
- **When** the canvas is reset for export
- **Then** `canvas.width` and `canvas.height` are set to `OUTPUT_SIZE` (300) without dpr multiplication
- **And** `ctx.setTransform` is reset to identity (1,0,0,1,0,0)
- **And** the cropped region is drawn at `(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)`
- **And** `canvasToTempFilePath` uses `width: OUTPUT_SIZE, height: OUTPUT_SIZE`
- **And** the exported image contains the full cropped region, not just the top-left portion

#### Scenario: Exported image quality and dimensions

- **Given** `OUTPUT_SIZE = 300`
- **When** the cropped image is exported
- **Then** `destWidth` and `destHeight` are `OUTPUT_SIZE` (300×300 pixels)
- **And** file type is JPEG with quality 0.9
- **And** the exported temp file path is emitted via the `confirm` event
