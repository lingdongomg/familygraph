## ADDED Requirements

### Requirement: Dual-Line Node Labels
图谱中每个节点 MUST 在节点圆圈下方显示双行标签：第一行为人物姓名（粗体），第二行为关系称谓（常规字体、灰色）。

自我节点（当前用户绑定的人物）的第二行 MUST 显示"本人"。

他人节点的第二行 MUST 按以下优先级显示称谓：用户自己编辑的称谓（person_notes 中的 custom_title）> 称谓表计算的正式称谓（BFS formal_title）。若两者均无则不显示第二行。

当用户未绑定家庭中的任何人物时，所有节点 MUST 仅显示第一行姓名。

姓名超过 4 个字符时 MUST 截断并显示省略号。称谓超过 5 个字符时 MUST 截断并显示省略号。

#### Scenario: 自我节点显示姓名和本人
- **WHEN** 当前用户绑定了家庭中的人物"张三"
- **THEN** 该节点第一行显示"张三"，第二行显示"本人"

#### Scenario: 父亲节点显示姓名和称谓
- **WHEN** 家庭中存在人物"李四"，且 BFS 计算出其对当前用户的正式称谓为"父亲"
- **THEN** 该节点第一行显示"李四"，第二行显示"父亲"

#### Scenario: 用户编辑的自定义称谓优先
- **WHEN** 用户在备注中为"李四"设置了 custom_title 为"老爸"，同时 BFS 正式称谓为"父亲"
- **THEN** 该节点第二行显示"老爸"（用户编辑的优先）

#### Scenario: 无称谓的节点仅显示姓名
- **WHEN** 某人物与当前用户之间无可达路径且无自定义称谓
- **THEN** 该节点仅显示第一行姓名，不显示第二行

#### Scenario: 长名字截断
- **WHEN** 人物姓名为"欧阳修远哲"（5个字符）
- **THEN** 第一行显示"欧阳修远…"

### Requirement: Self Node Visual Highlight
当前用户绑定的节点 MUST 使用醒目的金色描边环（#D4A017, 3px）替代默认的白色描边，以便用户快速定位自己在图谱中的位置。

#### Scenario: 自我节点金色描边
- **WHEN** 图谱渲染包含当前用户绑定的人物
- **THEN** 该节点显示金色描边环，其他节点保持白色描边

### Requirement: Spouse Layout Alignment
图谱组件在构建 ForceGraph 数据时 MUST 从关系边中检测 HUSBAND/WIFE 类型的配偶关系，并为配偶对的节点设置 `isSpouse` 和 `spouseId` 属性，使力导向引擎的配偶对齐力生效。

#### Scenario: 配偶对相邻排列
- **WHEN** 家庭中"张三"和"李四"之间存在 HUSBAND/WIFE 关系
- **THEN** 二者在图谱中处于同一代（Y 坐标相近）且水平相邻排列

### Requirement: Readable Node Sizing
图谱节点 MUST 使用足够大的尺寸和字体保证可读性。NODE_RADIUS MUST 为 30，节点内首字母 FONT_SIZE MUST 为 13px，第一行标签字体 MUST 为 11px，代际间距 GENERATION_Y_SPACING MUST 为 140 以容纳双行标签。

#### Scenario: 节点尺寸参数
- **WHEN** 图谱渲染节点
- **THEN** 节点半径为 30px，首字母字体为 13px，名字标签字体为 11px，代际间距为 140px

### Requirement: Node Tap Hit Area
点击图谱节点的头像圆圈或下方标签文字区域 MUST 均能触发节点点击事件，导航到对应人物的详情页面。

ForceGraph 的 `getNodeAt()` hit-test 热区 MUST 覆盖节点圆圈和双行标签的完整区域（LABEL_HIT_EXTRA MUST 为 40px）。

#### Scenario: 点击头像跳转
- **WHEN** 用户点击图谱中某节点的头像圆圈
- **THEN** 跳转到该人物的详情页面

#### Scenario: 点击标签跳转
- **WHEN** 用户点击图谱中某节点下方的姓名或称谓文字
- **THEN** 跳转到该人物的详情页面
