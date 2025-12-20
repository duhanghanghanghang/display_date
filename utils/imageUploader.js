/**
 * 图片上传通用工具类
 */
const app = getApp()
const { showToast } = require('./toast')

class ImageUploader {
  /**
   * 选择并上传图片
   * @param {Object} options 配置选项
   * @param {Number} options.count 图片数量，默认1
   * @param {Array} options.sizeType 图片压缩类型，默认['compressed']
   * @param {Array} options.sourceType 图片来源，默认['album', 'camera']
   * @returns {Promise<String>} 返回图片URL
   */
  static async chooseAndUpload(options = {}) {
    const {
      count = 1,
      sizeType = ['compressed'],
      sourceType = ['album', 'camera']
    } = options

    try {
      // 1. 选择图片
      const chooseRes = await wx.chooseImage({
        count,
        sizeType,
        sourceType
      })

      if (!chooseRes.tempFilePaths || chooseRes.tempFilePaths.length === 0) {
        throw new Error('未选择图片')
      }

      const tempFilePath = chooseRes.tempFilePaths[0]
      
      // 2. 显示上传进度
      wx.showLoading({ 
        title: '上传中...', 
        mask: true 
      })

      // 3. 上传到服务器
      const uploadRes = await this._uploadFile(tempFilePath)
      
      wx.hideLoading()

      // 4. 解析响应
      const data = JSON.parse(uploadRes.data)
      
      if (data.url) {
        console.log('✅ 图片上传成功:', data.url)
        showToast('上传成功', 'success')
        return data.url
      } else {
        throw new Error(data.message || '上传失败')
      }

    } catch (err) {
      wx.hideLoading()
      console.error('❌ 图片上传失败:', err)
      
      const errorMsg = err.errMsg || err.message || '上传失败'
      showToast(errorMsg, 'error')
      
      throw err
    }
  }

  /**
   * 上传文件到服务器（内部方法）
   * @private
   */
  static _uploadFile(filePath) {
    return new Promise((resolve, reject) => {
      const openid = wx.getStorageSync('openid')
      
      if (!openid) {
        reject(new Error('未登录，请先登录'))
        return
      }

      const baseURL = app.globalData.baseURL || ''
      if (!baseURL) {
        reject(new Error('API地址未配置'))
        return
      }

      console.log('📤 开始上传图片:', {
        url: `${baseURL}/upload/product-image`,
        filePath,
        openid: openid.substring(0, 8) + '...'
      })

      wx.uploadFile({
        url: `${baseURL}/upload/product-image`,
        filePath: filePath,
        name: 'file',
        header: {
          'X-OpenId': openid
        },
        success: (res) => {
          console.log('📥 上传响应:', {
            statusCode: res.statusCode,
            data: res.data
          })
          
          if (res.statusCode === 200) {
            resolve(res)
          } else {
            reject(new Error(`服务器错误: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          console.error('❌ 上传失败:', err)
          reject(err)
        }
      })
    })
  }

  /**
   * 预览图片
   * @param {String|Array} urls 图片URL（单个或数组）
   * @param {String} current 当前显示的图片URL
   */
  static preview(urls, current) {
    const urlArray = Array.isArray(urls) ? urls : [urls]
    const currentUrl = current || urlArray[0]

    wx.previewImage({
      urls: urlArray,
      current: currentUrl
    })
  }

  /**
   * 压缩图片（可选功能）
   * @param {String} src 图片路径
   * @param {Number} quality 压缩质量 0-100
   */
  static async compress(src, quality = 80) {
    try {
      const res = await wx.compressImage({
        src,
        quality
      })
      return res.tempFilePath
    } catch (err) {
      console.error('图片压缩失败:', err)
      return src // 压缩失败返回原图
    }
  }
}

module.exports = {
  ImageUploader
}
