# 图片保存问题调试指南 🔍

## 已添加的详细日志

为了精确定位问题，我在关键位置添加了调试日志：

### 1. 上传成功后
```javascript
✅ 图片URL: https://dhlhy.cn/uploads/products/202512/xxx.jpg
✅ setData完成，当前productImage: https://dhlhy.cn/uploads/products/202512/xxx.jpg
```

### 2. 点击保存时
```javascript
📝 开始保存，当前数据: {
  name: "商品名称",
  productImage: "https://dhlhy.cn/uploads/products/202512/xxx.jpg",  // ← 关键
  barcode: "6901234567890",
  expireDate: "2024-12-31"
}
```

### 3. 构建请求数据时
```javascript
📦 构建的payload: {
  name: "商品名称",
  category: "食品",
  expire_date: "2024-12-31",
  product_image: "https://dhlhy.cn/uploads/products/202512/xxx.jpg",  // ← 关键
  quantity: 1,
  teamId: null
}
🔍 payload.product_image: https://dhlhy.cn/uploads/products/202512/xxx.jpg
```

## 🧪 完整测试步骤

### 步骤1：清空缓存重新测试
```
1. 在微信开发者工具中：
   - 点击"清除缓存" → "清除数据缓存"
   - 重新编译项目
```

### 步骤2：测试上传和保存
```
1. 打开控制台（Console标签）
2. 进入"添加物品"页面
3. 点击"上传图片"，选择图片
4. 查看控制台输出：
   ✅ 图片URL: xxx
   ✅ setData完成，当前productImage: xxx
   
5. 填写商品名称（必填）
6. 选择过期日期（必填）
7. 点击"保存"按钮
8. 查看控制台输出：
   📝 开始保存，当前数据: {...}
   📦 构建的payload: {...}
   🔍 payload.product_image: xxx
```

### 步骤3：检查网络请求
```
1. 打开"Network"标签
2. 重复步骤2
3. 查看 POST /items 请求：
   - Request Payload 中是否有 product_image 字段
   - product_image 的值是否正确
```

### 步骤4：检查数据库
```sql
-- 查看最新的一条记录
SELECT id, name, product_image, created_at 
FROM items 
ORDER BY created_at DESC 
LIMIT 1;
```

## 🔍 可能的问题点

### 问题1：productImage 是空字符串
**症状**：
```javascript
📝 开始保存，当前数据: {
  productImage: ""  // ← 空！
}
```

**原因**：
- setData 没有成功
- 上传后点击保存前，productImage 被重置了

**排查**：
- 检查 ✅ setData完成 的日志，看productImage是否有值
- 检查是否有其他地方调用了 `this.setData({ productImage: '' })`

### 问题2：解构时没有读取到
**症状**：
```javascript
📝 开始保存，当前数据: {
  productImage: undefined  // ← undefined！
}
```

**原因**：
- this.data 中本来就没有 productImage
- Page data 初始化时漏了这个字段

**排查**：
```javascript
// 在 Page({ data: { ... } }) 中检查
data: {
  productImage: '',  // ← 必须有这个字段
  // ...
}
```

### 问题3：payload 构建错误
**症状**：
```javascript
📦 构建的payload: {
  product_image: ""  // ← 空！
}
```

**原因**：
- productImage 是空的
- `productImage || ''` 导致使用了默认值

### 问题4：后端没有保存
**症状**：
- 前端 payload 有值
- 但数据库中 product_image 是 NULL

**排查**：
- 检查后端日志
- 检查 schema 中 product_image 的别名映射

## 📋 信息收集清单

请提供以下信息：

### 1. 控制台完整日志
```
从"点击上传图片"到"保存成功"的所有日志，包括：
- 📤 上传响应
- ✅ 图片URL
- ✅ setData完成
- 📝 开始保存
- 📦 构建的payload
- 🔍 payload.product_image
```

### 2. Network 请求详情
```
POST /items 请求：
- Request Headers
- Request Payload (特别是 product_image 字段)
- Response
```

### 3. 数据库查询结果
```sql
SELECT * FROM items ORDER BY created_at DESC LIMIT 1;
```

## 🛠️ 快速验证命令

### 前端验证
```javascript
// 在控制台执行
getCurrentPages()[getCurrentPages().length - 1].data.productImage
// 应该输出图片URL
```

### 后端验证
```bash
# 查看后端日志
tail -f /srv/app/display_date_python/logs/app.log | grep -i "product_image\|POST /items"
```

### 数据库验证
```bash
# SSH到服务器
ssh root@110.41.133.203

# 查询数据库
mysql -u root -p
use display_date;
SELECT id, name, product_image FROM items ORDER BY created_at DESC LIMIT 3;
```

## ✅ 预期的正确流程

```
1. 上传图片
   ↓
   ✅ 图片URL: https://dhlhy.cn/uploads/products/202512/xxx.jpg
   ✅ setData完成，当前productImage: https://dhlhy.cn/uploads/products/202512/xxx.jpg

2. 填写信息并保存
   ↓
   📝 开始保存，当前数据: { productImage: "https://..." }
   📦 构建的payload: { product_image: "https://..." }
   
3. 发送请求
   ↓
   POST /items
   Request: { ..., product_image: "https://..." }
   Response: { code: 200, message: "上传成功" }
   
4. 数据库保存
   ↓
   product_image: "https://dhlhy.cn/uploads/products/202512/xxx.jpg"
```

## 🚨 如果还有问题

请截图提供：
1. 完整的 Console 日志（从上传到保存）
2. Network 中 product-image 和 items 两个请求的详情
3. 数据库查询结果

这样我可以精确定位问题在哪一步出错了！
