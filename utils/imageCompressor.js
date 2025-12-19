/**
 * 图片压缩工具
 * 在上传前压缩图片，减少流量消耗
 */

class ImageCompressor {
  /**
   * 压缩图片（使用微信API）
   * @param {string} filePath 临时文件路径
   * @param {object} options 压缩选项
   * @returns {Promise<string>} 压缩后的临时文件路径
   */
  static async compress(filePath, options = {}) {
    const {
      quality = 80,        // 质量 (0-100)
      maxWidth = 1200,     // 最大宽度
      maxHeight = 1200,    // 最大高度
    } = options

    try {
      // 获取图片信息
      const info = await this.getImageInfo(filePath)
      
      // 如果图片尺寸已经很小，直接返回
      if (info.width <= maxWidth && info.height <= maxHeight && quality >= 90) {
        console.log('图片无需压缩')
        return filePath
      }

      // 计算压缩后的尺寸
      const { width, height } = this.calculateSize(
        info.width,
        info.height,
        maxWidth,
        maxHeight
      )

      console.log(`压缩图片: ${info.width}x${info.height} → ${width}x${height}`)

      // 使用微信API压缩
      const compressed = await this.compressWithWxAPI(filePath, quality)

      return compressed
    } catch (error) {
      console.error('压缩图片失败:', error)
      // 压缩失败则返回原图
      return filePath
    }
  }

  /**
   * 获取图片信息
   */
  static getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: resolve,
        fail: reject
      })
    })
  }

  /**
   * 计算压缩后的尺寸（保持宽高比）
   */
  static calculateSize(width, height, maxWidth, maxHeight) {
    let newWidth = width
    let newHeight = height

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      newWidth = Math.round(width * ratio)
      newHeight = Math.round(height * ratio)
    }

    return { width: newWidth, height: newHeight }
  }

  /**
   * 使用微信API压缩图片
   */
  static compressWithWxAPI(src, quality) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src,
        quality,
        success: (res) => {
          console.log('压缩成功:', res.tempFilePath)
          resolve(res.tempFilePath)
        },
        fail: (err) => {
          console.warn('微信压缩失败，使用原图:', err)
          // 压缩失败返回原图
          resolve(src)
        }
      })
    })
  }

  /**
   * 批量压缩
   */
  static async compressMultiple(filePaths, options = {}) {
    const promises = filePaths.map(path => this.compress(path, options))
    return Promise.all(promises)
  }

  /**
   * 获取图片大小（字节）
   */
  static async getFileSize(filePath) {
    try {
      const fs = wx.getFileSystemManager()
      const stats = fs.statSync(filePath)
      return stats.size
    } catch (error) {
      console.error('获取文件大小失败:', error)
      return 0
    }
  }
}

module.exports = { ImageCompressor }
