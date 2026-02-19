/**
 * 云函数公共辅助方法
 */

const cloud = require('wx-server-sdk')

/**
 * 获取当前调用者的 openid
 */
function getOpenId(context) {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID
}

/**
 * 成功响应
 */
function success(data = null) {
  return { code: 0, message: 'ok', data }
}

/**
 * 失败响应
 */
function fail(message, code = -1) {
  return { code, message, data: null }
}

/**
 * 检查用户在指定家庭中的角色
 * @returns {object|null} family_member 记录，或 null 表示不在家庭中
 */
async function checkMembership(db, openid, familyId) {
  const res = await db.collection('family_members')
    .where({ family_id: familyId, user_id: openid })
    .limit(1)
    .get()
  return res.data.length > 0 ? res.data[0] : null
}

/**
 * 检查是否有指定角色权限
 * @param {string} requiredRole - 'owner', 'member', 'restricted'
 * owner 权限 > member 权限 > restricted 权限
 */
function hasPermission(memberRole, requiredRole) {
  const roleOrder = { owner: 3, member: 2, restricted: 1 }
  return (roleOrder[memberRole] || 0) >= (roleOrder[requiredRole] || 0)
}

/**
 * 生成随机字母数字码
 */
function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除容易混淆的字符
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

module.exports = {
  getOpenId,
  success,
  fail,
  checkMembership,
  hasPermission,
  generateCode
}
