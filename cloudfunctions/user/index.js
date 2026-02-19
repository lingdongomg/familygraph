/**
 * 用户云函数 —— 处理登录与个人资料更新
 *
 * actions:
 *   login         — 微信登录（首次自动创建用户记录）
 *   updateProfile — 修改昵称 / 头像
 */

const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const { encrypt } = require('./utils/crypto')
const { success, fail } = require('./utils/helpers')

cloud.init({ env: process.env.CLOUD_ENV || null })
const db = cloud.database()

// ---------------------------------------------------------------------------
// 工具：将 openid 转为 SHA-256 哈希，用于高效查询
// ---------------------------------------------------------------------------
function hashOpenId(openid) {
  return crypto.createHash('sha256').update(openid).digest('hex')
}

// ---------------------------------------------------------------------------
// action: login
// ---------------------------------------------------------------------------
async function handleLogin(openid) {
  const openidHash = hashOpenId(openid)

  // 通过哈希字段快速查找用户
  const { data: users } = await db.collection('users')
    .where({ openid_hash: openidHash })
    .limit(1)
    .get()

  // 已注册用户 —— 直接返回
  if (users.length > 0) {
    const user = users[0]
    return success({ user_id: user._id, ...user })
  }

  // 首次登录 —— 创建新用户
  const now = db.serverDate()
  const newUser = {
    openid_hash: openidHash,
    encrypted_openid: encrypt(openid),
    nickname: '微信用户',
    avatar_url: '',
    family_ids: [],
    created_at: now,
    updated_at: now
  }

  const { _id } = await db.collection('users').add({ data: newUser })
  return success({ user_id: _id, ...newUser })
}

// ---------------------------------------------------------------------------
// action: updateProfile
// ---------------------------------------------------------------------------
async function handleUpdateProfile(openid, { nickname, avatar_url }) {
  if (nickname === undefined && avatar_url === undefined) {
    return fail('缺少需要更新的字段 (nickname / avatar_url)')
  }

  const openidHash = hashOpenId(openid)

  const { data: users } = await db.collection('users')
    .where({ openid_hash: openidHash })
    .limit(1)
    .get()

  if (users.length === 0) {
    return fail('用户不存在，请先登录', -2)
  }

  const user = users[0]

  // 构建更新对象 —— 仅包含调用方传入的字段
  const updateData = { updated_at: db.serverDate() }
  if (nickname !== undefined) updateData.nickname = nickname
  if (avatar_url !== undefined) updateData.avatar_url = avatar_url

  await db.collection('users').doc(user._id).update({ data: updateData })

  return success({ user_id: user._id, ...user, ...updateData })
}

// ---------------------------------------------------------------------------
// 入口 / 路由
// ---------------------------------------------------------------------------
exports.main = async (event, context) => {
  const { action, ...params } = event

  // 获取调用者 openid
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return fail('无法获取用户身份')
  }

  switch (action) {
    case 'login':
      return handleLogin(OPENID)
    case 'updateProfile':
      return handleUpdateProfile(OPENID, params)
    default:
      return fail(`未知的 action: ${action}`)
  }
}
