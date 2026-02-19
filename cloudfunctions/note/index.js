/**
 * 备注云函数 —— 管理用户对家庭成员的私有备注覆盖
 *
 * actions:
 *   upsert — 创建或更新某成员的私有备注（phone / wechat_id 加密存储）
 *   get    — 获取当前用户对某成员的私有备注（phone / wechat_id 解密返回）
 */

const cloud = require('wx-server-sdk')
const { encrypt, decrypt } = require('../utils/crypto')
const { success, fail, checkMembership } = require('../utils/helpers')

cloud.init({ env: process.env.CLOUD_ENV || null })
const db = cloud.database()
const _ = db.command

// ---------------------------------------------------------------------------
// action: upsert — 创建或更新私有备注
// ---------------------------------------------------------------------------
async function handleUpsert(openid, params) {
  const { family_id, person_id, phone, wechat_id, birth_date, city, occupation, custom_title, remark } = params

  if (!family_id || !person_id) {
    return fail('缺少必填参数 family_id 或 person_id')
  }

  // 检查家庭成员身份
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) {
    return fail('您不是该家庭的成员', -3)
  }

  // 构建更新对象 —— 仅包含调用方传入的字段
  const updateData = { updated_at: db.serverDate() }
  if (phone !== undefined) updateData.phone = encrypt(phone)
  if (wechat_id !== undefined) updateData.wechat_id = encrypt(wechat_id)
  if (birth_date !== undefined) updateData.birth_date = birth_date
  if (city !== undefined) updateData.city = city
  if (occupation !== undefined) updateData.occupation = occupation
  if (custom_title !== undefined) updateData.custom_title = custom_title
  if (remark !== undefined) updateData.remark = remark

  // 查找是否已存在该用户对该成员的备注
  const { data: existing } = await db.collection('person_notes')
    .where({ user_id: openid, person_id })
    .limit(1)
    .get()

  if (existing.length > 0) {
    // 更新已有记录
    await db.collection('person_notes').doc(existing[0]._id).update({ data: updateData })
    return success({ _id: existing[0]._id, ...updateData })
  }

  // 创建新记录
  const now = db.serverDate()
  const newNote = {
    family_id,
    person_id,
    user_id: openid,
    phone: phone !== undefined ? encrypt(phone) : '',
    wechat_id: wechat_id !== undefined ? encrypt(wechat_id) : '',
    birth_date: birth_date || '',
    city: city || '',
    occupation: occupation || '',
    custom_title: custom_title || '',
    remark: remark || '',
    created_at: now,
    updated_at: now
  }

  const { _id } = await db.collection('person_notes').add({ data: newNote })
  return success({ _id, ...newNote })
}

// ---------------------------------------------------------------------------
// action: get — 获取私有备注
// ---------------------------------------------------------------------------
async function handleGet(openid, params) {
  const { family_id, person_id } = params

  if (!family_id || !person_id) {
    return fail('缺少必填参数 family_id 或 person_id')
  }

  // 检查家庭成员身份
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) {
    return fail('您不是该家庭的成员', -3)
  }

  const { data: notes } = await db.collection('person_notes')
    .where({ user_id: openid, person_id })
    .limit(1)
    .get()

  if (notes.length === 0) {
    return success({})
  }

  const note = notes[0]

  // 解密敏感字段
  if (note.phone) note.phone = decrypt(note.phone)
  if (note.wechat_id) note.wechat_id = decrypt(note.wechat_id)

  return success(note)
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
    case 'upsert':
      return handleUpsert(OPENID, params)
    case 'get':
      return handleGet(OPENID, params)
    default:
      return fail(`未知的 action: ${action}`)
  }
}
