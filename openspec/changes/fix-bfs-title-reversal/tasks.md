## 1. 诊断与验证
- [ ] 1.1 在 `cloudfunctions/relationship/index.js` 的 `bfsComputeTitle()` 中添加调试日志：记录每条遍历的边（from, to, original type, reversed type）和最终的 pathKey
- [ ] 1.2 重新部署 `relationship` 云函数到微信云开发环境
- [ ] 1.3 在微信开发者工具中测试：创建"新成员是张三的父亲"，检查云函数日志输出确认 BFS 路径为 `FATHER|male` 而非 `SON|male`
- [ ] 1.4 在图谱页面验证父亲节点标签显示"父亲"

## 2. 清理
- [ ] 2.1 确认问题解决后，移除 `bfsComputeTitle()` 中的调试日志
- [ ] 2.2 重新部署清理后的 `relationship` 云函数
