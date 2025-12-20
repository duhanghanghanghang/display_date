/**
 * 图片上传通用工具类
 */
const app = getApp()

class ImageUploader {
  /**
   * 选择并上传图片
   * @param {Object} options 配置选项
   * @returns {Promise<String>} 返回图片URL
   */
  static async chooseAndUpload(options = {}) {
    const {
      count = 1,
      sizeType = ['compressed'],
      sourceType = ['album', 'camera']
    } = options

    let uploadSuccess = false
    let imageUrl = null

    try {
      // 1. 选择图片
      console.log('📸 [1/4] 开始选择图片...')
      const chooseRes = await wx.chooseImage({
        count,
        sizeType,
        sourceType
      })

      if (!chooseRes.tempFilePaths || chooseRes.tempFilePaths.length === 0) {
        throw new Error('未选择图片')
      }

      const tempFilePath = chooseRes.tempFilePaths[0]
      console.log('✅ [2/4] 图片选择成功:', tempFilePath)
      
      // 2. 显示上传进度
      wx.showLoading({ 
        title: '上传中...', 
        mask: true 
      })

      // 3. 上传到服务器
      console.log('📤 [3/4] 开始上传...')
      const uploadRes = await this._uploadFile(tempFilePath)
      
      // 4. 解析响应
      console.log('📥 [4/4] 解析响应...')
      let data
      try {
        data = JSON.parse(uploadRes.data)
        console.log('✅ 响应解析成功:', data)
      } catch (parseErr) {
        console.error('❌ JSON解析失败:', uploadRes.data)
        throw new Error('服务器响应格式错误')
      }
      
      // 5. 检查结果（后端返回格式：{code, message, data: {url, filename, size}}）
      if (data.code !== 200) {
        throw new Error(data.message || '上传失败')
      }

      if (!data.data || !data.data.url) {
        console.error('❌ 响应数据异常:', data)
        throw new Error('服务器未返回图片URL')
      }

      imageUrl = data.data.url  // ← 正确：取 data.data.url
      uploadSuccess = true
      console.log('✅ 上传成功! URL:', imageUrl)
      
      return imageUrl

    } catch (err) {
      console.error('❌ 上传失败:', err)
      
      // 构建错误消息
      let errorMsg = '上传失败'
      if (err.errMsg) {
        // 微信API错误
        if (err.errMsg.includes('cancel')) {
          errorMsg = '已取消'
        } else if (err.errMsg.includes('fail')) {
          errorMsg = '上传失败，请重试'
        } else {
          errorMsg = err.errMsg
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      
      // 显示错误（只在非取消时显示）
      if (!errorMsg.includes('取消')) {
        wx.showToast({
          title: errorMsg,
          icon: 'error',
          duration: 2000
        })
      }
      
      throw err

    } finally {
      // 确保关闭loading
      wx.hideLoading()
      
      // 显示成功提示（在finally确保一定执行）
      if (uploadSuccess && imageUrl) {
        setTimeout(() => {
          wx.showToast({
            title: '上传成功',
            icon: 'success',
            duration: 1500
          })
        }, 100)
      }
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
        reject(new Error('未登录'))
        return
      }

      const baseURL = app.globalData.baseURL
      if (!baseURL) {
        reject(new Error('API地址未配置'))
        return
      }

      const uploadUrl = `${baseURL}/upload/product-image`
      
      console.log('📤 上传请求:', {
        url: uploadUrl,
        filePath,
        openid: openid.substring(0, 10) + '***'
      })

      const uploadTask = wx.uploadFile({
        url: uploadUrl,
        filePath: filePath,
        name: 'file',
        header: {
          'X-OpenId': openid
        },
        timeout: 30000,
        success: (res) => {
          console.log('📥 上传响应:', {
            statusCode: res.statusCode,
            dataLength: res.data ? res.data.length : 0
          })
          
          if (res.statusCode === 200) {
            resolve(res)
          } else {
            reject(new Error(`服务器错误: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          console.error('❌ 上传请求失败:', err)
          reject(err)
        }
      })

      // 监听上传进度
      uploadTask.onProgressUpdate((res) => {
        console.log('上传进度:', res.progress + '%')
      })
    })
  }

  /**
   * 预览图片
   */
  static preview(urls, current) {
    const urlArray = Array.isArray(urls) ? urls : [urls]
    const currentUrl = current || urlArray[0]

    wx.previewImage({
      urls: urlArray,
      current: currentUrl
    })
  }
}

module.exports = {
  ImageUploader
}
