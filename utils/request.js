const { BASE_URL } = require('./config')

function request({ url, method = 'GET', data = {}, auth = true }) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' }
    if (auth) {
      const token = wx.getStorageSync('token')
      if (token) headers['Authorization'] = `Bearer ${token}`
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
          wx.showToast({ title: res.data?.message || '请求失败', icon: 'none' })
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

