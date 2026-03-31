/**
 * GrammarAnalyzer - Chinese Grammar Analysis Engine
 * 
 * Analyzes Chinese text against HSK Grammar Standards (GF 0025-2021)
 * Supports both database keyword matching and built-in regex patterns.
 */

class GrammarAnalyzer {
  constructor(grammarData) {
    this.grammarData = grammarData;
    this.keywordIndex = this._buildKeywordIndex();
    this.builtinPatterns = [
      // Level 1 - Basic patterns
      {pattern: /不[是]?[。？！]?/g, level: 1, desc_zh: '否定（不）', desc_en: 'Negation (不)'},
      {pattern: /没[有]?[。？！]?/g, level: 1, desc_zh: '否定（没）', desc_en: 'Negation (没)'},
      {pattern: /很[好吃大漂亮多高]/g, level: 1, desc_zh: '程度副词（很）', desc_en: 'Degree adverb (很)'},
      // Level 2 - Elementary patterns
      {pattern: /正在|在[^，。？！]{1,2}着/g, level: 2, desc_zh: '进行体（正在/在……着）', desc_en: 'Progressive (正在/在……着)'},
      {pattern: /比[^，。？！]{1,8}[都还更]/g, level: 2, desc_zh: '比较句（比）', desc_en: 'Comparative (比)'},
      // Level 3 - Intermediate patterns
      {pattern: /虽然[^，。？！]{1,15}但是/g, level: 3, desc_zh: '虽然……但是', desc_en: '虽然……但是 (Although...but)'},
      {pattern: /因为[^，。？！]{1,15}所以/g, level: 3, desc_zh: '因为……所以', desc_en: '因为……所以 (Because...so)'},
      {pattern: /如果[^，。？！]{1,15}就/g, level: 3, desc_zh: '如果……就', desc_en: '如果……就 (If...then)'},
      {pattern: /不但[^，。？！]{1,10}而且/g, level: 3, desc_zh: '不但……而且', desc_en: '不但……而且 (Not only...but also)'},
      {pattern: /一边[^，。？！]{1,8}一边/g, level: 3, desc_zh: '一边……一边', desc_en: '一边……一边 (Simultaneous)'},
      {pattern: /越[^，。？！]{1,6}越/g, level: 3, desc_zh: '越……越', desc_en: '越……越 (The more...the more)'},
      // Level 4 - Upper-Intermediate patterns
      {pattern: /尽管[^，。？！]{1,12}但|即使[^，。？！]{1,12}也/g, level: 4, desc_zh: '让步转折', desc_en: 'Concessive'},
      {pattern: /无论[^，。？！]{1,12}都|不管[^，。？！]{1,12}都/g, level: 4, desc_zh: '无论/不管……都', desc_en: '无论/不管……都 (No matter...)'},
      {pattern: /既然[^，。？！]{1,10}就/g, level: 4, desc_zh: '既然……就', desc_en: '既然……就 (Since...then)'},
      {pattern: /与其[^，。？！]{1,10}不如/g, level: 4, desc_zh: '与其……不如', desc_en: '与其……不如 (Rather than...)'},
      {pattern: /不是[^，。？！]{1,8}而是/g, level: 4, desc_zh: '不是……而是', desc_en: '不是……而是 (Not...but rather)'},
      // Level 5 - Advanced patterns
      {pattern: /恰恰[相反]|恰恰[是]/g, level: 5, desc_zh: '反预期（恰恰）', desc_en: 'Counter-expectation (恰恰)'},
      {pattern: /旨在|意在|目的在于/g, level: 5, desc_zh: '目的表达', desc_en: 'Purpose expression'},
      {pattern: /以致|以至于/g, level: 5, desc_zh: '结果（以致）', desc_en: 'Result (以致)'},
      {pattern: /鉴于|考虑到/g, level: 5, desc_zh: '原因（鉴于）', desc_en: 'Reason (鉴于)'},
      // Level 6 - Proficient patterns
      {pattern: /毋庸[讳言赘述置言质疑]/g, level: 6, desc_zh: '书面语（毋庸）', desc_en: 'Written (毋庸)'},
      {pattern: /归根结底|总而言之|综上所述/g, level: 6, desc_zh: '总结标记', desc_en: 'Summary marker'},
      {pattern: /任凭|哪怕|纵然|即便/g, level: 6, desc_zh: '高级让步', desc_en: 'Advanced concessive'},
    ];
  }

  /**
   * Build a keyword index from grammar data for fast text matching.
   * Extracts Chinese character chunks (2+) from grammar point names.
   * Lower-level entries take priority for ambiguous keywords.
   */
  _buildKeywordIndex() {
    const index = {};
    for (const gp of this.grammarData) {
      let cleanName = gp.name;
      if (cleanName.includes('：')) {
        cleanName = cleanName.split('：').pop();
      }
      // Extract Chinese chunks (2+ characters)
      const chunks = cleanName.match(/[\u4e00-\u9fff]{2,}/g) || [];
      for (const chunk of chunks) {
        if (!(chunk in index) || gp.level < index[chunk].level) {
          index[chunk] = gp;
        }
      }
    }
    return index;
  }

