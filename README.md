# 墨析 · 中文语法等级分析器

<p align="center">
  <img src="https://img.shields.io/badge/状态-生产就绪-brightgreen" alt="状态">
  <img src="https://img.shields.io/badge/技术栈-HTML%2FCSS%2FJS-ffca28" alt="技术栈">
  <img src="https://img.shields.io/badge/学术标准-GF%200025--2021-blue" alt="学术标准">
  <img src="https://img.shields.io/badge/许可证-MIT-blue" alt="许可证">
</p>

<p align="center">
  <strong>基于《国际中文教育中文水平等级标准》(GF 0025-2021) 的中文语法等级分析工具</strong><br>
  墨水风格设计 · 纯前端实现 · 支持1-6级语法智能标注 · LLM增强分析
</p>

<p align="center">
  <a href="#特性">特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#功能详解">功能详解</a> •
  <a href="#技术架构">技术架构</a> •
  <a href="#学术基础">学术基础</a> •
  <a href="#贡献">贡献</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/user/repo" alt="最后提交">
  <img src="https://img.shields.io/github/issues/user/repo" alt="问题">
  <img src="https://img.shields.io/github/stars/user/repo" alt="星标">
</p>

## ✨ 特性

### 🔍 **多层级语法分析**
- **424个语法点**：涵盖1-6级完整语法体系（48+81+81+76+71+67个）
- **4层匹配引擎**：正则模式 → 结构模式 → 关键词索引 → 短语字典
- **优先级机制**：phrase:4 > structural:3 > builtin:2 > database:1, llm:5
- **重叠处理**：不同等级匹配可共存，同等级智能去重

### 🎨 **水墨设计美学**
- **国风视觉**：墨水晕染背景 + 书法字体 + 传统配色
- **响应式布局**：桌面/平板/手机全适配
- **双语支持**：中英文界面一键切换
- **暗色主题**：护眼模式，专注阅读

### 🤖 **AI 增强分析**
- **LLM 集成**：支持 DeepSeek、GPT-4o、智谱 GLM、阿里通义等
- **模型自动识别**：根据 API 端点智能推断模型名称
- **专业提示词**：6级语法速查 + 6条分析原则 + few-shot 示例
- **容错机制**：30秒超时、JSON解析降级、位置校验修复

### 📊 **数据可视化**
- **语法等级分布图**：饼图展示各等级占比
- **历史记录追踪**：本地存储分析历史
- **统计面板**：语法点频次、覆盖度分析
- **一键导出**：JSON/CSV 格式，含 BOM 头

## 🚀 快速开始

### 在线使用
1. **访问页面**：打开 [index.html](index.html)（任何现代浏览器）
2. **粘贴文本**：输入或粘贴中文文本（建议 < 10,000 字）
3. **点击分析**：立即获得语法等级标注和统计数据

### 本地部署
```bash
# 克隆仓库
git clone https://github.com/username/chinese-grammar-analyzer.git
cd chinese-grammar-analyzer

# 启动本地服务器（Python 3）
python -m http.server 8000

# 或使用 Node.js
npx serve .
```

访问 http://localhost:8000 即可使用。

### Docker 运行
```dockerfile
# 使用官方 Nginx 镜像
docker run -d -p 8080:80 -v $(pwd):/usr/share/nginx/html nginx:alpine
```

## 📖 功能详解

### 1. **析文** - 语法分析核心
- **输入文本**：支持长文本、段落、句子
- **语法标注**：彩色高亮显示1-6级语法点
- **鼠标悬停**：查看语法点详情、例句、等级
- **分析报告**：等级分布、覆盖率、建议等级

### 2. **览纲** - 语法大纲浏览
- **分级查看**：按1-6级展开/收起语法点
- **搜索过滤**：关键词搜索语法点名称和描述
- **结构树**：直观展示语法点层级关系
- **统计概览**：各级别语法点数量统计

### 3. **史笺** - 历史记录
- **本地存储**：浏览器本地保存分析历史
- **时间线**：按时间顺序排列分析记录
- **结果复现**：点击历史条目重新加载结果
- **批量导出**：导出所有历史记录为 JSON

