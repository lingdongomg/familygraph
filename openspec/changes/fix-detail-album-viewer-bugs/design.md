## Context

成员详情页（`person/detail`）底部有一个照片预览区，期望显示前 4 张照片缩略图。但 `person/getDetail` 云函数只返回共享字段和私人备注，不查询 photos 集合。前端代码 `person.photos ? person.photos.slice(0, 4) : []` 始终得到空数组。

相册页（`photo/album`）的标题通过 URL 参数 `person_name` 传入，但详情页导航时未传递该参数。

照片查看器（`photo/viewer`）的图片使用 `width:100%; height:100%`，在 flex 容器中无法正确获取高度。

## Goals / Non-Goals

Goals:
- 详情页照片预览区正确显示前 4 张照片
- 相册页标题正确显示 "XX的照片"
- 查看器页面图片正常可见
- 移除与卡片内"编辑"链接功能重复的底部"编辑资料"按钮

Non-Goals:
- 不修改 `person/getDetail` 云函数（避免增加云函数复杂度，改为前端额外调一次 `photo/list`）
- 不改变照片上传流程
- 不修改相册页的上传/删除功能

## Decisions

**照片预览数据来源**：选择在前端 `loadPersonDetail` 中额外调用 `photo/list`（已有的云函数），而非修改 `person/getDetail` 加入照片查询。理由：
- `getDetail` 职责是返回 person 共享+私人字段，加入照片查询会混合关注点
- `photo/list` 已经实现了按 person_id 查询照片的逻辑
- 两个请求可以并行发起，不影响加载速度

**查看器 CSS 修复**：将 `.photo-fullscreen` 改为使用绝对定位或 `max-width`/`max-height` + 固定高度方式，确保在黑色背景的 flex 容器中正确显示。

## Risks / Trade-offs

- 详情页多了一次 `photo/list` 云函数调用，增加了少量网络开销。但可以与 `getDetail` 并行执行，用户感知到的加载时间不会增加。
- 移除"编辑资料"按钮后，如果 `canDelete` 也为 false，action bar 将不再渲染。用户需要通过卡片内的"编辑"链接进入编辑页面。
