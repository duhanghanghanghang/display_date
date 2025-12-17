const { BASE_URL } = require('./config')

function request({ url, method = 'GET', data = {}, auth = true }) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' }
    
    // 使用 openid 进行认证（不再使用 token）
    if (auth) {
      const openid = wx.getStorageSync('openid')
      if (openid) {
        headers['X-OpenId'] = openid
      }
    }
    
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: headers,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          console.error('request error', res)
          const errorMsg = res.data?.detail || res.data?.message || '请求失败'
          
          // 如果是认证错误，清除本地 openid 并重新登录
          if (res.statusCode === 401 || res.statusCode === 403) {
            wx.removeStorageSync('openid')
            wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
          } else {
            wx.showToast({ title: errorMsg, icon: 'none' })
          }
          
          reject(res)
        }
      },
      fail: (err) => {
        console.error('request fail', err)
        wx.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      }
    })
  })
}

module.exports = {
  request,
  BASE_URL
}

