// 图片裁剪页：3:4 比例，中心裁剪
const app = getApp()

const RATIO = 3 / 4
const OUT_W = 600
const OUT_H = 800

Page({
  data: {
    imagePath: ''
  },

  onLoad(options) {
    const path = options.path || app.globalData.pendingCropPath || ''
    if (!path) {
      wx.showToast({ title: '缺少图片', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ imagePath: path })
  },

  onImageError() {
    wx.showToast({ title: '图片加载失败', icon: 'none' })
  },

  onCancel() {
    const reject = app.globalData.wardrobeUploadReject
    if (reject) {
      app.globalData.wardrobeUploadResolve = null
      app.globalData.wardrobeUploadReject = null
      reject(new Error('已取消'))
    }
    wx.navigateBack()
  },

  async onConfirm() {
    const { imagePath } = this.data
    if (!imagePath) return

    wx.showLoading({ title: '处理中...', mask: true })
    let pathToUpload = imagePath
    try {
      const croppedPath = await this.cropImage(imagePath)
      pathToUpload = croppedPath
    } catch (err) {
      console.warn('客户端裁剪失败，将上传原图由服务端裁剪:', err)
      pathToUpload = imagePath
    }
    try {
      await this.uploadImage(pathToUpload)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '上传失败', icon: 'none' })
    }
  },

  cropImage(srcPath) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: srcPath,
        success: (info) => {
          const imgW = info.width
          const imgH = info.height
          const targetRatio = RATIO
          const currentRatio = imgW / imgH

          let sx, sy, sW, sH
          if (currentRatio > targetRatio) {
            sH = imgH
            sW = Math.floor(imgH * targetRatio)
            sx = Math.floor((imgW - sW) / 2)
            sy = 0
          } else {
            sW = imgW
            sH = Math.floor(imgW / targetRatio)
            sx = 0
            sy = Math.floor((imgH - sH) / 2)
          }

          const query = wx.createSelectorQuery().in(this)
          query.select('#cropCanvas')
            .fields({ node: true, size: true })
            .exec((res) => {
              if (!res || !res[0] || !res[0].node) {
                reject(new Error('Canvas 不可用'))
                return
              }
              const canvas = res[0].node
              const ctx = canvas.getContext('2d')
              canvas.width = OUT_W
              canvas.height = OUT_H

              const img = canvas.createImage()
              img.onload = () => {
                ctx.drawImage(img, sx, sy, sW, sH, 0, 0, OUT_W, OUT_H)
                wx.canvasToTempFilePath({
                  canvas,
                  x: 0,
                  y: 0,
                  width: OUT_W,
                  height: OUT_H,
                  destWidth: OUT_W,
                  destHeight: OUT_H,
                  fileType: 'jpg',
                  quality: 0.9,
                  success: (r) => resolve(r.tempFilePath),
                  fail: (e) => reject(new Error(e.errMsg || '导出失败'))
                }, this)
              }
              img.onerror = () => reject(new Error('图片加载失败'))
              img.src = srcPath
            })
        },
        fail: (e) => reject(new Error(e.errMsg || '获取图片信息失败'))
      })
    })
  },

  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      const openid = wx.getStorageSync('openid')
      const baseURL = app.globalData.baseURL
      if (!openid || !baseURL) {
        reject(new Error('未登录或配置错误'))
        return
      }

      wx.uploadFile({
        url: baseURL + '/upload/wardrobe-image',
        filePath,
        name: 'file',
        header: { 'X-OpenId': openid },
        success: (res) => {
          if (res.statusCode !== 200) {
            reject(new Error('上传失败'))
            return
          }
          let data
          try {
            data = JSON.parse(res.data)
          } catch {
            reject(new Error('响应解析失败'))
            return
          }
          if (data.code !== 200 || !data.data?.url) {
            reject(new Error(data.message || '上传失败'))
            return
          }
          wx.hideLoading()
          wx.showToast({ title: '上传成功', icon: 'success' })
          const url = data.data.url
          const resolveFn = app.globalData.wardrobeUploadResolve
          if (resolveFn) {
            app.globalData.wardrobeUploadResolve = null
            resolveFn(url)
          }
          wx.navigateBack()
          resolve(url)
        },
        fail: (e) => reject(new Error(e.errMsg || '上传失败'))
      })
    })
  }
})
