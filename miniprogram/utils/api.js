/**
 * 云函数调用封装
 */

/**
 * 调用云函数
 * @param {string} name - 云函数名，格式: "domain/action" (e.g., "user/login")
 * @param {object} data - 请求参数
 * @returns {Promise<object>} 响应数据
 */
function callFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: name.split('/')[0],
      data: {
        action: name.split('/')[1],
        ...data
      },
      success(res) {
        if (res.result && res.result.code === 0) {
          resolve(res.result.data)
        } else if (res.result) {
          const err = new Error(res.result.message || '请求失败')
          err.code = res.result.code
          reject(err)
        } else {
          reject(new Error('云函数返回为空'))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'))
      }
    })
  })
}

/**
 * 显示加载提示并调用云函数
 */
function callWithLoading(name, data = {}, loadingText = '加载中...') {
  wx.showLoading({ title: loadingText, mask: true })
  return callFunction(name, data).finally(() => {
    wx.hideLoading()
  })
}

/**
 * 显示错误提示
 */
function showError(err) {
  const message = typeof err === 'string' ? err : (err.message || '操作失败')
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  })
}

/**
 * 显示成功提示
 */
function showSuccess(message) {
  wx.showToast({
    title: message,
    icon: 'success',
    duration: 1500
  })
}

module.exports = {
  callFunction,
  callWithLoading,
  showError,
  showSuccess
}
