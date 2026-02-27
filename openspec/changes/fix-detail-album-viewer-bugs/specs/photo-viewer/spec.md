# Spec: photo-viewer

照片查看器图片显示

## MODIFIED Requirements

### Requirement: 照片查看器正确渲染图片

查看器页面 MUST 正确显示照片，图片在黑色背景上居中且尺寸正常。

#### Scenario: 正常查看照片

- Given 从相册页点击一张照片进入查看器
- When 查看器加载完成
- Then 照片以 aspectFit 模式居中显示在页面中
- And 图片占据合理的可视区域（非 0 高度）

#### Scenario: 照片不存在

- Given 照片已被删除或不存在
- When 查看器加载完成
- Then 显示"照片不存在或已被删除"的空状态提示