  /**
   * Analyze a Chinese text for grammar points.
   * @param {string} text - The text to analyze
   * @param {string} lang - Language for descriptions ('zh' or 'en')
   * @returns {object} Analysis result with matches, distribution, and suggestions
   */
  analyze(text, lang = 'zh') {
    const result = {
      text,
      charCount: text.length,
      sentenceCount: Math.max(text.split(/[。！？；…]+/).filter(s => s.trim()).length, 1),
      matches: [],
      levelDistribution: {},
      maxLevel: 1,
      avgLevel: 1,
      suggestedLevel: 1,
      suggestions: []
    };

    // Phase 1: Match built-in regex patterns
    for (const bp of this.builtinPatterns) {
      const regex = new RegExp(bp.pattern.source, bp.pattern.flags);
      let m;
      while ((m = regex.exec(text)) !== null) {
        result.matches.push({
          pattern: m[0],
          grammarPoint: lang === 'zh' ? bp.desc_zh : bp.desc_en,
          level: bp.level,
          position: m.index,
          source: 'builtin',
          gpId: ''
        });
      }
    }

    // Phase 2: Match database keywords
    const seen = new Set();
    for (const [kw, gp] of Object.entries(this.keywordIndex)) {
      const key = gp.id + kw;
      if (seen.has(key)) continue;
      let idx = text.indexOf(kw);
      if (idx !== -1) {
        seen.add(key);
        result.matches.push({
          pattern: kw,
          grammarPoint: gp.name.split('：')[0],
          level: gp.level,
          position: idx,
          source: 'database',
          gpId: gp.id
        });
      }
    }

    // Phase 3: Remove overlapping matches (keep higher-level or earlier match)
    result.matches.sort((a, b) => a.position - b.position);
    const filtered = [];
    let lastEnd = -1;
    for (const m of result.matches) {
      if (m.position >= lastEnd) {
        filtered.push(m);
        lastEnd = m.position + m.pattern.length;
      } else if (filtered.length > 0 && m.level > filtered[filtered.length - 1].level) {
        filtered[filtered.length - 1] = m;
        lastEnd = m.position + m.pattern.length;
      }
    }
    result.matches = filtered;

    // Phase 4: Calculate level distribution
    for (const m of result.matches) {
      result.levelDistribution[m.level] = (result.levelDistribution[m.level] || 0) + 1;
    }

    if (result.matches.length > 0) {
      const levels = result.matches.map(m => m.level);
      result.maxLevel = Math.max(...levels);
      result.avgLevel = Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10;
    }

    // Phase 5: Suggest level and generate feedback
    result.suggestedLevel = this._suggestLevel(result);
    result.suggestions = this._generateSuggestions(result, lang);

    return result;
  }

  /**
   * Calculate the suggested HSK level using weighted scoring.
   * Higher-frequency grammar points get more weight.
   */
  _suggestLevel(result) {
    if (!result.matches.length) return 1;
    let weightedSum = 0, totalWeight = 0;
    for (const [lvl, count] of Object.entries(result.levelDistribution)) {
      const w = count * count;
      weightedSum += lvl * w;
      totalWeight += w;
    }
    return Math.max(1, Math.min(6, Math.round(weightedSum / totalWeight)));
  }

  /**
   * Generate human-readable suggestions based on analysis results.
   */
  _generateSuggestions(result, lang) {
    const suggestions = [];

    if (!result.matches.length) {
      suggestions.push(lang === 'zh'
        ? '⚠️ 未检测到明确的语法点，请提供更长的文本以获得准确分析。'
        : '⚠️ No clear grammar points detected. Please provide a longer text for accurate analysis.');
      return suggestions;
    }

    // Highlight advanced grammar usage
    const high = result.matches.filter(m => m.level >= 4);
    if (high.length > 0) {
      const pts = [...new Set(high.map(m => m.grammarPoint))].slice(0, 5);
      suggestions.push(lang === 'zh'
        ? `📌 检测到 ${high.length} 处中高级(4-6级)语法，涉及：${pts.join('、')}`
        : `📌 Found ${high.length} advanced (L4-6) grammar points: ${pts.join(', ')}`);
    }

    // Show dominant level
    if (Object.keys(result.levelDistribution).length > 0) {
      const dominant = Object.entries(result.levelDistribution).sort((a, b) => b[1] - a[1])[0];
      const lvl = parseInt(dominant[0]);
      suggestions.push(lang === 'zh'
        ? `📊 语法等级主要集中在 ${lvl}级，占比 ${Math.round(dominant[1] / result.matches.length * 100)}%`
        : `📊 Grammar mainly concentrated at Level ${lvl}, ${Math.round(dominant[1] / result.matches.length * 100)}%`);
    }

    // Grammar richness assessment
    const unique = new Set(result.matches.map(m => m.grammarPoint));
    const richness = unique.size / result.sentenceCount;
    if (richness >= 3) {
      suggestions.push(lang === 'zh' ? '✅ 语法丰富度：优秀' : '✅ Grammar richness: Excellent');
    } else if (richness >= 1.5) {
      suggestions.push(lang === 'zh' ? '📝 语法丰富度：良好' : '📝 Grammar richness: Good');
    } else {
      suggestions.push(lang === 'zh' ? '💬 语法丰富度：一般' : '💬 Grammar richness: Average');
    }

    // Overall difficulty assessment
    const sl = result.suggestedLevel;
    if (sl >= 5) {
      suggestions.push(lang === 'zh'
        ? '🎓 文本含有大量高级语法，适合HSK5-6级/专业级学习者。'
        : '🎓 Text contains extensive advanced grammar, suitable for HSK 5-6 / professional learners.');
    } else if (sl >= 3) {
      suggestions.push(lang === 'zh'
        ? '📖 文本语法难度适中，适合HSK3-4级学习者。'
        : '📖 Text grammar difficulty is moderate, suitable for HSK 3-4 learners.');
    } else {
      suggestions.push(lang === 'zh'
        ? '📗 文本语法较为基础，适合HSK1-2级初学者。'
        : '📗 Text grammar is basic, suitable for HSK 1-2 beginners.');
    }

    return suggestions;
  }
}
