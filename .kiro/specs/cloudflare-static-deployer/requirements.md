# 需求文档

## 介绍

本项目旨在为非技术人员提供一个简单易用的web应用，用于快速部署静态网页到Cloudflare平台。应用将提供域名管理和页面部署功能，通过友好的用户界面简化Cloudflare的复杂操作。

技术栈：
- 前端：Vue 3 + TypeScript + Tailwind CSS + shadcn-vue + ESLint
- 后端：Fastify + TypeScript
- 数据源：Cloudflare API（无需本地数据库）
- 部署平台：Cloudflare

## 需求

### 需求 1 - 后端API设计

**用户故事：** 作为前端开发者，我希望有一个完整的后端API来处理所有与Cloudflare的交互，以便前端可以通过统一的接口管理域名和页面。

#### 验收标准

1. WHEN 前端发起任何请求 THEN 后端 SHALL 作为中间层处理所有与Cloudflare API的通信
2. WHEN 后端接收到域名相关请求 THEN 系统 SHALL 提供获取域名列表、添加域名、获取域名详情、管理DNS记录和SSL证书的API端点
3. WHEN 后端接收到页面相关请求 THEN 系统 SHALL 提供获取Cloudflare Pages项目列表、创建项目、部署页面的API端点
4. WHEN 后端调用Cloudflare API THEN 系统 SHALL 使用预配置的API Token (F_Ce0FBCmUmaRF0REv11Jt81TgQGMMgEbXKhv37Z)
5. WHEN 后端处理文件上传 THEN 系统 SHALL 接收文件夹并转发到Cloudflare Pages API
6. WHEN Cloudflare API返回错误 THEN 后端 SHALL 将错误信息转换为用户友好的格式返回给前端
7. WHEN 后端启动 THEN 系统 SHALL 提供RESTful API接口供前端调用

### 需求 2 - 主页面导航

**用户故事：** 作为用户，我希望在主页面能够方便地在域名列表和页面列表之间切换，以便管理不同类型的资源。

#### 验收标准

1. WHEN 用户访问主页面 THEN 系统 SHALL 在页面头部显示包含"域名列表"和"页面列表"的标签页
2. WHEN 用户点击"域名列表"标签 THEN 系统 SHALL 显示域名管理界面
3. WHEN 用户点击"页面列表"标签 THEN 系统 SHALL 显示页面管理界面
4. WHEN 用户在任一标签页 THEN 系统 SHALL 高亮显示当前活跃的标签

### 需求 3 - 域名列表管理

**用户故事：** 作为用户，我希望能够查看我的所有域名及其状态信息，以便了解域名的当前配置情况。

#### 验收标准

1. WHEN 用户访问域名列表页面 THEN 前端 SHALL 调用后端API获取并显示所有域名
2. WHEN 显示域名列表 THEN 系统 SHALL 为每个域名显示状态信息（活跃/暂停/错误等）
3. WHEN 域名列表加载失败 THEN 系统 SHALL 显示错误信息
4. WHEN 用户刷新页面 THEN 前端 SHALL 重新调用后端API获取最新的域名状态

### 需求 4 - 新建域名

**用户故事：** 作为用户，我希望能够添加新的域名到我的Cloudflare账号，以便开始使用Cloudflare服务。

#### 验收标准

1. WHEN 用户在域名列表页面 THEN 系统 SHALL 显示"新建域名"按钮
2. WHEN 用户点击"新建域名"按钮 THEN 系统 SHALL 弹出包含域名地址和Nameservers输入字段的对话框
3. WHEN 用户输入域名地址和Nameservers并提交 THEN 前端 SHALL 调用后端API添加域名
4. IF 域名添加成功 THEN 系统 SHALL 关闭对话框并刷新域名列表
5. IF 域名添加失败 THEN 系统 SHALL 在对话框中显示错误信息
6. WHEN 用户输入无效的域名格式 THEN 系统 SHALL 显示格式验证错误

### 需求 5 - 域名详情管理

**用户故事：** 作为用户，我希望能够查看和管理特定域名的详细配置，包括DNS记录和SSL证书。

#### 验收标准

1. WHEN 用户点击域名列表中的某个域名 THEN 系统 SHALL 导航到该域名的详情页面
2. WHEN 用户访问域名详情页面 THEN 前端 SHALL 调用后端API显示该域名的当前DNS记录
3. WHEN 用户在域名详情页面 THEN 系统 SHALL 提供修改DNS记录的功能
4. WHEN 用户修改DNS记录并保存 THEN 前端 SHALL 调用后端API更新记录
5. WHEN 用户在域名详情页面 THEN 系统 SHALL 提供申请Cloudflare Universal SSL证书的选项
6. WHEN 用户申请SSL证书 THEN 前端 SHALL 调用后端API并显示申请状态

