const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const { success, fail, checkMembership, hasPermission, generateCode } = require('./utils/helpers')
const { GUEST_VISIBLE_FIELDS, INVITE_CODE_EXPIRE_DAYS, SHARE_LINK_EXPIRE_DAYS } = require('./utils/constants')

// ────────────────────────────────────────
// Router
// ────────────────────────────────────────
exports.main = async (event, context) => {
  const { action, ...params } = event
  const actions = {
    create,
    delete: del,
    getDetail,
    generateInviteCode: genInviteCode,
    generateShareLink: genShareLink,
    getByShareCode
  }

  if (!actions[action]) {
    return fail(`未知操作: ${action}`)
  }

  try {
    return await actions[action](params, context)
  } catch (err) {
    console.error(`[family/${action}]`, err)
    return fail(err.message || '服务器内部错误')
  }
}

// ────────────────────────────────────────
// create — 创建家庭
// ────────────────────────────────────────
async function create(params) {
  const { name, person_name, person_gender, person_birth_year } = params

  if (!name || !person_name || !person_gender) {
    return fail('缺少必填参数 (name, person_name, person_gender)')
  }

  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('无法获取用户身份')

  const now = db.serverDate()

  // 创建家庭记录
  const familyData = {
    name,
    owner_id: OPENID,
    member_count: 1,
    storage_used_bytes: 0,
    storage_unlimited: false,
    invite_code: null,
    invite_code_active: false,
    invite_code_expire: null,
    created_at: now,
    updated_at: now
  }

  const familyRes = await db.collection('families').add({ data: familyData })
  const familyId = familyRes._id

  // 创建 Person 记录（创建者本人）
  const personData = {
    family_id: familyId,
    name: person_name,
    gender: person_gender,
    birth_year: person_birth_year || null,
    is_deceased: false,
    avatar: '',
    avatar_public: false,
    generation: 0,
    bound_user_id: OPENID,
    created_at: now,
    updated_at: now
  }

  const personRes = await db.collection('persons').add({ data: personData })
  const personId = personRes._id

  // 创建 family_members 记录
  await db.collection('family_members').add({
    data: {
      family_id: familyId,
      user_id: OPENID,
      person_id: personId,
      role: 'owner',
      joined_at: now
    }
  })

  // 将 family_id 添加到用户的 family_ids 数组
  await db.collection('users')
    .where({ openid_hash: { $exists: true } })
    .limit(0) // 不执行此查询，改用下方精准方式

  // 通过 openid 相关字段更新用户（与其他云函数保持一致）
  const userRes = await db.collection('users')
    .where({ encrypted_openid: { $exists: true } })
    .get()

  // 使用 command.push 更新 family_ids
  // 注意：在实际环境中应通过 openid_hash 定位用户，此处简化处理
  const crypto = require('crypto')
  const openidHash = crypto.createHash('sha256').update(OPENID).digest('hex')

  await db.collection('users')
    .where({ openid_hash: openidHash })
    .update({
      data: { family_ids: _.push(familyId) }
    })

  return success({ family_id: familyId, person_id: personId })
}

// ────────────────────────────────────────
// delete — Owner 删除家庭（级联删除所有关联数据）
// ────────────────────────────────────────
async function del(params) {
  const { family_id } = params

  if (!family_id) {
    return fail('缺少 family_id')
  }

  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('无法获取用户身份')

  // 检查调用者是否为 Owner
  const membership = await checkMembership(db, OPENID, family_id)
  if (!membership) return fail('您不是该家庭的成员')
  if (!hasPermission(membership.role, 'owner')) {
    return fail('仅 Owner 可删除家庭')
  }

  // 获取所有家庭成员的 user_id，用于后续清理 family_ids
  const membersRes = await db.collection('family_members')
    .where({ family_id })
    .get()
  const memberUserIds = membersRes.data.map(m => m.user_id)

  // 级联删除所有关联数据（并行执行）
  await Promise.all([
    db.collection('persons').where({ family_id }).remove(),
    db.collection('relationships').where({ family_id }).remove(),
    db.collection('photos').where({ family_id }).remove(),
    db.collection('photo_tags').where({ family_id }).remove(),
    db.collection('edit_history').where({ family_id }).remove(),
    db.collection('join_requests').where({ family_id }).remove(),
    db.collection('share_links').where({ family_id }).remove(),
    db.collection('family_members').where({ family_id }).remove(),
    db.collection('person_notes').where({ family_id }).remove()
  ])

  // 删除家庭记录本身
  await db.collection('families').doc(family_id).remove()

  // 从所有成员用户的 family_ids 中移除该家庭 ID
  for (const userId of memberUserIds) {
    const crypto = require('crypto')
    const userHash = crypto.createHash('sha256').update(userId).digest('hex')
    await db.collection('users')
      .where({ openid_hash: userHash })
      .update({
        data: { family_ids: _.pull(family_id) }
      })
  }

  return success()
}

