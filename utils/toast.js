/**
 * 统一Toast提示工具
 * 全局配置统一管理所有提示时长
 * 用户反馈：之前时长太短，统一延长到至少1.5秒
 */

const ToastDuration = {
  QUICK: 1500,    // 快速反馈（1.5秒）- 简单操作、切换
  SHORT: 1500,    // 短时间（1.5秒）- 成功提示、保存
  MEDIUM: 2000,   // 中等时间（2秒）- 信息提示、警告
  LONG: 2000      // 长时间（2秒）- 错误提示
}

class Toast {
  /**
   * 快速反馈 - 简单操作完成
   * 适用场景：复制、切换、简单设置
   * @param {string} title 
   */
  static quick(title) {
    wx.showToast({
      title,
      icon: 'success',
      duration: ToastDuration.QUICK,
      mask: false
    })
  }

  /**
   * 成功提示 - 重要操作成功
   * 适用场景：创建、保存、更新、删除成功
   * @param {string} title 
   */
  static success(title) {
    wx.showToast({
      title,
      icon: 'success',
      duration: ToastDuration.SHORT,
      mask: false
    })
  }

  /**
   * 错误提示
   * 适用场景：操作失败、网络错误
   * @param {string} title 
   */
  static error(title) {
    wx.showToast({
      title,
      icon: 'error',
      duration: ToastDuration.LONG,
      mask: false
    })
  }

  /**
   * 警告提示
   * 适用场景：权限不足、参数错误、状态异常
   * @param {string} title 
   */
  static warning(title) {
    wx.showToast({
      title,
      icon: 'none',
      duration: ToastDuration.LONG,
      mask: false
    })
  }

  /**
   * 信息提示
   * 适用场景：一般信息展示、状态说明
   * @param {string} title 
   */
  static info(title) {
    wx.showToast({
      title,
      icon: 'none',
      duration: ToastDuration.MEDIUM,
      mask: false
    })
  }

  /**
   * 加载提示
   * @param {string} title 
   * @param {boolean} mask 是否显示透明蒙层
   */
  static loading(title = '加载中...', mask = true) {
    wx.showLoading({
      title,
      mask
    })
  }

  /**
   * 隐藏Loading
   */
  static hide() {
    wx.hideLoading()
  }

  /**
   * 自定义时长的提示
   * @param {string} title 
   * @param {string} icon success/error/loading/none
   * @param {number} duration 停留时间（毫秒）
   */
  static custom(title, icon = 'none', duration = 2000) {
    wx.showToast({
      title,
      icon,
      duration,
      mask: false
    })
  }
}

module.exports = { Toast, ToastDuration }
