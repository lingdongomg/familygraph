const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const crypto = require('crypto')
const { success, fail, checkMembership, hasPermission, generateCode } = require('./utils/helpers')

function hashOpenId(openid) {
  return crypto.createHash('sha256').update(openid).digest('hex')
}

/**
 * member 云函数入口
 * 处理家庭成员相关操作：申请加入、审批、退出、角色变更、成员列表
 */
exports.main = async (event) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'applyJoin':
      return applyJoin(event, OPENID)
    case 'reviewJoin':
      return reviewJoin(event, OPENID)
    case 'validateInvite':
      return validateInvite(event, OPENID)
    case 'listJoinRequests':
      return listJoinRequests(event, OPENID)
    case 'leave':
      return leave(event, OPENID)
    case 'changeRole':
      return changeRole(event, OPENID)
    case 'list':
      return list(event, OPENID)
    default:
      return fail('未知操作: ' + action)
  }
}

/**
 * 验证邀请码
 * 验证邀请码有效性，返回家庭信息和未绑定的成员列表
 */
async function validateInvite(event, openid) {
  const { invite_code } = event
  if (!invite_code) {
    return fail('缺少邀请码')
  }

  const now = Date.now()
  const familyRes = await db.collection('families')
    .where({
      invite_code: invite_code,
      invite_code_active: true,
      invite_code_expire: _.gt(now)
    })
    .limit(1)
    .get()

  if (familyRes.data.length === 0) {
    return fail('邀请码无效或已过期')
  }

  const family = familyRes.data[0]
  const familyId = family._id

  // 获取家庭的所有成员（仅共享字段）
  const personsRes = await db.collection('persons')
    .where({ family_id: familyId })
    .field({ _id: true, name: true, gender: true, birth_year: true, bound_user_id: true })
    .get()

  return success({
    family_id: familyId,
    family_name: family.name,
    persons: personsRes.data
  })
}

/**
 * 列出加入申请
 * Owner 和 Member 可查看家庭的加入申请列表
 */
async function listJoinRequests(event, openid) {
  const { family_id } = event
  if (!family_id) {
    return fail('缺少必要参数')
  }

  const membership = await checkMembership(db, openid, family_id)
  if (!membership) {
    return fail('您不是该家庭成员')
  }
  if (!hasPermission(membership.role, 'member')) {
    return fail('权限不足')
  }

  const requestsRes = await db.collection('join_requests')
    .where({ family_id })
    .orderBy('created_at', 'desc')
    .limit(50)
    .get()

  const requests = requestsRes.data

  // Enrich with person name for each request
  for (const req of requests) {
    if (req.person_id) {
      try {
        const pRes = await db.collection('persons').doc(req.person_id)
          .field({ name: true, gender: true })
          .get()
        req.person_name = pRes.data.name || ''
        req.person_gender = pRes.data.gender || ''
      } catch (e) {
        req.person_name = ''
      }
    }
    // Also get applicant nickname
    if (req.user_id) {
      const appHash = hashOpenId(req.user_id)
      const uRes = await db.collection('users')
        .where({ openid_hash: appHash })
        .field({ nickname: true, avatar_url: true })
        .limit(1)
        .get()
      if (uRes.data.length > 0) {
        req.applicant_nickname = uRes.data[0].nickname || '微信用户'
        req.applicant_avatar = uRes.data[0].avatar_url || ''
      }
    }
  }

  return success({ requests })
}

/**
 * 申请加入家庭
 * 验证邀请码，检查 Person 绑定状态，创建加入申请
 */
async function applyJoin(event, openid) {
  const { invite_code, person_id } = event
  if (!invite_code || !person_id) {
    return fail('缺少必要参数')
  }

  // 验证邀请码：查找包含该邀请码且激活且未过期的家庭
  const now = Date.now()
  const familyRes = await db.collection('families')
    .where({
      invite_code: invite_code,
      invite_code_active: true,
      invite_code_expire: _.gt(now)
    })
    .limit(1)
    .get()

  if (familyRes.data.length === 0) {
    return fail('邀请码无效或已过期')
  }

  const family = familyRes.data[0]
  const familyId = family._id

  // 检查用户是否已是该家庭成员
  const existingMember = await checkMembership(db, openid, familyId)
  if (existingMember) {
    return fail('您已是该家庭成员')
  }

  // 检查 Person 是否存在于该家庭且未被绑定
  const personRes = await db.collection('persons')
    .where({ _id: person_id, family_id: familyId })
    .limit(1)
    .get()

  if (personRes.data.length === 0) {
    return fail('该成员不存在于此家庭中')
  }

  const person = personRes.data[0]
  if (person.bound_user_id) {
    return fail('该成员已被其他用户绑定')
  }

  // 创建加入申请
  const joinRequest = {
    family_id: familyId,
    user_id: openid,
    person_id: person_id,
    status: 'pending',
    expire_at: now + 48 * 60 * 60 * 1000,
    created_at: now
  }

  const addRes = await db.collection('join_requests').add({ data: joinRequest })
  return success({ request_id: addRes._id })
}

/**
 * 审批加入申请
 * Owner 或 Member 可通过或拒绝待处理的加入申请
 */
