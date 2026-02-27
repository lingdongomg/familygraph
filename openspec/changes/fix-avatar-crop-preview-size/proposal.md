# fix-avatar-crop-preview-size

## Summary

修复头像裁剪后导出的临时图片仅包含左上角部分内容的 bug。裁剪确认时 `canvasToTempFilePath` 的坐标参数与 canvas 实际物理像素尺寸不匹配，导致导出图片不完整。

## Problem

在 `image-cropper` 组件的 `onConfirm` 方法中：

1. 主 canvas 的物理像素尺寸被重置为 `OUTPUT_SIZE * dpr`（如 300×3 = 900），同时 `ctx.setTransform(dpr, ...)` 设置了 dpr 缩放
2. 裁剪后的图像以逻辑坐标 `(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)` 绘制到 canvas 上
3. 调用 `canvasToTempFilePath` 时传入 `width: OUTPUT_SIZE, height: OUTPUT_SIZE`（即 300）

问题在于：`canvasToTempFilePath` 的 `width`/`height` 参数指的是 **canvas 物理像素坐标**，而不是 CSS 逻辑坐标。canvas 物理像素是 `300 * dpr`（例如 dpr=3 时为 900），但只截取了物理像素中的 300×300 区域，即左上角 1/9 的内容。

## Root Cause

`onConfirm` 中 `wx.canvasToTempFilePath` 的 `width`/`height` 应使用 `OUTPUT_SIZE * dpr` 而非 `OUTPUT_SIZE`，或者在重置 canvas 尺寸时不使用 dpr 缩放，直接以 `OUTPUT_SIZE` 物理像素绘制。

## Proposed Fix

将 `onConfirm` 中的 canvas 导出逻辑改为直接使用 `OUTPUT_SIZE` 作为 canvas 物理像素尺寸（不乘以 dpr），并移除 `ctx.setTransform(dpr, ...)` 缩放。这样 canvas 物理尺寸、绘制坐标、导出参数三者保持一致，均为 300×300。

### Before (buggy)
```javascript
canvas.width = OUTPUT_SIZE * dpr
canvas.height = OUTPUT_SIZE * dpr
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
// draws at logical (0,0,300,300) → physical (0,0,900,900)
// but exports physical (0,0,300,300) → only top-left 1/3
```

### After (fixed)
```javascript
canvas.width = OUTPUT_SIZE
canvas.height = OUTPUT_SIZE
ctx.setTransform(1, 0, 0, 1, 0, 0)
// draws at (0,0,300,300) → physical (0,0,300,300)
// exports physical (0,0,300,300) → complete image
```

## Scope

- **修改文件**: `miniprogram/components/image-cropper/index.js` — `onConfirm` 方法
- **影响范围**: 仅影响裁剪确认时的图片导出逻辑，不影响裁剪过程中的交互和渲染
- **风险**: 低 — 修改隔离在导出逻辑中，且 `destWidth`/`destHeight` 已正确指定为 `OUTPUT_SIZE`

## Spec Deltas

- `specs/avatar-cropping/spec.md` — 修正裁剪导出的坐标一致性要求