### 4. **观象** - 统计分析
- **等级分布饼图**：直观显示各等级语法占比
- **语法点热度**：高频语法点排名
- **覆盖度分析**：当前文本对各等级语法覆盖情况
- **趋势图表**：历史分析趋势可视化

## 🏗️ 技术架构

### 核心文件结构
```
chinese-grammar-analyzer/
├── index.html              # 主页面（单文件应用）
├── css/
│   └── style.css          # 墨水风格样式表
├── js/
│   ├── app.js             # 界面交互 & LLM 配置
│   ├── analyzer.js        # 4层分析引擎 v4.2
│   ├── grammar-data.js    # 424个语法点数据
│   └── patterns-config.js # 正则模式配置文件
└── README.md              # 本文档
```

### 4层分析引擎 v4.2
```javascript
// Phase 1: 内置正则模式（200+条，含70+成语/四字格）
const builtinPatterns = [
  { pattern: /(虽然|尽管)[^，。！？]+(但是|可是|然而|不过)[^。！？]*/g, name: "虽然…但是…" },
  { pattern: /(不但|不仅|不只|不光)[^，。！？]+(而且|并且|还|也)[^。！？]*/g, name: "不但…而且…" }
];

// Phase 2: 结构模式（head-tail gap匹配）
const structuralPatterns = [
  { head: "越", tail: "越", minGap: 0, maxGap: 8, name: "越…越…" }
];

// Phase 3: 数据库关键词索引（从语法点名称提取）
const databaseKeywords = ["把字句", "被字句", "是字句"];

// Phase 4: 短语字典（从例句提取 + 固定短语补充）
const phraseDict = {
  "一会儿": { level: 2, name: "一会儿", pos: [0, 3] }
};
```

### LLM 集成配置
```javascript
// 模型自动推断（DeepSeek → deepseek-chat）
function _detectModel(endpoint) {
  const e = endpoint.toLowerCase();
  if (e.includes('deepseek')) return 'deepseek-chat';
  if (e.includes('moonshot') || e.includes('kimi')) return 'moonshot-v1-8k';
  if (e.includes('qwen') || e.includes('dashscope')) return 'qwen-turbo';
  if (e.includes('glm') || e.includes('zhipu')) return 'glm-4-flash';
  if (e.includes('yi')) return 'yi-lightning';
  if (e.includes('openai')) return 'gpt-4o-mini';
  return 'gpt-4o-mini'; // 默认回退
}
```

## 📚 学术基础

### 数据来源
本项目基于 **《国际中文教育中文水平等级标准》(GF 0025-2021)**，这是中国教育部发布的官方中文水平等级标准。

**语法体系概览**：
- **1级（入门）**：48个语法点 - 基本句式、常用虚词
- **2级（初级）**：81个语法点 - 简单复句、时体标记
- **3级（准中级）**：81个语法点 - 复杂句式、话语标记
- **4级（中级）**：76个语法点 - 修辞手法、语篇衔接
- **5级（准高级）**：71个语法点 - 文言成分、专业表达
- **6级（高级）**：67个语法点 - 文学修辞、学术语体

### 分析原则
1. **标准优先**：严格遵循 GF 0025-2021 定义
2. **语境敏感**：结合上下文判断语法功能
3. **等级递进**：低级语法优先匹配
4. **重叠共存**：不同等级语法可同时标注
5. **LLM 补充**：AI 用于模糊边界判断

## 📞 联系方式

- **项目维护者**：Oliver Zhang
- **邮箱**：oliz020315@gmail.com
- **GitHub**：[@oliz020315-cpu](https://github.com/oliz020315-cpu)


---

<p align="center">
  <em>笔墨为析，文法为纲 • 传承中文，智析语法</em><br>
  <sub>最后更新：2024年3月 | 版本：v2.0</sub>
</p>

<p align="center">
  <a href="#墨析--中文语法等级分析器">返回顶部</a>
</p>
