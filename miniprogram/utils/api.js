/**
 * HTTP API 调用封装
 * 替代原有的 wx.cloud.callFunction，保持 callFunction(name, data) 接口不变
 */

const config = require('./config')

// ── 路由映射：name/action → { method, path } ──
// path 中的 :xxx 会从 data 中取值替换

const ROUTE_MAP = {
  // User
  'user/login':         { method: 'POST', path: '/api/v1/user/login' },
  'user/updateProfile': { method: 'PUT',  path: '/api/v1/user/profile' },

  // Family
  'family/create':             { method: 'POST',   path: '/api/v1/family' },
  'family/getDetail':          { method: 'GET',    path: '/api/v1/family/:family_id' },
  'family/delete':             { method: 'DELETE', path: '/api/v1/family/:family_id' },
  'family/generateInviteCode': { method: 'POST',   path: '/api/v1/family/:family_id/invite-code' },
  'family/generateShareLink':  { method: 'POST',   path: '/api/v1/family/:family_id/share-link' },
  'family/getByShareCode':     { method: 'GET',    path: '/api/v1/family/share/:share_code' },

  // Person
  'person/create':    { method: 'POST',   path: '/api/v1/person' },
  'person/update':    { method: 'PUT',    path: '/api/v1/person/:person_id' },
  'person/delete':    { method: 'DELETE', path: '/api/v1/person/:person_id', query: ['family_id'] },
  'person/getDetail': { method: 'GET',    path: '/api/v1/person/:person_id', query: ['family_id'] },
  'person/list':      { method: 'GET',    path: '/api/v1/person', query: ['family_id'] },

  // Relationship
  'relationship/create':       { method: 'POST',   path: '/api/v1/relationship' },
  'relationship/delete':       { method: 'DELETE', path: '/api/v1/relationship/:relationship_id', query: ['family_id'] },
  'relationship/computeTitle': { method: 'GET',    path: '/api/v1/relationship/title', query: ['family_id', 'from_person_id', 'to_person_id'] },
  'relationship/getGraph':     { method: 'GET',    path: '/api/v1/relationship/graph', query: ['family_id'] },

  // Photo
  'photo/upload': { method: 'POST',   path: '/api/v1/photo/upload' },
  'photo/delete': { method: 'DELETE', path: '/api/v1/photo/:photo_id' },
  'photo/list':   { method: 'GET',    path: '/api/v1/photo', query: ['family_id', 'person_id', 'page'] },
  'photo/detail': { method: 'GET',    path: '/api/v1/photo/:photo_id' },
  'photo/addTag':    { method: 'POST',   path: '/api/v1/photo/:photo_id/tag' },
  'photo/removeTag': { method: 'DELETE', path: '/api/v1/photo/tag/:tag_id' },

  // Member
  'member/applyJoin':         { method: 'POST', path: '/api/v1/member/join' },
  'member/reviewJoin':        { method: 'POST', path: '/api/v1/member/review' },
  'member/validateInvite':    { method: 'GET',  path: '/api/v1/member/validate-invite', query: ['code'] },
  'member/listJoinRequests':  { method: 'GET',  path: '/api/v1/member/requests', query: ['family_id'] },
  'member/leave':             { method: 'POST', path: '/api/v1/member/leave' },
  'member/changeRole':        { method: 'PUT',  path: '/api/v1/member/:member_id/role' },
  'member/list':              { method: 'GET',  path: '/api/v1/member', query: ['family_id'] },
  'member/getSelf':           { method: 'GET',  path: '/api/v1/member/self', query: ['family_id'] },
  'member/updateTitleMap':    { method: 'PUT',  path: '/api/v1/member/:member_id/title-map' },

  // History
  'history/list':     { method: 'GET',  path: '/api/v1/history', query: ['family_id', 'page', 'page_size'] },
  'history/rollback': { method: 'POST', path: '/api/v1/history/:history_id/rollback' },

  // Note
  'note/upsert': { method: 'PUT', path: '/api/v1/note' },
  'note/get':    { method: 'GET', path: '/api/v1/note', query: ['family_id', 'person_id'] },

  // Titlemap
  'titlemap/create': { method: 'POST',   path: '/api/v1/titlemap' },
  'titlemap/update': { method: 'PUT',    path: '/api/v1/titlemap/:title_map_id' },
  'titlemap/delete': { method: 'DELETE', path: '/api/v1/titlemap/:title_map_id' },
  'titlemap/get':    { method: 'GET',    path: '/api/v1/titlemap/:title_map_id' },
  'titlemap/list':   { method: 'GET',    path: '/api/v1/titlemap', query: ['family_id'] },

  // Admin
  'admin/setStorageUnlimited': { method: 'POST', path: '/api/v1/admin/set-storage-unlimited' },
  'admin/cleanup':             { method: 'POST', path: '/api/v1/admin/cleanup' }
}

/**
 * 获取存储的 JWT token
 */
