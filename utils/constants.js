// 颜色预设（需求文档）
const COLORS = ['黑色', '白色', '灰色', '蓝色', '红色', '绿色', '黄色', '粉色', '棕色', '紫色', '橙色', '其他']

// 季节
const SEASONS = ['春', '夏', '秋', '冬', '四季']

// 筛选用（含「全部」）
const COLORS_FILTER = ['全部', ...COLORS]
const SEASONS_FILTER = ['全部', ...SEASONS]

/** 穿着标记，与后端 OFTEN/RARE/WISHLIST 一致 */
const WEAR_FLAGS = [
  { value: '', label: '全部' },
  { value: 'OFTEN', label: '常穿' },
  { value: 'RARE', label: '少穿' },
  { value: 'WISHLIST', label: '想买' }
]

const WEAR_FLAG_OPTIONS = [
  { value: '', label: '不标记' },
  { value: 'OFTEN', label: '常穿' },
  { value: 'RARE', label: '少穿' },
  { value: 'WISHLIST', label: '想买' }
]

module.exports = {
  COLORS,
  SEASONS,
  COLORS_FILTER,
  SEASONS_FILTER,
  WEAR_FLAGS,
  WEAR_FLAG_OPTIONS
}
