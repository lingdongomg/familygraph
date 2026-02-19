## 新增需求

### 需求: 创建关系
系统应允许 Owner 和 Member 用户在两个 Person 之间创建有向关系边。创建关系时应根据关系类型和目标 Person 的性别自动创建反向边。

#### 场景: 创建亲子关系
- **当** 用户创建一条 A 是 B 的 FATHER 关系
- **则** 系统创建正向边（A 是 B 的 FATHER）
- **且** 根据 B 的性别创建反向边（B 是 A 的 SON 或 DAUGHTER）

#### 场景: 创建配偶关系
- **当** 用户创建一条 A 是 B 的 HUSBAND 关系
- **则** 系统创建正向边（A 是 B 的 HUSBAND）
- **且** 创建反向边（B 是 A 的 WIFE）

#### 场景: 创建兄弟姐妹关系
- **当** 用户创建一条 A 是 B 的 OLDER_BROTHER 关系
- **则** 系统创建正向边（A 是 B 的 OLDER_BROTHER）
- **且** 根据 B 的性别创建反向边（B 是 A 的 YOUNGER_BROTHER 或 YOUNGER_SISTER）

### 需求: 删除关系
系统应允许 Owner 和 Member 用户删除关系。删除关系时应同时删除其反向边。

#### 场景: 删除关系对
- **当** 用户删除一条关系边
- **则** 系统同时删除正向边和对应的反向边

### 需求: 关系类型枚举
系统应支持恰好 10 种关系类型: FATHER（父亲）、MOTHER（母亲）、SON（儿子）、DAUGHTER（女儿）、HUSBAND（丈夫）、WIFE（妻子）、OLDER_BROTHER（哥哥）、YOUNGER_BROTHER（弟弟）、OLDER_SISTER（姐姐）、YOUNGER_SISTER（妹妹）。

#### 场景: 有效的关系类型
- **当** 创建一条关系
- **则** relation_type 必须是上述 10 种枚举类型之一

### 需求: 反向关系映射
系统应将每种关系类型映射为其反向类型，对于性别相关的反向关系需考虑目标 Person 的性别。

#### 场景: FATHER 的性别相关反向
- **当** A 被设为 B 的 FATHER，且 B 的性别为女
- **则** 反向边为 B 是 A 的 DAUGHTER

#### 场景: OLDER_BROTHER 的性别相关反向
- **当** A 被设为 B 的 OLDER_BROTHER，且 B 的性别为女
- **则** 反向边为 B 是 A 的 YOUNGER_SISTER