function getToken() {
  try {
    return wx.getStorageSync('familygraph_token') || ''
  } catch (e) {
    return ''
  }
}

/**
 * 存储 JWT token
 */
function setToken(token) {
  try {
    wx.setStorageSync('familygraph_token', token)
  } catch (e) {
    console.error('存储 token 失败', e)
  }
}

/**
 * 清除 JWT token
 */
function clearToken() {
  try {
    wx.removeStorageSync('familygraph_token')
  } catch (e) {
    // ignore
  }
}

/**
 * 构建请求 URL，替换路径参数并拼接查询参数
 */
function buildURL(route, data) {
  var path = route.path
  var remainingData = {}

  // Copy data to avoid mutating the original
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      remainingData[key] = data[key]
    }
  }

  // Replace path params (:xxx)
  path = path.replace(/:([a-z_]+)/g, function (match, paramName) {
    var value = remainingData[paramName]
    if (value !== undefined && value !== null) {
      delete remainingData[paramName]
      return encodeURIComponent(value)
    }
    return match
  })

  var url = config.BASE_URL + path

  // For GET/DELETE: add query params
  if (route.method === 'GET' || route.method === 'DELETE') {
    var queryKeys = route.query || []
    var queryParts = []
    // Use declared query keys first
    for (var i = 0; i < queryKeys.length; i++) {
      var qk = queryKeys[i]
      if (remainingData[qk] !== undefined && remainingData[qk] !== null) {
        queryParts.push(encodeURIComponent(qk) + '=' + encodeURIComponent(remainingData[qk]))
        delete remainingData[qk]
      }
    }
    // Also add any remaining data as query params for GET requests
    if (route.method === 'GET') {
      for (var rk in remainingData) {
        if (remainingData.hasOwnProperty(rk) && remainingData[rk] !== undefined && remainingData[rk] !== null) {
          queryParts.push(encodeURIComponent(rk) + '=' + encodeURIComponent(remainingData[rk]))
        }
      }
    }
    if (queryParts.length > 0) {
      url += '?' + queryParts.join('&')
    }
  }

  return { url: url, bodyData: remainingData }
}

/**
 * 调用 API
 * @param {string} name - 路由名，格式: "domain/action" (e.g., "user/login")
 * @param {object} data - 请求参数
 * @returns {Promise<object>} 响应 data 字段
 */
function callFunction(name, data) {
  data = data || {}
  var route = ROUTE_MAP[name]
  if (!route) {
    return Promise.reject(new Error('未知的 API 路由: ' + name))
  }

  var result = buildURL(route, data)
  var url = result.url
  var bodyData = result.bodyData

  var header = { 'Content-Type': 'application/json' }
  var token = getToken()
  if (token) {
    header['Authorization'] = 'Bearer ' + token
  }

  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      method: route.method,
      data: (route.method === 'GET' || route.method === 'DELETE') ? undefined : bodyData,
      header: header,
      success: function (res) {
        if (res.statusCode === 401) {
          clearToken()
          var err = new Error('登录已过期，请重新登录')
          err.code = -1
          reject(err)
          return
        }

        var body = res.data
        if (body && body.code === 0) {
          resolve(body.data)
        } else if (body) {
          var err = new Error(body.message || '请求失败')
          err.code = body.code
          reject(err)
        } else {
          reject(new Error('服务器返回为空'))
        }
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '网络错误'))
      }
    })
  })
}

/**
 * 显示加载提示并调用 API
 */
function callWithLoading(name, data, loadingText) {
  loadingText = loadingText || '加载中...'
  wx.showLoading({ title: loadingText, mask: true })
  return callFunction(name, data).finally(function () {
    wx.hideLoading()
  })
}

/**
 * 上传文件到服务器
 * @param {string} url - 上传目标完整路径 (e.g., "/api/v1/photo/upload")
 * @param {string} filePath - 本地文件路径
 * @param {object} formData - 附加表单数据
 * @returns {Promise<object>} 响应 data 字段
 */
function uploadFile(url, filePath, formData) {
  var header = {}
  var token = getToken()
  if (token) {
    header['Authorization'] = 'Bearer ' + token
  }

  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: config.BASE_URL + url,
      filePath: filePath,
      name: 'file',
      formData: formData || {},
      header: header,
      success: function (res) {
        try {
          var body = JSON.parse(res.data)
          if (body && body.code === 0) {
            resolve(body.data)
          } else {
            var err = new Error((body && body.message) || '上传失败')
            err.code = body ? body.code : -1
            reject(err)
          }
        } catch (e) {
          reject(new Error('解析上传响应失败'))
        }
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '上传网络错误'))
      }
    })
  })
}

/**
 * 显示错误提示
 */
function showError(err) {
  var message = typeof err === 'string' ? err : (err.message || '操作失败')
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
  callFunction: callFunction,
  callWithLoading: callWithLoading,
  uploadFile: uploadFile,
  showError: showError,
  showSuccess: showSuccess,
  getToken: getToken,
  setToken: setToken,
  clearToken: clearToken
}
