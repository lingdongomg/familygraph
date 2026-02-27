# Spec: photo-tagging

照片标记坐标系统

## MODIFIED Requirements

### Requirement: 标记坐标 MUST 准确反映用户点击位置

用户在照片上点击的位置 MUST 作为标记点的坐标，标记点显示位置与点击位置一致。

#### Scenario: 在照片中央点击标记

- Given 用户在 tag 页面查看一张照片
- When 用户点击照片中央位置
- Then 标记点出现在照片中央（约 x=50%, y=50%）
- And 标记点不出现在左上角

#### Scenario: 在照片边缘点击标记

- Given 用户在 tag 页面查看一张照片
- When 用户点击照片右下角附近
- Then 标记点出现在右下角附近（约 x=90%, y=90%）

### Requirement: 保存的标记 MUST 在查看器中正确显示

标记保存后在 viewer 页面重新加载时，标记点 MUST 显示在与标记时一致的位置。

#### Scenario: 标记保存后查看

- Given 用户在照片中间标记了一个人物并保存
- When 用户返回 viewer 页面查看该照片
- Then 标记点显示在照片中间位置
- And 标记点位置与标记时一致

#### Scenario: 坐标单位转换正确

- Given DB 中存储的标记坐标为 0-1 范围（如 x=0.5, y=0.5）
- When viewer 页面渲染标记
- Then CSS 定位使用 50% 而非 0.5%
