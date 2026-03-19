// 颜色预设（需求文档）
const COLORS = ['黑色', '白色', '灰色', '蓝色', '红色', '绿色', '黄色', '粉色', '棕色', '紫色', '橙色', '其他']

// 季节
const SEASONS = ['春', '夏', '秋', '冬', '四季']

// 筛选用（含「全部」）
const COLORS_FILTER = ['全部', ...COLORS]
const SEASONS_FILTER = ['全部', ...SEASONS]

module.exports = {
  COLORS,
  SEASONS,
  COLORS_FILTER,
  SEASONS_FILTER
}