// ────────────────────────────────────────
// getDetail — 获取家庭详情 + 统计
// ────────────────────────────────────────
async function getDetail(params) {
  const { family_id } = params

  if (!family_id) {
    return fail('缺少 family_id')
  }

  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('无法获取用户身份')

  // 检查调用者是否为家庭成员
  const membership = await checkMembership(db, OPENID, family_id)
  if (!membership) return fail('您不是该家庭的成员')

  // 获取家庭记录
  const familyRes = await db.collection('families').doc(family_id).get()
  const family = familyRes.data
  if (!family) {
    return fail('家庭不存在')
  }

  return success({
    _id: family._id,
    name: family.name,
    owner_id: family.owner_id,
    member_count: family.member_count,
    storage_used_bytes: family.storage_used_bytes,
    storage_unlimited: family.storage_unlimited,
    invite_code_active: family.invite_code_active || false,
    created_at: family.created_at,
    updated_at: family.updated_at
  })
}

// ────────────────────────────────────────
// generateInviteCode — 生成 6 位邀请码
// ────────────────────────────────────────
async function genInviteCode(params) {
  const { family_id } = params

  if (!family_id) {
    return fail('缺少 family_id')
  }

  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('无法获取用户身份')

  // 检查调用者是否为 Owner 或 Member
  const membership = await checkMembership(db, OPENID, family_id)
  if (!membership) return fail('您不是该家庭的成员')
  if (!hasPermission(membership.role, 'member')) {
    return fail('Restricted 用户无权生成邀请码')
  }

  const code = generateCode(6)
  const expireAt = Date.now() + INVITE_CODE_EXPIRE_DAYS * 24 * 60 * 60 * 1000

  // 更新家庭记录，设置新的邀请码（同时使之前的失效）
  await db.collection('families').doc(family_id).update({
    data: {
      invite_code: code,
      invite_code_active: true,
      invite_code_expire: expireAt,
      updated_at: db.serverDate()
    }
  })

  return success({ invite_code: code, expire_at: expireAt })
}

// ────────────────────────────────────────
// generateShareLink — 生成分享链接码
// ────────────────────────────────────────
async function genShareLink(params) {
  const { family_id } = params

  if (!family_id) {
    return fail('缺少 family_id')
  }

  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('无法获取用户身份')

  // 检查调用者是否为家庭成员（任何角色均可）
  const membership = await checkMembership(db, OPENID, family_id)
  if (!membership) return fail('您不是该家庭的成员')

  const code = generateCode(6)
  const now = Date.now()
  const expireAt = now + SHARE_LINK_EXPIRE_DAYS * 24 * 60 * 60 * 1000

  // 创建 share_links 记录
  const shareLinkData = {
    family_id,
    code,
    created_by: OPENID,
    expire_at: expireAt,
    is_active: true,
    view_count: 0,
    created_at: now
  }

  const addRes = await db.collection('share_links').add({ data: shareLinkData })

  return success({ share_link_id: addRes._id, code, expire_at: expireAt })
}

// ────────────────────────────────────────
// getByShareCode — 公开接口，通过分享码查看家庭
// ────────────────────────────────────────
async function getByShareCode(params) {
  const { share_code } = params

  if (!share_code) {
    return fail('缺少 share_code')
  }

  // 查找分享链接
  const linkRes = await db.collection('share_links')
    .where({
      code: share_code,
      is_active: true
    })
    .limit(1)
    .get()

  if (linkRes.data.length === 0) {
    return fail('分享链接无效或已失效')
  }

  const link = linkRes.data[0]

  // 检查是否过期
  if (link.expire_at < Date.now()) {
    return fail('分享链接已过期')
  }

  // 递增 view_count
  await db.collection('share_links').doc(link._id).update({
    data: { view_count: _.inc(1) }
  })

  const familyId = link.family_id

  // 获取家庭名称
  const familyRes = await db.collection('families').doc(familyId).get()
  const family = familyRes.data
  if (!family) {
    return fail('家庭不存在')
  }

  // 获取 persons（仅返回 GUEST_VISIBLE_FIELDS）
  const personsRes = await db.collection('persons')
    .where({ family_id: familyId })
    .get()

  const persons = personsRes.data.map(p => {
    const filtered = { _id: p._id }
    for (const key of GUEST_VISIBLE_FIELDS) {
      filtered[key] = p[key] !== undefined ? p[key] : null
    }
    return filtered
  })

  // 获取 relationships（用于家谱图渲染）
  const relsRes = await db.collection('relationships')
    .where({ family_id: familyId })
    .get()

  const relationships = relsRes.data.map(r => ({
    _id: r._id,
    from_id: r.from_id,
    to_id: r.to_id,
    relation_type: r.relation_type
  }))

  return success({
    family_name: family.name,
    persons,
    relationships
  })
}
