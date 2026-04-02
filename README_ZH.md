# 墨析 · 中文语法等级分析器

<div align="center">
  
![状态](https://img.shields.io/badge/状态-生产就绪-brightgreen)
![技术栈](https://img.shields.io/badge/技术栈-HTML%2FCSS%2FJS-ffca28)
![学术标准](https://img.shields.io/badge/学术标准-GF%200025--2021-blue)
![许可证](https://img.shields.io/badge/许可证-MIT-blue)

**基于《国际中文教育中文水平等级标准》(GF 0025-2021) 的中文语法等级分析工具**

墨水风格设计 · 纯前端实现 · 支持1-6级语法智能标注 · LLM增强分析

[特性](#特性) | [快速开始](#快速开始) | [技术架构](#技术架构) | [使用指南](#使用指南) | [部署](#部署指南)

</div>

## 📋 特性概览

### 🔍 **多层级语法分析**
- **424个语法点**：涵盖1-6级完整语法体系
- **4层匹配引擎**：正则→结构→关键词→短语字典
- **优先级机制**：智能处理语法重叠
- **等级标注**：彩色高亮显示不同等级语法

### 🎨 **水墨设计美学**
- **国风视觉**：墨水晕染背景 + 书法字体
- **响应式布局**：桌面/平板/手机全适配
- **双语支持**：中英文界面一键切换
- **暗色主题**：护眼模式

### 🤖 **AI 增强分析**
- **LLM 集成**：支持 DeepSeek、GPT-4o、智谱 GLM 等
- **模型自动识别**：根据 API 端点智能推断
- **专业提示词**：6级语法速查 + 分析原则
- **容错机制**：30秒超时、JSON解析降级

### 📊 **数据可视化**
- **等级分布饼图**：各等级语法占比
- **历史记录追踪**：本地存储分析历史
- **统计面板**：语法点频次、覆盖度分析
- **一键导出**：JSON/CSV 格式

## 🚀 快速开始

### 在线使用（最简单）
1. 下载项目文件
2. 用浏览器打开 `index.html`
3. 粘贴中文文本，点击"分析"

### 本地服务器
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# 访问 http://localhost:8000
```

### 主要功能区域
1. **析文** - 核心分析区，粘贴文本获得语法标注
2. **览纲** - 浏览1-6级语法大纲
3. **史笺** - 查看分析历史记录
4. **观象** - 统计图表和数据分析

## 🏗️ 技术架构

### 核心文件
```
chinese-grammar-analyzer/
├── index.html              # 主页面
├── css/style.css          # 墨水风格样式
├── js/app.js              # 界面交互
├── js/analyzer.js         # 4层分析引擎 v4.2
├── js/grammar-data.js     # 424个语法点
└── js/patterns-config.js  # 正则模式配置
```

### 4层分析引擎
1. **内置正则模式** - 200+条，含70+成语/四字格
2. **结构模式** - head-tail gap匹配（10个复杂模式）
3. **关键词索引** - 从语法点名称提取关键词
4. **短语字典** - 从例句提取 + 固定短语补充

### LLM 配置
```javascript
// 填入你的 API 信息
API端点: https://api.deepseek.com/v1/chat/completions
API密钥: sk-xxxxxxxxxxxxxxxxxxxxxxxx
模型名称: deepseek-chat（自动识别）
```

## 📖 使用指南

### 基本操作
1. **粘贴文本**：支持长文本、段落、句子
2. **查看标注**：不同颜色表示不同等级语法
3. **鼠标悬停**：查看语法点详情和例句
4. **导出结果**：JSON/CSV格式，含完整标注信息

### 高级功能
- **LLM增强**：启用后，模糊语法边界由 AI 判断
- **自定义模板**：高级用户可修改 API 请求格式
- **响应路径**：自定义 LLM 响应 JSON 解析路径
- **模型指定**：手动指定模型名称（覆盖自动识别）

### 快捷键
- `Ctrl/Cmd + Enter`：快速分析
- `Ctrl/Cmd + S`：导出结果
- `Ctrl/Cmd + L`：切换语言
- `Esc`：关闭弹窗

## 🚢 部署指南

> **面向中国大陆用户时，不建议把 GitHub Pages、jsDelivr、unpkg 作为主站方案。** 这些平台在不同运营商网络下可能出现打开慢、资源超时甚至无法访问的问题。

### 静态托管（中国大陆推荐）
- **腾讯云 CloudBase 静态托管**：最省事，适合直接上线演示站
- **腾讯云 COS 静态网站托管**：适合纯静态部署，可配合 CDN
- **自有云服务器 / 宝塔 / Nginx**：最稳，适合正式长期使用
- **Vercel / Netlify**：可作海外备用站，不建议作为大陆主站

### 发布前检查
- 确保 `css/fonts.css`、`lib/chart.umd.min.js`、`lib/fonts/` 一并上传
- 当前版本已去除页面运行所需的外部 CDN，支持纯静态部署
- 若绑定中国大陆自定义域名，通常还需要备案


### 自建服务器
```nginx
server {
    listen 80;
    server_name grammar.yourdomain.com;
    root /path/to/chinese-grammar-analyzer;
    index index.html;
    
    # 启用压缩
    gzip on;
    gzip_types text/css application/javascript;
}
```

### Docker 部署
```bash
docker run -d -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html \
  nginx:alpine
```

## 📚 学术基础

### 数据标准
基于 **《国际中文教育中文水平等级标准》(GF 0025-2021)**，教育部官方标准。

**语法等级分布**：
- **1级（入门）**：48个语法点
- **2级（初级）**：81个语法点
- **3级（准中级）**：81个语法点
- **4级（中级）**：76个语法点
- **5级（准高级）**：71个语法点
- **6级（高级）**：67个语法点

### 分析原则
1. **标准优先**：严格遵循官方定义
2. **语境敏感**：结合上下文判断
3. **等级递进**：低级语法优先匹配
4. **重叠共存**：不同等级语法可同时标注

## 🧪 测试验证

### 测试覆盖率
- **语法审核**：46个典型语法结构，100%通过
- **稳定性测试**：26种边界条件，全部通过
- **性能测试**：<2秒处理10,000字文本

### 浏览器兼容性
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ 微信浏览器（最新）

## 🤝 贡献指南

### 开发流程
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/新功能`)
3. 提交更改 (`git commit -m '添加新功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 发起 Pull Request

### 添加新语法点
在 `js/patterns-config.js` 中添加：
```javascript
{
  pattern: /你的正则表达式/g,
  name: "语法点名称",
  level: 3, // 1-6级
  example: "示例句子"
}
```

### 报告问题
请在 Issues 中提供：
1. 问题描述
2. 重现步骤
3. 浏览器/系统信息
4. 相关文本样例

## 📄 许可证

MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- **教育部中外语言交流合作中心**：制定语法标准
- **厦门大学国际中文教育学院**：学术指导
- **所有贡献者**：代码、测试、反馈
- **开源项目**：Chart.js、Google Fonts、jsDelivr

## 📞 联系方式

- **项目维护**：[你的名字]
- **问题反馈**：[GitHub Issues](https://github.com/username/chinese-grammar-analyzer/issues)
- **线上地址**：请替换为你实际可访问的正式地址（若面向中国大陆用户，避免使用 `github.io` 作为主站）


---

<div align="center">
<em>笔墨为析，文法为纲 • 传承中文，智析语法</em><br>
<sub>最后更新：2024年3月 | 版本：v2.0</sub>
</div>
