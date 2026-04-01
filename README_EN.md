# Ink Analysis · Chinese Grammar Level Analyzer

<div align="center">

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Tech Stack](https://img.shields.io/badge/Tech%20Stack-HTML%2FCSS%2FJS-ffca28)
![Academic Standard](https://img.shields.io/badge/Academic%20Standard-GF%200025--2021-blue)
![License](https://img.shields.io/badge/License-MIT-blue)

**Chinese grammar level analysis tool based on the *Chinese Proficiency Grading Standards for International Chinese Language Education* (GF 0025-2021)**

Ink-style design · Pure frontend implementation · Levels 1-6 grammar annotation · LLM-enhanced analysis

[Features](#features) | [Quick Start](#quick-start) | [Architecture](#architecture) | [Usage](#usage-guide) | [Deployment](#deployment)

</div>

## ✨ Features

### 🔍 **Multi-level Grammar Analysis**
- **424 grammar points**: Complete 1-6 level system
- **4-layer matching engine**: Regex → Structural → Keywords → Phrase dictionary
- **Priority mechanism**: Intelligent overlap handling
- **Level annotation**: Color-coded highlighting by level

### 🎨 **Ink Wash Design Aesthetics**
- **Traditional Chinese style**: Ink diffusion background + calligraphy fonts
- **Responsive layout**: Desktop/tablet/mobile ready
- **Bilingual support**: Chinese/English interface toggle
- **Dark theme**: Eye-friendly reading mode

### 🤖 **AI Enhanced Analysis**
- **LLM integration**: DeepSeek, GPT-4o, GLM, Qwen support
- **Auto model detection**: Smart inference from API endpoint
- **Professional prompts**: 6-level grammar reference + analysis principles
- **Error handling**: 30s timeout, JSON fallback parsing

### 📊 **Data Visualization**
- **Level distribution pie chart**: Visual grammar level breakdown
- **History tracking**: Local storage for analysis records
- **Statistics panel**: Frequency and coverage analysis
- **One-click export**: JSON/CSV format with BOM header

## 🚀 Quick Start

### Online Use (Simplest)
1. Download project files
2. Open `index.html` in browser
3. Paste Chinese text, click "Analyze"

### Local Server
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# Visit http://localhost:8000
```

### Main Function Areas
1. **Analyze** - Core analysis, paste text for grammar annotation
2. **Browse** - View 1-6 level grammar outline
3. **History** - Check analysis records
4. **Stats** - Charts and data analysis

## 🏗️ Architecture

### Core Files
```
chinese-grammar-analyzer/
├── index.html              # Main page
├── css/style.css          # Ink-style CSS
├── js/app.js              # UI interactions
├── js/analyzer.js         # 4-layer analysis engine v4.2
├── js/grammar-data.js     # 424 grammar points
└── js/patterns-config.js  # Regex pattern config
```

### 4-Layer Analysis Engine
1. **Built-in regex** - 200+ patterns, 70+ idioms/four-character phrases
2. **Structural patterns** - head-tail gap matching (10 complex patterns)
3. **Keyword indexing** - Keywords extracted from grammar point names
4. **Phrase dictionary** - Extracted from examples + fixed phrases

### LLM Configuration
```javascript
// Fill in your API info
API Endpoint: https://api.deepseek.com/v1/chat/completions
API Key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
Model Name: deepseek-chat (auto-detected)
```

## 📖 Usage Guide

### Basic Operations
1. **Paste text**: Supports long text, paragraphs, sentences
2. **View annotations**: Different colors for different levels
3. **Hover over**: See grammar point details and examples
4. **Export results**: JSON/CSV format with full annotation

### Advanced Features
- **LLM enhancement**: AI judgment for ambiguous grammar boundaries
- **Custom template**: Advanced users can modify API request format
- **Response path**: Custom JSON parsing path for LLM responses
- **Model specification**: Manual model name (overrides auto-detection)

### Keyboard Shortcuts
- `Ctrl/Cmd + Enter`: Quick analysis
- `Ctrl/Cmd + S`: Export results
- `Ctrl/Cmd + L`: Toggle language
- `Esc`: Close dialogs

## 🚢 Deployment

### Static Hosting (Recommended)
- **GitHub Pages**: Push to `main` branch
- **Vercel**: Connect GitHub repo for auto-deploy
- **Netlify**: Drag and drop folder
- **Tencent Cloud COS**: Static website hosting

### Self-hosted Server
```nginx
server {
    listen 80;
    server_name grammar.yourdomain.com;
    root /path/to/chinese-grammar-analyzer;
    index index.html;
    
    # Enable compression
    gzip on;
    gzip_types text/css application/javascript;
}
```

### Docker Deployment
```bash
docker run -d -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html \
  nginx:alpine
```

## 📚 Academic Foundation

### Data Standard
Based on **《Chinese Proficiency Grading Standards for International Chinese Language Education》(GF 0025-2021)**, official Chinese proficiency standard.

**Grammar Level Distribution**:
- **Level 1 (Beginner)**: 48 grammar points
- **Level 2 (Elementary)**: 81 grammar points
- **Level 3 (Pre-intermediate)**: 81 grammar points
- **Level 4 (Intermediate)**: 76 grammar points
- **Level 5 (Pre-advanced)**: 71 grammar points
- **Level 6 (Advanced)**: 67 grammar points

### Analysis Principles
1. **Standard first**: Strict adherence to official definitions
2. **Context sensitive**: Judgment based on context
3. **Level progression**: Lower levels prioritized
4. **Overlap allowed**: Different level annotations can coexist

## 🧪 Testing & Validation

### Test Coverage
- **Grammar audit**: 46 typical grammar structures, 100% pass
- **Stability tests**: 26 boundary conditions, all passed
- **Performance**: <2 seconds for 10,000 character text

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ WeChat Browser (latest)

## 🤝 Contributing

### Development Workflow
1. Fork this repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open Pull Request

### Adding New Grammar Points
Add to `js/patterns-config.js`:
```javascript
{
  pattern: /your-regex/g,
  name: "Grammar Point Name",
  level: 3, // 1-6
  example: "Example sentence"
}
```

### Reporting Issues
Please provide in Issues:
1. Problem description
2. Steps to reproduce
3. Browser/system information
4. Relevant text sample

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Center for Language Education and Cooperation, Ministry of Education**: Grammar standard development
- **Xiamen University School of Chinese Language and Culture**: Academic guidance
- **All contributors**: Code, testing, feedback
- **Open source projects**: Chart.js, Google Fonts, jsDelivr

## 📞 Contact

- **Maintainer**: [Your Name]
- **Issue tracker**: [GitHub Issues](https://github.com/username/chinese-grammar-analyzer/issues)
- **Documentation**: [https://username.github.io/chinese-grammar-analyzer](https://username.github.io/chinese-grammar-analyzer)

---

<div align="center">
<em>Ink for analysis, grammar as framework • Preserving Chinese, intelligent grammar analysis</em><br>
<sub>Last updated: March 2024 | Version: v2.0</sub>
</div>
