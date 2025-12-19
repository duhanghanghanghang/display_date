# 图片上传功能调试指南

## 📋 问题定位步骤

### 1. 查看控制台日志

现在所有上传操作都会输出详细日志：

```javascript
📤 上传响应状态: 200
📤 上传响应数据: {"code":200,"data":{"url":"/uploads/products/202512/xxx.jpg"}}
📦 解析后的数据: {code: 200, data: {...}}
✅ 图片URL: https://你的域名/uploads/products/202512/xxx.jpg
```

### 2. 常见错误及解决方案

#### ❌ 错误1: `上传失败(404)`
**原因**: 接口路径不存在
**检查**:
- 后端是否正常运行
- URL配置是否正确: `https://你的域名/upload/product-image`

**解决**:
```bash
# 检查后端服务状态
systemctl status display-date

# 查看后端日志
tail -f /srv/app/display_date_python/logs/app.log
```

#### ❌ 错误2: `上传失败(401)` 或 `Missing openid in header`
**原因**: 认证失败，openid缺失或无效
**检查**:
- openid是否存在
- 控制台输出: `'X-OpenId': 'xxx'`

**解决**:
```javascript
// 在小程序控制台检查
console.log('OpenID:', wx.getStorageSync('openid'))

// 如果openid为空，需要重新登录
// 1. 关闭小程序重新打开
// 2. 或手动清除缓存后重新登录
wx.removeStorageSync('openid')
```

#### ❌ 错误3: `上传失败(413)`
**原因**: 文件过大
**限制**: 最大 10MB

**解决**: 选择更小的图片

#### ❌ 错误4: `上传失败(500)`
**原因**: 服务器内部错误
**检查**: 查看服务器日志

#### ❌ 错误5: `不支持的文件格式`
**支持格式**: jpg, jpeg, png, webp
**解决**: 选择支持的图片格式

#### ❌ 错误6: `网络请求失败`
**原因**: 
- 网络连接问题
- 域名配置错误
- 服务器未响应

**检查**:
1. 小程序后台是否配置了服务器域名
2. HTTPS证书是否有效
3. 网络是否正常

### 3. 接口信息

**后端接口**: `/upload/product-image`
**完整URL**: `https://你的域名/upload/product-image`
**请求方法**: POST
**Content-Type**: multipart/form-data
**字段名**: file

**请求头**:
```
Authorization: Bearer <token>
```

**成功响应**:
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "/uploads/products/202512/xxxxx.jpg",
    "filename": "xxxxx.jpg",
    "size": 45678
  }
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "不支持的文件格式，仅支持: .jpg, .jpeg, .png, .webp"
}
```

### 4. 调试步骤

#### 步骤1: 打开小程序调试器
1. 在微信开发者工具中打开项目
2. 点击"调试器"选项卡
3. 选择"Console"标签

#### 步骤2: 测试上传
1. 进入添加/编辑页面
2. 点击"上传图片"
3. 选择一张图片
4. 观察控制台输出

#### 步骤3: 检查输出日志
如果看到 `❌` 符号，表示出错了，查看具体错误信息：

```javascript
// 正常流程
📤 上传响应状态: 200
📤 上传响应数据: {...}
📦 解析后的数据: {...}
✅ 图片URL: xxx

// 异常流程
❌ 上传失败，HTTP状态码: 500
或
❌ 业务错误: 不支持的文件格式 code: 400
或
❌ 上传请求失败: {errMsg: "request:fail"}
```

#### 步骤4: 根据错误信息排查

| 日志输出 | 问题 | 解决方案 |
|---------|------|---------|
| `HTTP状态码: 401` | 未登录或token过期 | 重新登录 |
| `HTTP状态码: 404` | 接口不存在 | 检查后端服务 |
| `HTTP状态码: 500` | 服务器错误 | 查看后端日志 |
| `业务错误: xxx` | 业务逻辑错误 | 按提示修正 |
| `解析响应失败` | 响应格式错误 | 检查后端返回数据 |
| `网络请求失败` | 网络问题 | 检查网络和域名配置 |

### 5. 服务器端检查

#### 检查1: uploads目录权限
```bash
# 确保uploads目录存在且可写
ls -la /srv/app/display_date_python/uploads/products
chmod 755 /srv/app/display_date_python/uploads
chmod 755 /srv/app/display_date_python/uploads/products
```

#### 检查2: Nginx静态文件配置
```nginx
# 确保Nginx配置了静态文件服务
location /uploads/ {
    alias /srv/app/display_date_python/uploads/;
}
```

#### 检查3: 后端日志
```bash
# 实时查看日志
tail -f /srv/app/display_date_python/logs/app.log | grep -i upload

# 查看最近的上传记录
grep "图片上传" /srv/app/display_date_python/logs/app.log | tail -20
```

### 6. 测试接口

使用curl测试接口是否正常：

```bash
# 测试上传接口
curl -X POST "https://你的域名/upload/product-image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/test.jpg"

# 成功响应
{"code":200,"message":"上传成功","data":{"url":"/uploads/products/202512/xxx.jpg"}}
```

### 7. 完整测试流程

1. **准备工作**:
   - 确保后端服务运行正常
   - 确保已登录小程序

2. **测试新增页面上传**:
   - 打开控制台
   - 进入"添加物品"页面
   - 点击"上传图片"
   - 选择图片
   - 查看控制台日志
   - 确认图片预览显示

3. **测试编辑页面上传**:
   - 打开控制台
   - 进入"编辑物品"页面
   - 点击"上传图片"
   - 选择图片
   - 查看控制台日志
   - 确认图片预览显示

4. **测试首页编辑弹窗上传**:
   - 打开控制台
   - 在首页点击某个物品
   - 在弹窗中点击"上传图片"
   - 选择图片
   - 查看控制台日志
   - 确认图片预览显示

5. **测试保存功能**:
   - 上传图片后
   - 填写其他必填信息
   - 点击"保存"
   - 确认保存成功
   - 刷新列表
   - 确认图片显示

## 🎯 关键改进

### 新增详细日志

所有上传操作现在都会输出：
- ✅ HTTP状态码
- ✅ 响应数据
- ✅ 解析后的数据对象
- ✅ 生成的图片URL
- ✅ 错误详情（包括error对象完整信息）

### 改进错误提示

- 显示HTTP状态码: `上传失败(404)`
- 显示具体业务错误信息
- 显示网络错误详情
- 延长提示时间到2秒

### 三处上传功能

1. **pages/add/add.js** - 新增页面
2. **pages/edit/edit.js** - 编辑页面
3. **pages/index/index.js** - 首页编辑弹窗

所有功能已统一更新！

## 📞 下一步

1. 在小程序中测试上传
2. 查看控制台输出的日志
3. 根据具体错误信息排查问题
4. 如有疑问，提供控制台完整日志
