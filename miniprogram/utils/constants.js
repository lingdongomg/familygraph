/**
 * 常量定义
 */

// 共享字段（存储在 persons 集合，所有人可见）
const SHARED_FIELDS = ['name', 'gender', 'birth_year', 'is_deceased', 'avatar', 'generation']

// 私人覆盖字段（存储在 person_notes 集合，仅记录者可见）
const PRIVATE_OVERLAY_FIELDS = ['phone', 'wechat_id', 'birth_date', 'city', 'occupation', 'custom_title', 'remark']

// 需要 AES 加密的私人字段
const ENCRYPTED_FIELDS = ['phone', 'wechat_id']

// 关系类型枚举
const RELATION_TYPES = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  SON: 'SON',
  DAUGHTER: 'DAUGHTER',
  HUSBAND: 'HUSBAND',
  WIFE: 'WIFE',
  OLDER_BROTHER: 'OLDER_BROTHER',
  YOUNGER_BROTHER: 'YOUNGER_BROTHER',
  OLDER_SISTER: 'OLDER_SISTER',
  YOUNGER_SISTER: 'YOUNGER_SISTER'
}

// 关系类型中文映射
const RELATION_TYPE_LABELS = {
  FATHER: '父亲',
  MOTHER: '母亲',
  SON: '儿子',
  DAUGHTER: '女儿',
  HUSBAND: '丈夫',
  WIFE: '妻子',
  OLDER_BROTHER: '哥哥',
  YOUNGER_BROTHER: '弟弟',
  OLDER_SISTER: '姐姐',
  YOUNGER_SISTER: '妹妹'
}

// 反向关系映射
// 格式: { relation_type: { male: reverse_type, female: reverse_type } }
const REVERSE_RELATION = {
  FATHER: { male: 'SON', female: 'DAUGHTER' },
  MOTHER: { male: 'SON', female: 'DAUGHTER' },
  SON: { male: 'FATHER', female: 'MOTHER' },
  DAUGHTER: { male: 'FATHER', female: 'MOTHER' },
  HUSBAND: { male: 'WIFE', female: 'WIFE' },
  WIFE: { male: 'HUSBAND', female: 'HUSBAND' },
  OLDER_BROTHER: { male: 'YOUNGER_BROTHER', female: 'YOUNGER_SISTER' },
  YOUNGER_BROTHER: { male: 'OLDER_BROTHER', female: 'OLDER_SISTER' },
  OLDER_SISTER: { male: 'YOUNGER_BROTHER', female: 'YOUNGER_SISTER' },
  YOUNGER_SISTER: { male: 'OLDER_BROTHER', female: 'OLDER_SISTER' }
}

// 关系类型的辈分差 (正数=晚辈, 负数=长辈, 0=同辈)
const GENERATION_DELTA = {
  FATHER: -1,
  MOTHER: -1,
  SON: 1,
  DAUGHTER: 1,
  HUSBAND: 0,
  WIFE: 0,
  OLDER_BROTHER: 0,
  YOUNGER_BROTHER: 0,
  OLDER_SISTER: 0,
  YOUNGER_SISTER: 0
}

// 家庭成员角色
const ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
  RESTRICTED: 'restricted'
}

// 加入申请状态
const JOIN_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
}

// 编辑历史操作类型
const EDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ROLLBACK: 'rollback'
}

// 存储配额
const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024 // 500MB
const MAX_PHOTOS_PER_PERSON = 20

// 邀请码/分享码/申请过期时间
const INVITE_CODE_EXPIRE_DAYS = 7
const SHARE_LINK_EXPIRE_DAYS = 7
const JOIN_REQUEST_EXPIRE_HOURS = 48

// 编辑历史保留
const EDIT_HISTORY_RETAIN_DAYS = 90
const EDIT_HISTORY_MAX_PER_FAMILY = 500

// BFS 最大深度
const BFS_MAX_DEPTH = 5

// 图谱布局
const GRAPH = {
  NODE_RADIUS: 25,
  FONT_SIZE: 12,
  LABEL_FONT_SIZE: 10,
  REPULSION: 5000,
  ATTRACTION: 0.01,
  GENERATION_Y_SPACING: 120,
  SPOUSE_X_SPACING: 60,
  MAX_ITERATIONS: 100,
  DAMPING: 0.9,
  PADDING: 40
}

// 图片压缩
const IMAGE = {
  MAX_WIDTH: 1080,
  MAX_HEIGHT: 1080,
  QUALITY: 0.8,
  THUMB_SIZE: 300,
  THUMB_QUALITY: 0.6
}

// 性别
const GENDER = {
  MALE: 'male',
  FEMALE: 'female'
}

// 访客可见的共享字段
const GUEST_VISIBLE_FIELDS = ['name', 'gender', 'birth_year', 'is_deceased', 'avatar']

module.exports = {
  SHARED_FIELDS,
  PRIVATE_OVERLAY_FIELDS,
  ENCRYPTED_FIELDS,
  RELATION_TYPES,
  RELATION_TYPE_LABELS,
  REVERSE_RELATION,
  GENERATION_DELTA,
  ROLES,
  JOIN_REQUEST_STATUS,
  EDIT_ACTIONS,
  STORAGE_QUOTA_BYTES,
  MAX_PHOTOS_PER_PERSON,
  INVITE_CODE_EXPIRE_DAYS,
  SHARE_LINK_EXPIRE_DAYS,
  JOIN_REQUEST_EXPIRE_HOURS,
  EDIT_HISTORY_RETAIN_DAYS,
  EDIT_HISTORY_MAX_PER_FAMILY,
  BFS_MAX_DEPTH,
  GRAPH,
  IMAGE,
  GENDER,
  GUEST_VISIBLE_FIELDS
}
