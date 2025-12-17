// 一键清理脚本
// 在小程序开发者工具的控制台（Console）中运行此脚本

(function() {
  console.log('=== 开始清理旧数据 ===')
  
  // 清理旧的 token
  const oldToken = wx.getStorageSync('token')
  if (oldToken) {
    wx.removeStorageSync('token')
    console.log('✓ 已删除旧的 token')
  } else {
    console.log('- 没有找到旧的 token')
  }
  
  // 检查 openid
  const openid = wx.getStorageSync('openid')
  if (openid) {
    console.log('✓ openid 存在:', openid)
  } else {
    console.log('! 警告: openid 不存在，需要重新登录')
  }
  
  // 列出所有缓存
  console.log('\n当前所有缓存:')
  wx.getStorageInfo({
    success: (res) => {
      console.log('缓存键:', res.keys)
      console.log('当前缓存大小:', res.currentSize, 'KB')
    }
  })
  
  console.log('\n=== 清理完成 ===')
  console.log('建议: 重新启动小程序以应用更改')
})()

