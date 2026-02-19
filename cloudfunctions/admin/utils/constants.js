/**
 * 云函数公共常量（与客户端 constants.js 同步）
 */

const SHARED_FIELDS = ['name', 'gender', 'birth_year', 'is_deceased', 'avatar', 'generation']
const PRIVATE_OVERLAY_FIELDS = ['phone', 'wechat_id', 'birth_date', 'city', 'occupation', 'custom_title', 'remark']
const ENCRYPTED_FIELDS = ['phone', 'wechat_id']

const RELATION_TYPES = [
  'FATHER', 'MOTHER', 'SON', 'DAUGHTER',
  'HUSBAND', 'WIFE',
  'OLDER_BROTHER', 'YOUNGER_BROTHER', 'OLDER_SISTER', 'YOUNGER_SISTER'
]

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

const GENERATION_DELTA = {
  FATHER: -1, MOTHER: -1,
  SON: 1, DAUGHTER: 1,
  HUSBAND: 0, WIFE: 0,
  OLDER_BROTHER: 0, YOUNGER_BROTHER: 0,
  OLDER_SISTER: 0, YOUNGER_SISTER: 0
}

const ROLES = { OWNER: 'owner', MEMBER: 'member', RESTRICTED: 'restricted' }

const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024
const MAX_PHOTOS_PER_PERSON = 20
const INVITE_CODE_EXPIRE_DAYS = 7
const SHARE_LINK_EXPIRE_DAYS = 7
const JOIN_REQUEST_EXPIRE_HOURS = 48
const EDIT_HISTORY_RETAIN_DAYS = 90
const BFS_MAX_DEPTH = 5
const GUEST_VISIBLE_FIELDS = ['name', 'gender', 'birth_year', 'is_deceased', 'avatar']

module.exports = {
  SHARED_FIELDS, PRIVATE_OVERLAY_FIELDS, ENCRYPTED_FIELDS,
  RELATION_TYPES, REVERSE_RELATION, GENERATION_DELTA, ROLES,
  STORAGE_QUOTA_BYTES, MAX_PHOTOS_PER_PERSON,
  INVITE_CODE_EXPIRE_DAYS, SHARE_LINK_EXPIRE_DAYS, JOIN_REQUEST_EXPIRE_HOURS,
  EDIT_HISTORY_RETAIN_DAYS, BFS_MAX_DEPTH, GUEST_VISIBLE_FIELDS
}
