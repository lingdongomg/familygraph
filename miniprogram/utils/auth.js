/**
 * 客户端登录状态管理
 * 使用 wx.login() + JWT 替代 wx.cloud 隐式鉴权
 */

const api = require('./api')

const AUTH_KEY = 'familygraph_user'

/**
 * 获取缓存的用户信息
 */
function getUser() {
  try {
    return wx.getStorageSync(AUTH_KEY) || null
  } catch (e) {
    return null
  }
}

/**
 * 缓存用户信息
 */
function setUser(user) {
  try {
    wx.setStorageSync(AUTH_KEY, user)
    var app = getApp()
    if (app) {
      app.globalData.userInfo = user
      app.globalData.isLoggedIn = !!user
    }
  } catch (e) {
    console.error('缓存用户信息失败', e)
  }
}

/**
 * 清除用户信息
 */
function clearUser() {
  try {
    wx.removeStorageSync(AUTH_KEY)
    api.clearToken()
    var app = getApp()
    if (app) {
      app.globalData.userInfo = null
      app.globalData.isLoggedIn = false
    }
  } catch (e) {
    console.error('清除用户信息失败', e)
  }
}

/**
 * 登录：wx.login() 获取 code → POST /api/v1/user/login → 存储 JWT
 */
async function login() {
  try {
    // Step 1: 获取微信临时 code
    var loginRes = await new Promise(function (resolve, reject) {
      wx.login({
        success: resolve,
        fail: reject
      })
    })

    if (!loginRes.code) {
      throw new Error('wx.login 获取 code 失败')
    }

    // Step 2: 用 code 换取 JWT token
    var result = await api.callFunction('user/login', { code: loginRes.code })

    // Step 3: 存储 token
    if (result.token) {
      api.setToken(result.token)
    }

    // Step 4: 构造用户信息对象（兼容旧格式）
    var user = {
      user_id: result.user_id,
      nick_name: result.nick_name || '微信用户',
      nickname: result.nick_name || '微信用户',
      avatar_url: result.avatar_url || '',
      family_ids: result.family_ids || []
    }

    setUser(user)
    return user
  } catch (err) {
    console.error('登录失败', err)
    throw err
  }
}

/**
 * 确保已登录，未登录或 token 过期则自动登录
 */
async function ensureLogin() {
  var user = getUser()
  var token = api.getToken()
  if (user && token) return user
  return await login()
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
  return !!getUser() && !!api.getToken()
}

module.exports = {
  getUser: getUser,
  setUser: setUser,
  clearUser: clearUser,
  login: login,
  ensureLogin: ensureLogin,
  isLoggedIn: isLoggedIn
}