async function reviewJoin(event, openid) {
  const { request_id, approved, reject_reason } = event
  if (!request_id || typeof approved !== 'boolean') {
    return fail('缺少必要参数')
  }

  // 获取加入申请
  const requestRes = await db.collection('join_requests')
    .where({ _id: request_id })
    .limit(1)
    .get()

  if (requestRes.data.length === 0) {
    return fail('加入申请不存在')
  }

  const joinRequest = requestRes.data[0]
  if (joinRequest.status !== 'pending') {
    return fail('该申请已处理')
  }

  // 检查审批人是否有权限（Owner 或 Member）
  const reviewer = await checkMembership(db, openid, joinRequest.family_id)
  if (!reviewer || !hasPermission(reviewer.role, 'member')) {
    return fail('无权审批该申请')
  }

  if (approved) {
    // 通过申请
    await db.collection('join_requests').doc(request_id).update({
      data: {
        status: 'approved',
        reviewed_by: openid,
        reviewed_at: Date.now()
      }
    })

    // 创建 family_members 记录
    await db.collection('family_members').add({
      data: {
        family_id: joinRequest.family_id,
        user_id: joinRequest.user_id,
        person_id: joinRequest.person_id,
        bound_person_id: joinRequest.person_id,
        role: 'member',
        created_at: Date.now()
      }
    })

    // 绑定 Person 的 bound_user_id
    await db.collection('persons').doc(joinRequest.person_id).update({
      data: { bound_user_id: joinRequest.user_id }
    })

    // 将 family_id 添加到用户的 family_ids 数组
    const applicantHash = hashOpenId(joinRequest.user_id)
    await db.collection('users').where({ openid_hash: applicantHash }).update({
      data: { family_ids: _.push(joinRequest.family_id) }
    })

    return success({ status: 'approved' })
  } else {
    // 拒绝申请
    const updateData = {
      status: 'rejected',
      reviewed_by: openid,
      reviewed_at: Date.now()
    }
    if (reject_reason) {
      updateData.reject_reason = reject_reason
    }

    await db.collection('join_requests').doc(request_id).update({
      data: updateData
    })

    return success({ status: 'rejected' })
  }
}

/**
 * 退出家庭
 * Member/Restricted 可退出家庭，Owner 不可直接退出
 */
async function leave(event, openid) {
  const { family_id } = event
  if (!family_id) {
    return fail('缺少必要参数')
  }

  // 检查用户是否是该家庭成员
  const member = await checkMembership(db, openid, family_id)
  if (!member) {
    return fail('您不是该家庭成员')
  }

  // Owner 不能退出
  if (member.role === 'owner') {
    return fail('Owner 不能直接退出家庭，请先转让所有权')
  }

  // 删除 family_members 记录
  await db.collection('family_members').doc(member._id).remove()

  // 解绑 Person（将 bound_user_id 设为 null）
  await db.collection('persons')
    .where({ family_id: family_id, bound_user_id: openid })
    .update({ data: { bound_user_id: null } })

  // 从用户的 family_ids 中移除该家庭 ID
  const userHash = hashOpenId(openid)
  await db.collection('users').where({ openid_hash: userHash }).update({
    data: { family_ids: _.pull(family_id) }
  })

  return success()
}

/**
 * 修改成员角色
 * 仅 Owner 可在 member 和 restricted 之间修改成员角色
 */
async function changeRole(event, openid) {
  const { family_id, target_user_id, new_role } = event
  if (!family_id || !target_user_id || !new_role) {
    return fail('缺少必要参数')
  }

  // 验证 new_role 合法性
  if (new_role !== 'member' && new_role !== 'restricted') {
    return fail('无效的角色，仅支持 member 或 restricted')
  }

  // 不能修改自己的角色
  if (target_user_id === openid) {
    return fail('不能修改自己的角色')
  }

  // 检查操作者是否为 Owner
  const operator = await checkMembership(db, openid, family_id)
  if (!operator || operator.role !== 'owner') {
    return fail('仅 Owner 可修改成员角色')
  }

  // 检查目标用户是否为该家庭成员
  const target = await checkMembership(db, target_user_id, family_id)
  if (!target) {
    return fail('目标用户不是该家庭成员')
  }

  // 更新角色
  await db.collection('family_members').doc(target._id).update({
    data: { role: new_role }
  })

  return success({ new_role })
}

/**
 * 获取家庭成员列表
 * 需要家庭成员身份，返回成员列表及用户信息
 */
async function list(event, openid) {
  const { family_id } = event
  if (!family_id) {
    return fail('缺少必要参数')
  }

  // 检查调用者是否为家庭成员
  const caller = await checkMembership(db, openid, family_id)
  if (!caller) {
    return fail('您不是该家庭成员')
  }

  // 获取该家庭所有成员
  const membersRes = await db.collection('family_members')
    .where({ family_id: family_id })
    .get()

  const members = membersRes.data
  if (members.length === 0) {
    return success([])
  }

  // 收集所有 user_id，转为 hash 批量查询用户信息
  const userIds = members.map(m => m.user_id)
  const userHashes = userIds.map(uid => hashOpenId(uid))
  const usersRes = await db.collection('users')
    .where({ openid_hash: _.in(userHashes) })
    .field({ openid_hash: true, nickname: true, avatar_url: true })
    .get()

  // 构建 openid_hash -> user 映射
  const userMap = {}
  usersRes.data.forEach(u => {
    userMap[u.openid_hash] = { nickname: u.nickname, avatar_url: u.avatar_url }
  })

  // 合并成员信息和用户信息
  const result = members.map(m => {
    const mHash = hashOpenId(m.user_id)
    return {
      _id: m._id,
      user_id: m.user_id,
      openid_hash: mHash,
      role: m.role,
      created_at: m.created_at,
      nickname: userMap[mHash] ? userMap[mHash].nickname : '',
      avatar_url: userMap[mHash] ? userMap[mHash].avatar_url : ''
    }
  })

  return success(result)
}
