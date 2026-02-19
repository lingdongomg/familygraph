/**
 * 客户端登录状态管理
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
    const app = getApp()
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
    const app = getApp()
    if (app) {
      app.globalData.userInfo = null
      app.globalData.isLoggedIn = false
    }
  } catch (e) {
    console.error('清除用户信息失败', e)
  }
}

/**
 * 登录：调用云函数获取用户信息
 */
async function login() {
  try {
    const user = await api.callFunction('user/login')
    setUser(user)
    return user
  } catch (err) {
    console.error('登录失败', err)
    throw err
  }
}

/**
 * 确保已登录，未登录则自动登录
 */
async function ensureLogin() {
  let user = getUser()
  if (user) return user
  return await login()
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
  return !!getUser()
}

module.exports = {
  getUser,
  setUser,
  clearUser,
  login,
  ensureLogin,
  isLoggedIn
}
