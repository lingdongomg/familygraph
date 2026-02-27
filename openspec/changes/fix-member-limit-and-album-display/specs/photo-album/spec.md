## ADDED Requirements

### Requirement: Photo Upload Stores Cloud File ID
照片上传云函数 SHALL 接收客户端传入的 `file_id` 参数，并将其写入数据库 `photos` 记录的 `file_id` 字段，以确保照片可被正确加载和显示。

#### Scenario: 客户端上传照片后 file_id 被正确存储
- **WHEN** 客户端调用 `photo/upload` 并传入 `file_id`、`family_id`、`person_id`、`file_size`
- **THEN** 云函数创建的 photos 记录中 `file_id` 字段包含客户端传入的云文件 ID
- **AND** 记录 `status` 字段设为 `active`

#### Scenario: 相册页正确显示已上传的照片
- **WHEN** 用户进入某人物的相册页
- **THEN** 每张照片的 `<image>` 组件 src 绑定的 `file_id` 字段包含有效的云文件 ID
- **AND** 照片正常渲染，不显示为黑色或空白
