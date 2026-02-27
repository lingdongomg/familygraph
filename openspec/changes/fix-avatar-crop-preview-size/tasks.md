# Tasks

- [x] 1. Fix canvas export coordinate mismatch in `onConfirm`
  - **File**: `miniprogram/components/image-cropper/index.js`
  - **Change**: 在 `onConfirm` 方法中，将 canvas 重置为 `OUTPUT_SIZE` 物理像素（不乘以 dpr），并将 `ctx.setTransform` 重置为单位矩阵，使绘制坐标与导出坐标一致。同时移除了未使用的中间变量（`tempFilePath`, `imgData`, `pngData`）。
  - **Verification**: 在微信开发者工具中选择图片 → 裁剪 → 确认，检查编辑页的头像预览显示完整裁剪区域而非左上角部分

- [x] 2. Verify export quality is preserved
  - **Verification**: `destWidth`/`destHeight` 仍为 `OUTPUT_SIZE`（300），`fileType: 'jpg'`，`quality: 0.9`，这些参数未被修改
  - **Note**: `canvasToTempFilePath` 的导出配置保持不变

- [ ] 3. Test on multiple device DPR
  - **Verification**: 需在 dpr=2（如 iPhone 8）和 dpr=3（如 iPhone 12）的设备/模拟器上测试裁剪导出，确认结果一致且完整
  - **Note**: 需要手动测试
