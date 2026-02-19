/**
 * 管理云函数 —— 开发者工具与定时清理任务
 *
 * actions:
 *   setStorageUnlimited — 设置家庭的无限存储标志（开发者工具）
 *   cleanup             — 定时清理过期数据（每日定时触发）
 */

const cloud = require('wx-server-sdk')
const { success, fail } = require('../utils/helpers')
const {
  EDIT_HISTORY_RETAIN_DAYS
} = require('../utils/constants')

cloud.init({ env: process.env.CLOUD_ENV || null })
const db = cloud.database()
const _ = db.command

// ---------------------------------------------------------------------------
// action: setStorageUnlimited
// ---------------------------------------------------------------------------
async function handleSetStorageUnlimited({ family_id, unlimited }) {
  if (!family_id) {
    return fail('缺少参数 family_id')
  }
  if (typeof unlimited !== 'boolean') {
    return fail('参数 unlimited 必须为布尔值')
  }

  try {
    await db.collection('families').doc(family_id).update({
      data: {
        storage_unlimited: unlimited,
        updated_at: db.serverDate()
      }
    })
  } catch (err) {
    return fail(`更新失败: ${err.message}`)
  }

  return success({ family_id, storage_unlimited: unlimited })
}

// ---------------------------------------------------------------------------
// action: cleanup
// ---------------------------------------------------------------------------
async function handleCleanup() {
  const now = new Date()
  const results = {
    expired_invite_codes: 0,
    expired_join_requests: 0,
    expired_share_links: 0,
    deleted_edit_history: 0
  }

  // -----------------------------------------------------------------------
  // 1. 过期邀请码：invite_code_expire < now AND invite_code_active = true
  // -----------------------------------------------------------------------
  let hasMore = true
  while (hasMore) {
    const { data } = await db.collection('families')
      .where({
        invite_code_active: true,
        invite_code_expire: _.lt(now)
      })
      .limit(20)
      .get()

    if (data.length === 0) {
      hasMore = false
      break
    }

    for (const family of data) {
      await db.collection('families').doc(family._id).update({
        data: { invite_code_active: false }
      })
      results.expired_invite_codes++
    }

    if (data.length < 20) {
      hasMore = false
    }
  }

  // -----------------------------------------------------------------------
  // 2. 过期加入请求：status = 'pending' AND expire_at < now
  // -----------------------------------------------------------------------
  hasMore = true
  while (hasMore) {
    const { data } = await db.collection('join_requests')
      .where({
        status: 'pending',
        expire_at: _.lt(now)
      })
      .limit(20)
      .get()

    if (data.length === 0) {
      hasMore = false
      break
    }

    for (const req of data) {
      await db.collection('join_requests').doc(req._id).update({
        data: { status: 'expired' }
      })
      results.expired_join_requests++
    }

    if (data.length < 20) {
      hasMore = false
    }
  }

  // -----------------------------------------------------------------------
  // 3. 过期分享链接：expire_at < now AND is_active = true
  // -----------------------------------------------------------------------
  hasMore = true
  while (hasMore) {
    const { data } = await db.collection('share_links')
      .where({
        is_active: true,
        expire_at: _.lt(now)
      })
      .limit(20)
      .get()

    if (data.length === 0) {
      hasMore = false
      break
    }

    for (const link of data) {
      await db.collection('share_links').doc(link._id).update({
        data: { is_active: false }
      })
      results.expired_share_links++
    }

    if (data.length < 20) {
      hasMore = false
    }
  }

  // -----------------------------------------------------------------------
  // 4. 删除旧编辑历史：created_at < 90 天前
  // -----------------------------------------------------------------------
  const cutoffDate = new Date(now.getTime() - EDIT_HISTORY_RETAIN_DAYS * 24 * 60 * 60 * 1000)

  hasMore = true
  while (hasMore) {
    const { data } = await db.collection('edit_history')
      .where({
        created_at: _.lt(cutoffDate)
      })
      .limit(20)
      .get()

    if (data.length === 0) {
      hasMore = false
      break
    }

    for (const record of data) {
      await db.collection('edit_history').doc(record._id).remove()
      results.deleted_edit_history++
    }

    if (data.length < 20) {
      hasMore = false
    }
  }

  return success(results)
}

// ---------------------------------------------------------------------------
// 入口 / 路由
// ---------------------------------------------------------------------------
exports.main = async (event, context) => {
  const { action, ...params } = event

  // 获取调用者 openid（部分 action 可能不需要，但统一获取）
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'setStorageUnlimited':
      return handleSetStorageUnlimited(params)
    case 'cleanup':
      return handleCleanup()
    default:
      return fail(`未知的 action: ${action}`)
  }
}
