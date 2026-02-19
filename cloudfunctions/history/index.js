/**
 * 编辑历史云函数 —— 查看与回滚编辑记录
 *
 * actions:
 *   list     — 列出家庭编辑历史（仅 owner）
 *   rollback — 将成员共享字段回滚到历史快照（仅 owner）
 */

const cloud = require('wx-server-sdk')
const { success, fail, checkMembership, hasPermission } = require('../utils/helpers')
const { SHARED_FIELDS, ROLES } = require('../utils/constants')

cloud.init({ env: process.env.CLOUD_ENV || null })
const db = cloud.database()
const _ = db.command

// ---------------------------------------------------------------------------
// action: list
// ---------------------------------------------------------------------------
async function handleList(openid, { family_id, page = 0, page_size = 20 }) {
  if (!family_id) {
    return fail('缺少参数 family_id')
  }

  // 权限检查：仅 owner
  const member = await checkMembership(db, openid, family_id)
  if (!member) {
    return fail('你不是该家庭的成员', -2)
  }
  if (!hasPermission(member.role, ROLES.OWNER)) {
    return fail('仅家庭创建者可查看编辑历史', -3)
  }

  const skip = page * page_size

  const { data: records } = await db.collection('edit_history')
    .where({ family_id })
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(page_size)
    .get()

  // 获取总数以便客户端分页
  const { total } = await db.collection('edit_history')
    .where({ family_id })
    .count()

  return success({ records, total, page, page_size })
}

// ---------------------------------------------------------------------------
// action: rollback
// ---------------------------------------------------------------------------
async function handleRollback(openid, { history_id, family_id }) {
  if (!history_id || !family_id) {
    return fail('缺少参数 history_id 或 family_id')
  }

  // 权限检查：仅 owner
  const member = await checkMembership(db, openid, family_id)
  if (!member) {
    return fail('你不是该家庭的成员', -2)
  }
  if (!hasPermission(member.role, ROLES.OWNER)) {
    return fail('仅家庭创建者可执行回滚操作', -3)
  }

  // 获取原始历史记录
  const { data: historyRecord } = await db.collection('edit_history')
    .doc(history_id)
    .get()

  if (!historyRecord) {
    return fail('历史记录不存在', -4)
  }

  if (historyRecord.family_id !== family_id) {
    return fail('历史记录不属于该家庭', -5)
  }

  if (!historyRecord.snapshot_before) {
    return fail('该历史记录没有可回滚的快照', -6)
  }

  if (historyRecord.is_rolled_back) {
    return fail('该历史记录已被回滚', -7)
  }

  const personId = historyRecord.person_id

  // 获取当前的 person 记录
  const { data: currentPerson } = await db.collection('persons')
    .doc(personId)
    .get()

  if (!currentPerson) {
    return fail('关联的成员记录不存在', -8)
  }

  // 保存当前状态作为回滚记录的 snapshot_before
  const currentSnapshot = {}
  for (const field of SHARED_FIELDS) {
    if (currentPerson[field] !== undefined) {
      currentSnapshot[field] = currentPerson[field]
    }
  }

  // 用历史快照覆盖 person 的共享字段
  const restoreData = { updated_at: db.serverDate() }
  for (const field of SHARED_FIELDS) {
    if (historyRecord.snapshot_before[field] !== undefined) {
      restoreData[field] = historyRecord.snapshot_before[field]
    }
  }

  await db.collection('persons').doc(personId).update({ data: restoreData })

  // 创建新的回滚历史记录
  const now = db.serverDate()
  await db.collection('edit_history').add({
    data: {
      family_id,
      person_id: personId,
      user_id: openid,
      action: 'rollback',
      snapshot_before: currentSnapshot,
      snapshot_after: historyRecord.snapshot_before,
      rollback_from: history_id,
      created_at: now
    }
  })

  // 标记原始记录为已回滚
  await db.collection('edit_history').doc(history_id).update({
    data: { is_rolled_back: true }
  })

  return success({ person_id: personId, restored_fields: historyRecord.snapshot_before })
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
    case 'list':
      return handleList(OPENID, params)
    case 'rollback':
      return handleRollback(OPENID, params)
    default:
      return fail(`未知的 action: ${action}`)
  }
}
