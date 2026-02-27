## ADDED Requirements

### Requirement: Photo Upload Record Stores Cloud File ID
照片云函数的 upload action SHALL 接收客户端传入的 `file_id` 参数并将其写入数据库记录，确保照片可被正确加载显示。云函数注释 SHALL 准确反映实际的调用流程。

#### Scenario: 客户端上传照片后记录包含有效 file_id
- **WHEN** 客户端先通过 `wx.cloud.uploadFile` 上传图片获得 fileID，再调用 `photo/upload` 传入 `file_id`
- **THEN** 云函数创建的 photos 记录中 `file_id` 字段包含有效的云文件 ID
- **AND** 记录 `status` 字段设为 `active`

### Requirement: Historical Empty File ID Repair
系统 SHALL 提供管理员修复脚本，用于修复历史照片记录中 `file_id` 为空字符串的数据。

#### Scenario: 修复旧照片记录的空 file_id
- **WHEN** 管理员执行修复脚本
- **THEN** 脚本遍历 photos 集合中 `file_id` 为空的记录
- **AND** 根据云存储路径模式查找对应文件并回填 `file_id`
- **AND** 将 `status` 更新为 `active`
