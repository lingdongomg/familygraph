## Context

### 头像裁剪方案
微信小程序没有内置图片裁剪 API。方案是创建一个自定义 `image-cropper` 组件：
- 用 Canvas 2D 渲染选中的图片
- 支持双指缩放和单指拖拽定位
- 固定正方形裁剪框（居中 overlay）
- 确认后通过 Canvas `toTempFilePath` 输出裁剪后的图片
- 输出尺寸固定 300×300px（头像够用，文件小）

组件接口：
```
<image-cropper
  src="{{tempImagePath}}"
  bind:confirm="onCropConfirm"
  bind:cancel="onCropCancel"
/>
```
事件 `confirm` 返回 `{ tempFilePath }` 裁剪后的临时文件路径。

### 关系显示方案
点击图谱节点时，调用已有的 `relationship/computeTitle` 云函数获取与当前用户绑定的 Person 之间的称谓，以 `wx.showToast` 显示。如果当前用户未绑定任何 Person，则不显示关系。

对于同辈关系（兄弟姐妹），`computeTitle` 已经基于 `FORMAL_TITLE_MAP` 查表返回具体称谓（哥哥/弟弟/姐姐/妹妹），这依赖于关系边的类型（OLDER_BROTHER/YOUNGER_BROTHER 等），不依赖年龄。当关系边只是泛化的兄弟姐妹时，前端可显示泛称。

## Goals / Non-Goals
- **Goals**: 修复数据库索引 bug、优化图谱体验、隐藏辈分、实现头像裁剪、点击显示关系
- **Non-Goals**: 不做图片滤镜/美颜、不做关系编辑、不改变力导向布局算法本身
