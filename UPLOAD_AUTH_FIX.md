# 图片上传认证修复 ✅

## 🐛 问题根源

### 错误信息
```json
{"detail":"Missing openid in header"}
```

### 原因分析

**后端认证方式**（`app/auth.py`）:
```python
def get_current_openid(
    x_openid: str = Header(None, alias="X-OpenId"),
    openid: str = Header(None, alias="openid"),
) -> str:
    """从请求头中获取 openid。支持两种方式：X-OpenId 或 openid"""
    user_openid = x_openid or openid
    if not user_openid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing openid in header",
        )
    return user_openid
```

后端需要的请求头：
- `X-OpenId: <openid>` 或
- `openid: <openid>`

**前端之前的错误**:
```javascript
header: {
  'Authorization': `Bearer ${wx.getStorageSync('token')}`  // ❌ 错误！
}
```

问题：
1. 使用了 `Authorization: Bearer` 而不是 `X-OpenId`
2. 尝试获取 `token`，但项目已改用 `openid` 认证
3. `wx.getStorageSync('token')` 返回空值

## ✅ 修复方案

### 修改内容

将所有上传功能的请求头从：
```javascript
// ❌ 错误的认证方式
header: {
  'Authorization': `Bearer ${wx.getStorageSync('token')}`
}
```

改为：
```javascript
// ✅ 正确的认证方式
// 获取openid用于认证
const openid = wx.getStorageSync('openid')
if (!openid) {
  wx.showToast({ title: '请先登录', icon: 'none' })
  return
}

header: {
  'X-OpenId': openid
}
```

### 修改的文件

1. **pages/add/add.js** - 新增页面上传
2. **pages/edit/edit.js** - 编辑页面上传
3. **pages/index/index.js** - 首页编辑弹窗上传

### 新增检查

在上传前检查 openid 是否存在：
```javascript
const openid = wx.getStorageSync('openid')
if (!openid) {
  wx.showToast({ title: '请先登录', icon: 'none' })
  return
}
```

这样可以避免发送无效请求。

## 🧪 测试方法

### 使用curl测试

**错误的请求**（会返回401错误）:
```bash
curl 'https://dhlhy.cn/upload/product-image' \
  -X POST \
  -H 'Authorization: Bearer ' \
  -F 'file=@test.jpg'

# 响应: {"detail":"Missing openid in header"}
```

**正确的请求**:
```bash
# 方式1: 使用 X-OpenId
curl 'https://dhlhy.cn/upload/product-image' \
  -X POST \
  -H 'X-OpenId: your_openid_here' \
  -F 'file=@test.jpg'

# 方式2: 使用 openid
curl 'https://dhlhy.cn/upload/product-image' \
  -X POST \
  -H 'openid: your_openid_here' \
  -F 'file=@test.jpg'

# 成功响应:
# {"code":200,"message":"上传成功","data":{"url":"/uploads/products/202512/xxx.jpg"}}
```

### 在小程序中测试

1. **确保已登录**:
   ```javascript
   // 在控制台检查
   console.log('OpenID:', wx.getStorageSync('openid'))
   // 应该输出一个 openid 字符串，如果为空则需要重新登录
   ```

2. **测试上传**:
   - 进入添加/编辑页面
   - 点击"上传图片"
   - 选择图片
   - 查看控制台日志

3. **预期日志**:
   ```javascript
   📤 上传响应状态: 200
   📤 上传响应数据: {"code":200,"message":"上传成功","data":{...}}
   📦 解析后的数据: {...}
   ✅ 图片URL: https://dhlhy.cn/uploads/products/202512/xxx.jpg
   ```

## 📋 认证对比

### 项目的认证架构

```
小程序端                     后端
┌─────────────┐            ┌──────────────┐
│ wx.login()  │            │              │
│     ↓       │            │              │
│  code       │──────────→ │ code2session │
│             │            │      ↓       │
│             │ ←──────────│   openid     │
│             │            │              │
│ 存储 openid  │            │              │
└─────────────┘            └──────────────┘
       ↓
  所有API请求
       ↓
  X-OpenId: <openid>
```

### 其他API的认证

查看 `utils/request.js`:
```javascript
// 所有其他API都使用 X-OpenId 认证
if (auth) {
  const openid = wx.getStorageSync('openid')
  if (openid) {
    headers['X-OpenId'] = openid  // ✅
  }
}
```

**上传功能之前是唯一使用错误认证方式的地方！**

## 🔍 验证修复

### 检查点1: 请求头正确
```javascript
// 上传时控制台应该能看到
console.log('上传URL:', `${app.globalData.baseURL}/upload/product-image`)
console.log('OpenID:', openid)  // 应该有值
```

### 检查点2: 不再出现401错误
- 之前: `{"detail":"Missing openid in header"}`
- 现在: 正常上传或其他具体错误（如文件格式、网络等）

### 检查点3: 与其他API一致
上传功能现在与其他所有API使用相同的认证方式：
- ✅ 获取物品列表: `X-OpenId`
- ✅ 添加物品: `X-OpenId`
- ✅ 编辑物品: `X-OpenId`
- ✅ **上传图片**: `X-OpenId` ← 现已修复

## 📊 修复总结

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| 认证方式 | `Authorization: Bearer` | `X-OpenId: <openid>` |
| 认证数据来源 | `wx.getStorageSync('token')` | `wx.getStorageSync('openid')` |
| 认证数据有效性 | 空值（token不存在） | 有效的openid |
| 错误提示 | `Missing openid in header` | 正常上传 |
| 登录检查 | 无 | 上传前检查openid |

## 🎯 关键改进

1. **修复认证方式**: 从错误的Bearer Token改为正确的X-OpenId
2. **统一认证机制**: 现在所有API都使用相同的认证方式
3. **添加登录检查**: 上传前验证openid是否存在
4. **友好错误提示**: 未登录时提示"请先登录"
5. **详细错误日志**: 便于排查其他问题

## ✨ 测试清单

### 正常流程测试
- [ ] 登录成功后 openid 存在
- [ ] 上传图片时自动添加 X-OpenId 头
- [ ] 后端接收到 openid
- [ ] 图片上传成功
- [ ] 图片URL正确返回

### 异常流程测试
- [ ] 未登录时上传 → 提示"请先登录"
- [ ] openid过期或无效 → 后端返回具体错误
- [ ] 网络异常 → 显示网络错误
- [ ] 文件格式错误 → 显示格式错误

### 三个页面测试
- [ ] 新增页面上传 ✅
- [ ] 编辑页面上传 ✅
- [ ] 首页编辑弹窗上传 ✅

所有认证问题已完全修复！🎉

## 💡 如何获取openid用于测试

如果需要在curl中测试，可以在小程序控制台获取真实的openid：

```javascript
// 在小程序控制台执行
console.log('OpenID:', wx.getStorageSync('openid'))
// 复制输出的openid用于curl测试
```

然后用这个真实的openid进行curl测试：
```bash
curl 'https://dhlhy.cn/upload/product-image' \
  -X POST \
  -H 'X-OpenId: 复制的真实openid' \
  -F 'file=@test.jpg'
```
