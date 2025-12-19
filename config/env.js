// 环境配置集中管理
// 使用方式：
// 1）在微信开发者工具「本地设置」里（或真机）通过 wx.setStorageSync('env', 'local') 切换；
// 2）默认根据微信环境：开发版 -> local，体验版 -> dev，正式版 -> prod。
// 3）修改下方 BASE_URL 为你本地后端地址即可。

const ENV_MAP = {
  local: {
    BASE_URL: 'https://dhlhy.cn' // 本地/局域网后端
  },
  dev: {
    BASE_URL: 'https://dhlhy.cn' // 示例：开发/测试环境
  },
  prod: {
    BASE_URL: 'https://dhlhy.cn' // 生产环境
  }
}

function getEnvFromStorage() {
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      const v = wx.getStorageSync('env')
      if (v && ENV_MAP[v]) return v
    }
  } catch (e) {
    console.warn('读取 env 失败，使用默认', e)
  }
  return null
}

function detectEnv() {
  // 优先本地存储
  const stored = getEnvFromStorage()
  if (stored) return stored

  // 根据小程序运行环境判断
  try {
    if (typeof wx !== 'undefined' && wx.getAccountInfoSync) {
      const info = wx.getAccountInfoSync()
      const envVersion = info?.miniProgram?.envVersion
      if (envVersion === 'develop') return 'local'
      if (envVersion === 'trial') return 'dev'
      return 'prod'
    }
  } catch (e) {
    console.warn('检测运行环境失败，回退 local', e)
  }
  return 'local'
}

const ENV = detectEnv()
const CONFIG = ENV_MAP[ENV] || ENV_MAP.local

module.exports = {
  ENV,
  ...CONFIG,
  ENV_MAP
}


