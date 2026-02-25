/**
 * 自定义称呼表云函数 —— 管理用户自定义的亲属称谓覆盖表
 *
 * actions:
 *   create  — 创建一个称呼表
 *   update  — 更新称呼表（名称或覆盖项）
 *   delete  — 删除称呼表
 *   get     — 获取单个称呼表详情
 *   list    — 列出家庭内所有已分享的称呼表 + 自己的
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: process.env.CLOUD_ENV || null })
const db = cloud.database()
const _ = db.command

// ---------------------------------------------------------------------------
// helpers (inline to keep self-contained)
// ---------------------------------------------------------------------------
function success(data) {
  return { code: 0, data: data !== undefined ? data : null }
}

function fail(msg, code) {
  return { code: code || -1, message: msg }
}

async function checkMembership(openid, familyId) {
  const res = await db.collection('family_members')
    .where({ user_id: openid, family_id: familyId })
    .limit(1)
    .get()
  return res.data.length > 0 ? res.data[0] : null
}

// ---------------------------------------------------------------------------
// action: create
// ---------------------------------------------------------------------------
async function handleCreate(openid, params) {
  const { family_id, name, overrides = {}, is_shared = false } = params

  if (!family_id) return fail('缺少 family_id')
  if (!name || !name.trim()) return fail('称呼表名称不能为空')

  const membership = await checkMembership(openid, family_id)
  if (!membership) return fail('您不是该家庭的成员', -3)

  // Validate overrides: keys should be path|gender format, values should be strings
  if (typeof overrides !== 'object') return fail('overrides 格式错误')
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value !== 'string' || value.length > 20) {
      return fail(`称谓值过长或格式错误: ${key}`)
    }
  }

  const now = db.serverDate()
  const doc = {
    creator_id: openid,
    family_id,
    name: name.trim(),
    overrides,
    is_shared: !!is_shared,
    created_at: now,
    updated_at: now
  }

  const { _id } = await db.collection('custom_title_maps').add({ data: doc })
  return success({ _id })
}

// ---------------------------------------------------------------------------
// action: update
// ---------------------------------------------------------------------------
async function handleUpdate(openid, params) {
  const { title_map_id, name, overrides, is_shared } = params

  if (!title_map_id) return fail('缺少 title_map_id')

  let doc
  try {
    const res = await db.collection('custom_title_maps').doc(title_map_id).get()
    doc = res.data
  } catch (e) {
    return fail('称呼表不存在')
  }

  if (doc.creator_id !== openid) {
    return fail('只能编辑自己创建的称呼表')
  }

  const updateData = { updated_at: db.serverDate() }
  if (name !== undefined) {
    if (!name.trim()) return fail('称呼表名称不能为空')
    updateData.name = name.trim()
  }
  if (overrides !== undefined) {
    if (typeof overrides !== 'object') return fail('overrides 格式错误')
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value !== 'string' || value.length > 20) {
        return fail(`称谓值过长或格式错误: ${key}`)
      }
    }
    updateData.overrides = overrides
  }
  if (is_shared !== undefined) {
    updateData.is_shared = !!is_shared
  }

  await db.collection('custom_title_maps').doc(title_map_id).update({ data: updateData })
  return success()
}

// ---------------------------------------------------------------------------
// action: delete
// ---------------------------------------------------------------------------
async function handleDelete(openid, params) {
  const { title_map_id } = params

  if (!title_map_id) return fail('缺少 title_map_id')

  let doc
  try {
    const res = await db.collection('custom_title_maps').doc(title_map_id).get()
    doc = res.data
  } catch (e) {
    return fail('称呼表不存在')
  }

  if (doc.creator_id !== openid) {
    return fail('只能删除自己创建的称呼表')
  }

  // Remove any references to this title map from family_members
  await db.collection('family_members')
    .where({ family_id: doc.family_id, adopted_title_map_id: title_map_id })
    .update({ data: { adopted_title_map_id: _.remove() } })

  await db.collection('custom_title_maps').doc(title_map_id).remove()
  return success()
}

// ---------------------------------------------------------------------------
// action: get
// ---------------------------------------------------------------------------
async function handleGet(openid, params) {
  const { title_map_id } = params

  if (!title_map_id) return fail('缺少 title_map_id')

  let doc
  try {
    const res = await db.collection('custom_title_maps').doc(title_map_id).get()
    doc = res.data
  } catch (e) {
    return fail('称呼表不存在')
  }

  // Check membership
  const membership = await checkMembership(openid, doc.family_id)
  if (!membership) return fail('您不是该家庭的成员', -3)

  // Only visible if is_shared or own
  if (!doc.is_shared && doc.creator_id !== openid) {
    return fail('该称呼表未分享')
  }

  return success(doc)
}

// ---------------------------------------------------------------------------
// action: list
// ---------------------------------------------------------------------------
async function handleList(openid, params) {
  const { family_id } = params

  if (!family_id) return fail('缺少 family_id')

  const membership = await checkMembership(openid, family_id)
  if (!membership) return fail('您不是该家庭的成员', -3)

  // Get all shared title maps + my own (even if not shared)
  const res = await db.collection('custom_title_maps')
    .where(_.and([
      { family_id },
      _.or([
        { is_shared: true },
        { creator_id: openid }
      ])
    ]))
    .orderBy('created_at', 'desc')
    .get()

  // Mark own maps
  const data = res.data.map(m => ({
    ...m,
    _isMine: m.creator_id === openid
  }))

  return success(data)
}

// ---------------------------------------------------------------------------
// 入口 / 路由
// ---------------------------------------------------------------------------
exports.main = async (event, context) => {
  const { action, ...params } = event

  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('无法获取用户身份')

  switch (action) {
    case 'create':
      return handleCreate(OPENID, params)
    case 'update':
      return handleUpdate(OPENID, params)
    case 'delete':
      return handleDelete(OPENID, params)
    case 'get':
      return handleGet(OPENID, params)
    case 'list':
      return handleList(OPENID, params)
    default:
      return fail(`未知的 action: ${action}`)
  }
}