### 需求 6 - 页面列表管理

**用户故事：** 作为用户，我希望能够查看我已部署的所有静态页面，以便管理我的网站项目。

#### 验收标准

1. WHEN 用户访问页面列表标签 THEN 前端 SHALL 调用后端API从Cloudflare Pages获取并显示所有页面项目
2. WHEN 显示页面列表 THEN 系统 SHALL 为每个页面显示项目名称、部署状态和访问URL
3. WHEN 页面列表为空 THEN 系统 SHALL 显示提示信息引导用户创建第一个页面
4. WHEN 用户刷新页面列表 THEN 前端 SHALL 重新调用后端API获取最新的部署状态
5. WHEN 用户点击页面项目 THEN 系统 SHALL 提供更新页面的选项
6. WHEN 用户选择更新页面 THEN 系统 SHALL 弹出文件夹选择对话框允许选择新的文件夹资源
7. WHEN 用户选择新的文件夹进行更新 THEN 前端 SHALL 调用后端API重新部署页面并保持相同的项目名称和URL

### 需求 7 - 新建页面部署

**用户故事：** 作为非技术用户，我希望能够通过简单的操作创建和部署我的静态网页项目，而无需了解复杂的部署流程。

#### 验收标准

1. WHEN 用户在页面列表 THEN 系统 SHALL 显示"新建页面"按钮
2. WHEN 用户点击"新建页面"按钮 THEN 系统 SHALL 弹出包含项目名称输入的对话框
3. WHEN 用户输入项目名称并提交 THEN 系统 SHALL 验证名称的唯一性和有效性
4. WHEN 项目名称验证通过 THEN 前端 SHALL 调用后端API在Cloudflare Pages创建新的页面项目
5. IF 项目创建成功 THEN 系统 SHALL 关闭对话框并在页面列表中显示新创建的项目
6. WHEN 用户点击已创建的页面项目 THEN 系统 SHALL 显示"上传文件夹"选项
7. WHEN 用户选择上传文件夹 THEN 系统 SHALL 弹出文件夹选择对话框
8. WHEN 用户选择文件夹 THEN 系统 SHALL 验证文件夹内容和大小限制（小于10MB）
9. WHEN 文件夹验证通过 THEN 前端 SHALL 调用后端API将文件夹内容上传到Cloudflare Pages并开始部署
10. WHEN 部署过程中 THEN 系统 SHALL 显示部署进度和状态
11. IF 部署成功 THEN 系统 SHALL 显示成功信息和访问URL
12. IF 部署失败 THEN 系统 SHALL 显示详细的错误信息

### 需求 8 - 错误处理和用户反馈

**用户故事：** 作为用户，我希望在操作过程中能够获得清晰的反馈信息，以便了解操作结果和处理错误情况。

#### 验收标准

1. WHEN 任何后端API调用失败 THEN 系统 SHALL 显示用户友好的错误信息
2. WHEN 网络连接问题 THEN 系统 SHALL 显示连接错误提示并提供重试选项
3. WHEN 操作成功完成 THEN 系统 SHALL 显示成功确认信息
4. WHEN 前端发起任何API请求 THEN 系统 SHALL 显示全局loading状态并禁用所有交互按钮
5. WHEN API请求完成（成功或失败） THEN 系统 SHALL 隐藏全局loading状态并恢复按钮交互
6. WHEN 全局loading显示期间 THEN 系统 SHALL 阻止用户进行任何其他操作以避免重复请求
7. IF 后端返回Cloudflare API认证错误 THEN 系统 SHALL 显示API连接问题的错误信息

### 需求 9 - PC端界面设计

**用户故事：** 作为用户，我希望在PC端获得清晰易用的界面体验，以便高效地管理域名和页面。

#### 验收标准

1. WHEN 用户在PC端访问应用 THEN 系统 SHALL 提供针对桌面优化的界面布局
2. WHEN 用户操作界面元素 THEN 系统 SHALL 提供清晰的视觉反馈和交互效果
3. WHEN 用户查看列表数据 THEN 系统 SHALL 使用表格或卡片布局合理展示信息
4. WHEN 用户使用弹窗功能 THEN 系统 SHALL 确保弹窗在PC屏幕上居中显示且大小适宜
5. WHEN 用户访问应用 THEN 系统 SHALL 使用紫色(purple)作为主题色配合浅色背景
6. WHEN 显示按钮和交互元素 THEN 系统 SHALL 使用紫色主题色进行高亮和强调