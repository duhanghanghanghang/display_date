/**
 * 虚拟试衣 - 按顺序垂直拼接
 * 外套 → 上衣 → 裤子 → 鞋子，每件等分高度，统一尺寸
 */

// 绘制顺序：数字越小越靠上
const LAYER_ORDER = {
  外套: 0, 大衣: 0,
  上衣: 1, T恤: 1, 衬衫: 1,
  裤子: 2, 短裤: 2,
  鞋子: 3, 鞋: 3
}

function getOrder(categoryName) {
  if (!categoryName) return 2
  const name = String(categoryName).trim()
  for (const [key, order] of Object.entries(LAYER_ORDER)) {
    if (name.includes(key)) return order
  }
  return 2
}

function sortByLayer(itemsWithCategory) {
  return [...itemsWithCategory].sort((a, b) => getOrder(a.categoryName) - getOrder(b.categoryName))
}

/**
 * 垂直拼接：每件衣服等分高度，按顺序从上到下排列
 */
async function compositeVirtualTryon(canvas, ctx, width, height, _personTemplateUrl, items) {
  if (!canvas || !ctx || !width || !height || !items?.length) return

  const sorted = sortByLayer(items).filter(p => p.item?.imageUrl && !p.item?._imgFailed)
  if (sorted.length === 0) return

  const gap = 2
  const totalGap = gap * (sorted.length - 1)
  const slotHeight = (height - totalGap) / sorted.length

  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < sorted.length; i++) {
    const url = sorted[i].item?.imageUrl
    if (!url) continue
    const dy = i * (slotHeight + gap)
    await drawImageCover(canvas, ctx, url, 0, dy, width, slotHeight)
  }
}

/** 以 cover 模式绘制：等比缩放填满区域，居中裁剪 */
function drawImageCover(canvas, ctx, url, dx, dy, dw, dh) {
  return new Promise((resolve) => {
    if (!url) {
      resolve()
      return
    }
    const img = canvas.createImage ? canvas.createImage() : null
    if (!img) {
      resolve()
      return
    }
    img.onload = () => {
      try {
        const iw = img.width
        const ih = img.height
        if (!iw || !ih) {
          resolve()
          return
        }
        const scale = Math.max(dw / iw, dh / ih)
        const sw = dw / scale
        const sh = dh / scale
        const sx = (iw - sw) / 2
        const sy = (ih - sh) / 2
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
      } catch (_) {}
      resolve()
    }
    img.onerror = () => resolve()
    img.src = url
  })
}

module.exports = {
  getOrder,
  sortByLayer,
  compositeVirtualTryon,
  PERSON_TEMPLATE_PATH: '' // 不再使用人物模板
}
