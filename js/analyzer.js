/**
 * GrammarAnalyzer - Chinese Grammar Analysis Engine v4.0
 * 
 * Analyzes Chinese text against HSK Grammar Standards (GF 0025-2021)
 * 4-layer matching architecture:
 *   1. Built-in regex patterns (200+ patterns, comprehensive coverage)
 *   2. Structural Patterns (head-tail gap matching, context-aware)
 *   3. Database keyword index (from grammar point names)
 *   4. Phrase Dictionary (from examples + supplementary phrases)
 * 
 * Overlap resolution: Longest match first → structural/builtin > database
 * 
 * v4.0 changes: Major regex rewrite for higher coverage, looser matching,
 *   comprehensive "自+时间" support, gap fix in structural patterns.
 */

class GrammarAnalyzer {
  // 非补语词白名单（含"得"但不是补语结构）
  static NON_COMPLEMENT = (typeof window !== 'undefined' && window.MoxiPatternsConfig)
    ? window.MoxiPatternsConfig.nonComplementWords
    : ['觉得', '懂得', '晓得', '获得', '取得', '赢得', '记得', '值得', '懒得', '免得', '博得'];

  constructor(grammarData) {
    this.grammarData = grammarData;
    this.keywordIndex = this._buildKeywordIndex();
    this.builtinPatterns = this._initPatterns();
    // Pre-compile regex patterns for Phase 1 (avoid re-creating RegExp in analyze loop)
    this.compiledPatterns = this.builtinPatterns.map(bp => {
      try { return { ...bp, regex: new RegExp(bp.pattern.source, bp.pattern.flags) }; }
      catch (e) { return { ...bp, regex: null }; }
    });
    // LLM API config (optional, user provides key + endpoint)
    this.llmConfig = null;
    // Enhanced: structural pattern system for context-aware matching
    this.structuralPatterns = this._initStructuralPatterns();
    // Enhanced: phrase dictionary for multi-word keyword matching
    this.phraseDict = this._buildPhraseDict();
  }

  /**
   * Configure LLM API for enhanced analysis.
   * Supports OpenAI-compatible endpoints (OpenAI, DeepSeek, Moonshot, etc.)
   * @param {object|null} config
   * @param {string} config.apiKey
   * @param {string} config.endpoint
   * @param {string} [config.model] - default 'gpt-4o-mini'
   * @param {string|null} [config.customTemplate] - Custom request body JSON template with {{text}} placeholder
   * @param {string|null} [config.responsePath] - Dot-notation path to extract content from response (e.g. 'data.result')
   */
  configureLLM(config) {
    if (!config || !config.apiKey || !config.endpoint) {
      this.llmConfig = null;
      return;
    }
    this.llmConfig = {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      model: config.model || 'gpt-4o-mini',
      customTemplate: config.customTemplate || null,
      responsePath: config.responsePath || null
    };
  }

  /**
   * Extract a value from an object by a dot/bracket path string.
   * Examples: "choices[0].message.content", "data.result", "output.text"
   * @returns {*} The value at the path, or '' if not found
   */
  _extractByPath(obj, path) {
    if (!path || !obj) return '';
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    let current = obj;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return '';
      current = current[part];
    }
    return current ?? '';
  }

  // Helper: CJK + digits + common punctuation within a clause
  // \u4e00-\u9fff = CJK Unified Ideographs
  // \u3000-\u303f = CJK Symbols and Punctuation (includes 、etc)
  // We exclude sentence-ending: 。！？；… and clause-separating: ，
  _C = '\\u4e00-\\u9fff\\u3000-\\u3003\\u3005-\\u303f\\uff00-\\uffef';  // CJK chars for use in regex patterns
  _N = '0-9'; // digits

  _initPatterns() {
    // Load from external config (patterns-config.js), with fallback to inline patterns
    if (typeof window !== 'undefined' && window.MoxiPatternsConfig && window.MoxiPatternsConfig.builtinPatterns) {
      return window.MoxiPatternsConfig.builtinPatterns;
    }
    // Fallback: minimal pattern set if config not loaded
    console.warn('[Moxi] patterns-config.js not loaded, using fallback patterns');
    return [
      {pattern: /因为[\u4e00-\u9fff，]{1,20}所以/g, level: 3, desc_zh: '因为……所以', desc_en: '因为……所以'},
      {pattern: /虽然[\u4e00-\u9fff，]{1,20}但是/g, level: 3, desc_zh: '虽然……但是', desc_en: '虽然……但是'},
      {pattern: /[\u4e00-\u9fff]{1,10}得[\u4e00-\u9fff]{1,10}/g, level: 3, desc_zh: '程度补语（…得…）', desc_en: 'Degree complement (…得…)'},
      {pattern: /被(?=[\u4e00-\u9fff])/g, level: 2, desc_zh: '被字句（被）', desc_en: '被-construction (被)'},
      {pattern: /把(?=[\u4e00-\u9fff])/g, level: 2, desc_zh: '把字句（把）', desc_en: '把-construction (把)'},
    ];
  }

  /**
   * Structural Patterns - Context-aware multi-token matching.
   * Uses head-tail gap matching for structures that simple regex can't handle.
   * 
   * Each pattern: {
   *   head: string to anchor the match start,
   *   tail: string to anchor the match end,
   *   gap: {min, max} chars allowed between head and tail,
   *   exclude: chars that break the match (gap must not contain these),
   *   level, desc_zh, desc_en
   * }
   */
  _initStructuralPatterns() {
    // Load from external config (patterns-config.js), with fallback
    if (typeof window !== 'undefined' && window.MoxiPatternsConfig && window.MoxiPatternsConfig.structuralPatterns) {
      return window.MoxiPatternsConfig.structuralPatterns;
    }
    console.warn('[Moxi] patterns-config.js not loaded, using empty structural patterns');
    return [];
  }

  /**
   * Match structural patterns in text.
   * Uses head-tail gap matching with context awareness.
   */
  _matchStructuralPatterns(text, lang) {
    const matches = [];
    for (const sp of this.structuralPatterns) {
      let searchFrom = 0;
      while (true) {
        const headIdx = text.indexOf(sp.head, searchFrom);
        if (headIdx === -1) break;
        
        const afterHead = headIdx + sp.head.length;
        const maxEnd = Math.min(afterHead + sp.gap.max + sp.tail.length, text.length);
        
        // Look for tail within the gap range (min to max chars after head)
        let tailIdx = -1;
        for (let i = afterHead + sp.gap.min; i <= maxEnd - sp.tail.length; i++) {
          if (text.substring(i, i + sp.tail.length) === sp.tail) {
            tailIdx = i;
            break;
          }
        }
        
        if (tailIdx !== -1) {
          // Check that the gap doesn't contain excluded characters
          const gapContent = text.substring(afterHead, tailIdx);
          const hasExcluded = [...sp.exclude].some(ch => gapContent.includes(ch));
          
          if (!hasExcluded) {
            const fullMatch = text.substring(headIdx, tailIdx + sp.tail.length);
            matches.push({
              pattern: fullMatch,
              grammarPoint: lang === 'zh' ? sp.desc_zh : sp.desc_en,
              level: sp.level,
              position: headIdx,
              source: 'structural',
              gpId: ''
            });
          }
        }
        searchFrom = afterHead;
      }
    }
    return matches;
  }

  /**
   * Build a phrase dictionary from grammar data examples and names.
   * Enables matching of multi-word phrases from examples + time/grammar phrases.
   */
  _buildPhraseDict() {
    const phrases = {};
    
    // ═══ 时间短语 ═══
    const timePhrases = {
      '当天': { level: 5, grammarPoint: '时间表达（当天）', grammarPointEn: 'Time expression (当天)' },
      '那天': { level: 5, grammarPoint: '时间表达（那天）', grammarPointEn: 'Time expression (那天)' },
      '那时': { level: 5, grammarPoint: '时间表达（那时）', grammarPointEn: 'Time expression (那时)' },
      '此时': { level: 5, grammarPoint: '时间表达（此时）', grammarPointEn: 'Time expression (此时)' },
      '此刻': { level: 5, grammarPoint: '时间表达（此刻）', grammarPointEn: 'Time expression (此刻)' },
      '那一刻': { level: 5, grammarPoint: '时间表达（那一刻）', grammarPointEn: 'Time expression (那一刻)' },
      '那时候': { level: 5, grammarPoint: '时间表达（那时候）', grammarPointEn: 'Time expression (那时候)' },
      '在此期间': { level: 5, grammarPoint: '时间表达（在此期间）', grammarPointEn: 'Time expression (在此期间)' },
      '在这之前': { level: 5, grammarPoint: '时间表达（在这之前）', grammarPointEn: 'Time expression (在这之前)' },
      '在这之后': { level: 5, grammarPoint: '时间表达（在这之后）', grammarPointEn: 'Time expression (在这之后)' },
      '从那时起': { level: 3, grammarPoint: '时间起点（从那时起）', grammarPointEn: 'Time starting point (从那时起)' },
      '从那时开始': { level: 3, grammarPoint: '时间起点（从那时开始）', grammarPointEn: 'Time starting point (从那时开始)' },
      '到目前为止': { level: 5, grammarPoint: '时间表达（到目前为止）', grammarPointEn: 'Time expression (到目前为止)' },
      '迄今为止': { level: 5, grammarPoint: '时间表达（迄今为止）', grammarPointEn: 'Time expression (迄今为止)' },
      '时至今日': { level: 5, grammarPoint: '时间表达（时至今日）', grammarPointEn: 'Time expression (时至今日)' },
      '与此同时': { level: 5, grammarPoint: '并存（与此同时）', grammarPointEn: 'Co-occurrence (与此同时)' },
      '自…以来': { level: 5, grammarPoint: '时间结构（自…以来）', grammarPointEn: 'Time structure (自…以来)' },
      '自…起': { level: 5, grammarPoint: '时间结构（自…起）', grammarPointEn: 'Time structure (自…起)' },
      '自…以后': { level: 5, grammarPoint: '时间结构（自…以后）', grammarPointEn: 'Time structure (自…以后)' },
    };
    Object.assign(phrases, timePhrases);

    // ═══ 书面语 / 话语标记 ═══
    const writtenPhrases = {
      '换句话说': { level: 4, grammarPoint: '话语标记', grammarPointEn: 'Discourse marker' },
      '也就是说': { level: 4, grammarPoint: '话语标记', grammarPointEn: 'Discourse marker' },
      '具体来说': { level: 4, grammarPoint: '具体化标记', grammarPointEn: 'Specification marker' },
      '确切地说': { level: 4, grammarPoint: '具体化标记', grammarPointEn: 'Specification marker' },
      '举例来说': { level: 4, grammarPoint: '话语标记', grammarPointEn: 'Discourse marker' },
      '不可否认': { level: 5, grammarPoint: '强调断言', grammarPointEn: 'Emphatic assertion' },
      '毋庸置疑': { level: 6, grammarPoint: '评价表达', grammarPointEn: 'Evaluation expression' },
      '无可厚非': { level: 6, grammarPoint: '评价表达', grammarPointEn: 'Evaluation expression' },
      '不言而喻': { level: 6, grammarPoint: '评价表达', grammarPointEn: 'Evaluation expression' },
      '不足为奇': { level: 6, grammarPoint: '评价表达', grammarPointEn: 'Evaluation expression' },
      '归根结底': { level: 6, grammarPoint: '总结标记', grammarPointEn: 'Summary marker' },
      '总而言之': { level: 6, grammarPoint: '总结标记', grammarPointEn: 'Summary marker' },
      '综上所述': { level: 6, grammarPoint: '总结标记', grammarPointEn: 'Summary marker' },
      '由此可见': { level: 6, grammarPoint: '推论标记', grammarPointEn: 'Inference marker' },
      '由此可知': { level: 6, grammarPoint: '推论标记', grammarPointEn: 'Inference marker' },
      '基于此': { level: 6, grammarPoint: '基于', grammarPointEn: 'Based on' },
      '值得注意的是': { level: 5, grammarPoint: '话语标记', grammarPointEn: 'Discourse marker' },
      '需要指出的是': { level: 5, grammarPoint: '话语标记', grammarPointEn: 'Discourse marker' },
    };
    Object.assign(phrases, writtenPhrases);

    // ═══ 固定搭配 / 成语式表达 ═══
    const fixedPhrases = {
      '忍不住': { level: 3, grammarPoint: '情态（忍不住）', grammarPointEn: 'Cannot help (忍不住)' },
      '不得不': { level: 3, grammarPoint: '双重否定', grammarPointEn: 'Double negation' },
      '来不及': { level: 3, grammarPoint: '来不及', grammarPointEn: 'Too late' },
      '来得及': { level: 3, grammarPoint: '来得及', grammarPointEn: 'In time' },
      '值得': { level: 3, grammarPoint: '值得', grammarPointEn: 'Worth' },
      '没想到': { level: 5, grammarPoint: '反预期（没想到）', grammarPointEn: 'Unexpected (没想到)' },
      '出乎意料': { level: 5, grammarPoint: '反预期', grammarPointEn: 'Unexpected' },
      '相比之下': { level: 4, grammarPoint: '比较（相比之下）', grammarPointEn: 'Comparative (相比之下)' },
      '正因如此': { level: 5, grammarPoint: '因果（正因如此）', grammarPointEn: 'Causal (正因如此)' },
      '正因为如此': { level: 5, grammarPoint: '因果（正因为如此）', grammarPointEn: 'Causal (正因为如此)' },
      '尽管如此': { level: 5, grammarPoint: '让步总结', grammarPointEn: 'Concessive summary' },
      '即使如此': { level: 5, grammarPoint: '让步总结', grammarPointEn: 'Concessive summary' },
      '所谓的': { level: 5, grammarPoint: '话语标记（所谓的）', grammarPointEn: 'Discourse marker (所谓的)' },
      '所谓的自由': { level: 5, grammarPoint: '话语标记（所谓的）', grammarPointEn: 'Discourse marker (所谓的)' },
    };
    Object.assign(phrases, fixedPhrases);

    // Extract key phrases from grammar data examples (longer phrases first for priority)
    for (const gp of this.grammarData) {
      if (!gp.examples) continue;
      for (const ex of gp.examples) {
        // Skip example sentences that are too long or contain sentence-ending punctuation
        if (ex.length > 20 || /[。？！？…]/.test(ex)) continue;
        // Extract 2-6 char Chinese phrases from examples
        const chunks = ex.match(/[\u4e00-\u9fff]{2,6}/g) || [];
        for (const chunk of chunks) {
          if (!(chunk in phrases) || gp.level < phrases[chunk].level) {
            phrases[chunk] = {
              level: gp.level,
              grammarPoint: gp.name.split('：')[0],
              grammarPointEn: gp.name_en ? gp.name_en.split(':')[0] : gp.name.split('：')[0],
              gpId: gp.id
            };
          }
        }
      }
    }
    return phrases;
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
   * Lightweight Forward Maximum Match (FMM) segmenter.
   * Uses phraseDict as dictionary for zero-dependency segmentation.
   * Returns array of { w: word, pos: position, len: length }.
   */
  _segment(text) {
    const dict = this.phraseDict;
    const maxLen = 8;
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      let matched = false;
      for (let len = Math.min(maxLen, text.length - i); len >= 2; len--) {
        const word = text.substring(i, i + len);
        if (dict[word]) {
          tokens.push({ w: word, pos: i, len });
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        tokens.push({ w: text[i], pos: i, len: 1 });
        i++;
      }
    }
    return tokens;
  }

  /**
   * Analyze a Chinese text for grammar points (local, no API).
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

    // Phase 1: Match built-in regex patterns (pre-compiled)
    for (const bp of this.compiledPatterns) {
      if (!bp.regex) continue;
      try {
        const regex = bp.regex;
        regex.lastIndex = 0; // Reset for each text
        let m;
        while ((m = regex.exec(text)) !== null) {
          const matched = m[0];
          // Skip "得" matches that are actually non-complement words (觉得/懂得/获得 etc.)
          if (matched.includes('得') && GrammarAnalyzer.NON_COMPLEMENT.some(w => matched.includes(w))) {
            if (matched.length === 0) regex.lastIndex++; continue;
          }
          result.matches.push({
            pattern: matched,
            grammarPoint: lang === 'zh' ? bp.desc_zh : bp.desc_en,
            level: bp.level,
            position: m.index,
            source: 'builtin',
            gpId: ''
          });
          // Prevent infinite loops on zero-length matches
          if (matched.length === 0) regex.lastIndex++;
        }
      } catch (e) { /* skip invalid patterns */ }
    }

    // Phase 2: Match structural patterns (context-aware head-tail matching)
    const structuralMatches = this._matchStructuralPatterns(text, lang);
    result.matches.push(...structuralMatches);

    // Phase 3: Match database keywords
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

    // Phase 4: Match phrase dictionary (multi-word phrases from examples + time expressions)
    for (const [phrase, info] of Object.entries(this.phraseDict)) {
      // Skip very short phrases already covered by keyword index
      if (phrase.length <= 1) continue;
      const key = (info.gpId || '') + phrase;
      if (seen.has(key)) continue;
      
      let idx = text.indexOf(phrase);
      if (idx !== -1) {
        seen.add(key);
        result.matches.push({
          pattern: phrase,
          grammarPoint: lang === 'zh' ? info.grammarPoint : (info.grammarPointEn || info.grammarPoint),
          level: info.level,
          position: idx,
          source: 'phrase',
          gpId: info.gpId || ''
        });
      }
    }

    // Phase 5: Remove overlapping matches with source priority
    // Source priority: phrase(4) > structural(3) > builtin(2) > database(1)
    const SOURCE_PRIORITY = { phrase: 4, structural: 3, builtin: 2, database: 1 };
    const srcPrio = (m) => SOURCE_PRIORITY[m.source] || 0;
    // Strategy: Sort by position → source priority desc → length desc → level desc.
    // Overlap resolution:
    //   - If two matches have DIFFERENT levels, BOTH can coexist (different grammar layers)
    //   - If same level + overlap: keep higher source priority, then longer
    result.matches.sort((a, b) => a.position - b.position || srcPrio(b) - srcPrio(a) || b.pattern.length - a.pattern.length || b.level - a.level);
    const filtered = [];
    for (let i = 0; i < result.matches.length; i++) {
      const m = result.matches[i];
      let dominated = false;
      for (let j = 0; j < filtered.length; j++) {
        const f = filtered[j];
        const fStart = f.position, fEnd = f.position + f.pattern.length;
        const mStart = m.position, mEnd = m.position + m.pattern.length;
        const overlap = Math.max(0, Math.min(fEnd, mEnd) - Math.max(fStart, mStart));
        const shorterLen = Math.min(f.pattern.length, m.pattern.length);

        // No overlap at all — keep both
        if (overlap === 0) continue;

        // Different levels → allow coexistence (different grammar layers)
        if (f.level !== m.level) continue;

        // Same level: higher source priority wins
        const fP = srcPrio(f), mP = srcPrio(m);
        if (fP > mP) { dominated = true; break; }
        if (mP > fP) { filtered[j] = m; dominated = true; break; }

        // Same level + same source priority: if one fully contains the other, keep the longer
        if (mStart >= fStart && mEnd <= fEnd && m.pattern.length < f.pattern.length) { dominated = true; break; }
        if (fStart >= mStart && fEnd <= mEnd && f.pattern.length < m.pattern.length) { filtered[j] = m; dominated = true; break; }

        // Same level + heavy overlap (>50% of shorter): keep the longer one
        if (overlap > shorterLen * 0.5) {
          if (m.pattern.length >= f.pattern.length) { filtered[j] = m; }
          dominated = true; break;
        }
      }
      if (!dominated) filtered.push(m);
    }
    result.matches = filtered;

    // Phase 6: Calculate distribution
    for (const m of result.matches) {
      result.levelDistribution[m.level] = (result.levelDistribution[m.level] || 0) + 1;
    }

    if (result.matches.length > 0) {
      const levels = result.matches.map(m => m.level);
      result.maxLevel = Math.max(...levels);
      result.avgLevel = Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10;
    }

    result.suggestedLevel = this._suggestLevel(result);
    result.suggestions = this._generateSuggestions(result, lang);
    return result;
  }

  /**
   * LLM-assisted analysis. Sends text to an OpenAI-compatible API
   * for deeper grammar identification. Returns additional matches.
   * Falls back gracefully if API is unavailable.
   */
  async analyzeWithLLM(text, lang = 'zh') {
    // Guard: reject extremely long inputs to prevent browser hang
    if (text.length > 10000) {
      const localResult = this.analyze(text, lang);
      localResult.llmUsed = false;
      localResult.llmNote = lang === 'zh'
        ? `⚠️ 文本过长（${text.length} 字），仅使用本地分析。建议分段分析。`
        : `⚠️ Text too long (${text.length} chars). Local analysis only. Please split into segments.`;
      return localResult;
    }

    // First run local analysis
    const localResult = this.analyze(text, lang);

    if (!this.llmConfig) {
      localResult.llmUsed = false;
      localResult.llmNote = lang === 'zh'
        ? '💡 提示：可配置 LLM API 获得更精确的语法分析（覆盖 >90% 语法点）'
        : '💡 Tip: Configure LLM API for more precise grammar analysis (>90% coverage)';
      return localResult;
    }

    try {
      const systemPrompt = lang === 'zh'
        ? `# 角色
你是一位精通《国际中文教育中文水平等级标准》(GF 0025-2021) 的中文语法分析引擎。你的任务是对用户提交的中文文本进行逐句扫描，识别出所有语法点并标注等级。

# 等级判定依据（1-6级）
该标准将语法分为两大板块、六大语法类别，各等级递进关系如下：

## 语法等级速查
- **1级**：基础词类（人称/指示/疑问代词、基本能愿动词、程度副词"很/非常/太"、否定词"不/没"、量词"个/本/杯"、方位词"上/里/前"）+ 基本句式（"是"字句、"有"字句、简单存现句）+ 基本助词（"的/了/着"）+ 基本介词（"在/从/跟"）
- **2级**：时间表达（"…的时候/以前/以后"、动态助词"过"）+ 比较句（"比"字句）+ 连动句、兼语句 + 连词（"因为…所以/如果…就/虽然…但是"）+ 补语入门（简单结果补语"到/见/完"）
- **3级**："把"字句 + "被"字句入门 + 趋向补语（"起来/下去/出来/过来"）+ 可能补语（"不了/得完"）+ 程度补语（"…极了/得很"）+ 持续体"着"+ 时量补语 + 复杂定语/状语 + 特殊句式（"连…都/也"）
- **4级**：复杂"把/被"句式 + 状态补语（"V得+Adj"）+ 复杂趋向补语 + 情态补语 + 使动/被动深层用法 + "是…的"强调句 + 反问句 + 程度补语深化 + 抽象关联词（"无论…都/即使…也"）
- **5级**：强调句式（"…的是/倒是"）+ 插入语 + 复杂复句（让步/假设/条件）+ 固定格式（"与其…不如/不是…而是/之所以…是因为"）+ "有"+V（非领属）+ 成语/四字格
- **6级**：书面语语法（"以/于/则/亦/且/尚"）+ 古汉语残留（"乃/之/其/矣"）+ 紧缩复句 + 复杂修辞结构 + 高级固定格式（"鉴于/诚然/毋庸讳言"）

## 关键原则
1. **pattern 必须是原文精确子串**——逐字符匹配，不能改写、省略或重新组合
2. **position 是 pattern 在原文中的起始字符索引**（从 0 开始计数）
3. **一个词语可出现在多个语法点中**——例如"所谓的"既是话语标记也是固定格式，应分开标注
4. **pattern 长度要体现语法结构**——例如"把书放在桌子上"比"把"更有分析价值
5. **宁可多标不可漏标**——但不要将普通名词/动词误标为语法点
6. **等级取最高归属**——当同一 pattern 可归属多级时，取其在标准中的最高等级

## 不应标注的内容
- 单独的人名、地名、普通名词（除非作为语法结构的组成部分）
- 无特殊语法功能的形容词和动词
- 标点符号

## 输出格式
仅返回 JSON 数组，每个元素：
{"pattern":"原文片段","grammarPoint":"语法点名称","level":等级数字,"position":起始位置}

示例输入："他先把作业写完了，然后出去玩了。"
示例输出：
[{"pattern":"先把作业写完了","grammarPoint":"把字句","level":3,"position":1},{"pattern":"然后","grammarPoint":"关联词","level":2,"position":8},{"pattern":"出去了","grammarPoint":"趋向补语","level":3,"position":10},{"pattern":"玩了","grammarPoint":"动态助词：了","level":1,"position":12}]`
        : `# Role
You are a Chinese grammar analysis engine specializing in GF 0025-2021 (International Chinese Language Education Grammar Standard). Scan the submitted text sentence by sentence, identify ALL grammar points, and rate each at levels 1-6.

# Level Guidelines (HSK 1-6)
- **Level 1**: Basic word classes (personal/demonstrative/interrogative pronouns, basic modal verbs, degree adverbs "很/非常/太", negation "不/没", measure words "个/本/杯", locatives "上/里/前") + basic sentence patterns ("是" sentence, "有" sentence, simple existential) + basic particles ("的/了/着") + basic prepositions ("在/从/跟")
- **Level 2**: Time expressions ("…的时候/以前/以后"), aspect particle "过" + "比" comparative + serial verb / pivotal sentences + conjunctions ("因为…所以/如果…就/虽然…但是") + basic resultative complements ("到/见/完")
- **Level 3**: "把" sentences + "被" sentences (introductory) + directional complements ("起来/下去/出来") + potential complements ("不了/得完") + degree complements ("…极了/得很") + durative aspect "着" + time-measure complements + complex attributives/adverbials + special patterns ("连…都/也")
- **Level 4**: Complex "把/被" constructions + state complements ("V得+Adj") + complex directional complements + "是…的" cleft sentences + rhetorical questions + complex correlatives ("无论…都/即使…也")
- **Level 5**: Emphasis patterns ("…的是/倒是") + insert phrases + complex compound sentences + fixed formats ("与其…不如/不是…而是/之所以…是因为") + idioms/four-character expressions
- **Level 6**: Literary grammar ("以/于/则/亦/且/尚") + classical remnants ("乃/之/其/矣") + contracted complex sentences + advanced rhetorical structures

## Key Rules
1. **pattern must be an exact substring** of the original text — character-by-character match
2. **position** is the starting character index (0-based)
3. **One word can belong to multiple grammar points** — e.g., "所谓的" is both a discourse marker and a fixed format; mark both
4. **Pattern length should reflect grammatical structure** — e.g., "把书放在桌子上" is more informative than just "把"
5. **When uncertain, mark it** — but don't label ordinary nouns/verbs as grammar points
6. **Assign the highest applicable level** when a pattern fits multiple levels

## Do NOT mark
- Standalone names, places, or common nouns (unless part of a grammatical structure)
- Adjectives and verbs with no special grammatical function
- Punctuation

## Output Format
Return ONLY a JSON array:
[{"pattern":"exact text","grammarPoint":"grammar point name","level":1-6,"position":starting index}]

Example input: "他先把作业写完了，然后出去玩了。"
Example output:
[{"pattern":"先把作业写完了","grammarPoint":"把 sentence","level":3,"position":1},{"pattern":"然后","grammarPoint":"conjunction","level":2,"position":8},{"pattern":"出去了","grammarPoint":"directional complement","level":3,"position":10},{"pattern":"玩了","grammarPoint":"aspect particle 了","level":1,"position":12}]`;

      // Build request body
      let requestBody;
      if (this.llmConfig.customTemplate) {
        // Custom template: replace {{text}} with user text, add system prompt as {{system_prompt}}
        const template = this.llmConfig.customTemplate
          .replace(/\{\{text\}\}/g, text)
          .replace(/\{\{system_prompt\}\}/g, systemPrompt);
        try {
          requestBody = JSON.parse(template);
        } catch (e) {
          throw new Error('自定义请求模板 JSON 解析失败: ' + e.message);
        }
      } else {
        // Default OpenAI format
        requestBody = {
          model: this.llmConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
        };
      }

      // Add timeout via AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      let response;
      try {
        response = await fetch(this.llmConfig.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.llmConfig.apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        let errMsg = `HTTP ${response.status}`;
        if (response.status === 401) errMsg += ': API Key 无效或已过期';
        else if (response.status === 429) errMsg += ': 请求频率过高，请稍后再试';
        else if (response.status === 400) errMsg += ': 请求参数错误' + (errBody ? ` (${errBody.slice(0, 100)})` : '');
        else if (response.status === 404) errMsg += ': API 地址不存在';
        else if (!response.status) errMsg = '网络连接失败，请检查 API 地址';
        throw new Error(errMsg);
      }

      const data = await response.json();

      // Extract content — use custom path or default OpenAI path
      let content = '';
      if (this.llmConfig.responsePath) {
        // Custom response path: supports dot notation like "data.result" or bracket notation like "choices[0].message.content"
        content = this._extractByPath(data, this.llmConfig.responsePath);
      } else {
        content = data.choices?.[0]?.message?.content || '';
      }
      if (typeof content !== 'string') content = String(content);

      if (!content.trim()) throw new Error('LLM 返回了空内容');

      // Parse LLM response — robust JSON extraction
      let llmMatches = [];
      const tryParse = (str) => {
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) return parsed;
          // Could be wrapped: {"matches": [...], "results": [...], "data": [...]}
          return parsed.matches || parsed.results || parsed.data || parsed.grammar_points || [];
        } catch { return null; }
      };

      // Try 1: direct parse
      llmMatches = tryParse(content);
      if (!llmMatches) {
        // Try 2: extract JSON array from markdown code block
        const codeBlockMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (codeBlockMatch) llmMatches = tryParse(codeBlockMatch[1]);
      }
      if (!llmMatches) {
        // Try 3: find any JSON array in the response
        const arrMatch = content.match(/\[[\s\S]*\]/);
        if (arrMatch) llmMatches = tryParse(arrMatch[0]);
      }
      if (!llmMatches || !Array.isArray(llmMatches)) {
        llmMatches = [];
      }

      // Validate and filter matches
      llmMatches = llmMatches.filter(m => m.pattern && m.grammarPoint && m.level).map(m => ({
        pattern: String(m.pattern),
        grammarPoint: String(m.grammarPoint),
        level: Math.max(1, Math.min(6, parseInt(m.level) || 1)),
        position: typeof m.position === 'number' ? m.position : -1,
        gpId: m.gpId || ''
      }));

      if (llmMatches.length === 0) {
        throw new Error('LLM 未返回有效的语法点数据');
      }

      // Merge LLM matches with local results
      const localPatterns = new Set(localResult.matches.map(m => m.pattern + m.position));

      for (const lm of llmMatches) {
        if (lm.pattern && lm.grammarPoint && lm.level) {
          // Position validation: verify pattern is actually a substring of the original text
          let validPos = typeof lm.position === 'number' ? lm.position : -1;
          if (validPos < 0 || !text.includes(lm.pattern)) {
            // Try to find the pattern in text
            const found = text.indexOf(lm.pattern);
            if (found !== -1) {
              validPos = found;
            } else {
              continue; // Skip patterns not found in text
            }
          } else if (text.substring(validPos, validPos + lm.pattern.length) !== lm.pattern) {
            // Position doesn't match — try to find correct position
            const found = text.indexOf(lm.pattern);
            validPos = found !== -1 ? found : -1;
            if (validPos < 0) continue;
          }

          const key = lm.pattern + validPos;
          if (!localPatterns.has(key)) {
            localResult.matches.push({
              pattern: lm.pattern,
              grammarPoint: lm.grammarPoint,
              level: Math.max(1, Math.min(6, parseInt(lm.level) || 1)),
              position: validPos,
              source: 'llm',
              gpId: lm.gpId || ''
            });
            localPatterns.add(key);
          }
        }
      }

      // Re-run Phase 5 overlap resolution on merged results (with source priority)
      const llmSrcPrio = (m) => ({ phrase: 4, structural: 3, builtin: 2, database: 1, llm: 5 }[m.source] || 0);
      localResult.matches.sort((a, b) => a.position - b.position || llmSrcPrio(b) - llmSrcPrio(a) || b.pattern.length - a.pattern.length || b.level - a.level);
      const mergedFiltered = [];
      for (let i = 0; i < localResult.matches.length; i++) {
        const m = localResult.matches[i];
        let dominated = false;
        for (let j = 0; j < mergedFiltered.length; j++) {
          const f = mergedFiltered[j];
          const fStart = f.position, fEnd = f.position + f.pattern.length;
          const mStart = m.position, mEnd = m.position + m.pattern.length;
          if (mStart < 0) continue; // Skip invalid positions
          const overlap = Math.max(0, Math.min(fEnd, mEnd) - Math.max(fStart, mStart));
          const shorterLen = Math.min(f.pattern.length, m.pattern.length);
          if (overlap === 0) continue;
          if (f.level !== m.level) continue; // Different levels → coexist
          // Source priority: llm > phrase > structural > builtin > database
          const fp = llmSrcPrio(f), mp = llmSrcPrio(m);
          if (fp > mp) { dominated = true; break; }
          if (mp > fp) { mergedFiltered[j] = m; dominated = true; break; }
          if (mStart >= fStart && mEnd <= fEnd && m.pattern.length < f.pattern.length) { dominated = true; break; }
          if (fStart >= mStart && fEnd <= mEnd && f.pattern.length < m.pattern.length) { mergedFiltered[j] = m; dominated = true; break; }
          if (overlap > shorterLen * 0.5) {
            if (m.pattern.length >= f.pattern.length) { mergedFiltered[j] = m; }
            dominated = true; break;
          }
        }
        if (!dominated) mergedFiltered.push(m);
      }
      localResult.matches = mergedFiltered;

      // Re-sort, recalculate
      localResult.matches.sort((a, b) => a.position - b.position);
      localResult.levelDistribution = {};
      for (const m of localResult.matches) {
        localResult.levelDistribution[m.level] = (localResult.levelDistribution[m.level] || 0) + 1;
      }
      if (localResult.matches.length > 0) {
        const levels = localResult.matches.map(m => m.level);
        localResult.maxLevel = Math.max(...levels);
        localResult.avgLevel = Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10;
      }
      localResult.suggestedLevel = this._suggestLevel(localResult);
      localResult.suggestions = this._generateSuggestions(localResult, lang);
      localResult.llmUsed = true;
      localResult.llmNote = lang === 'zh'
        ? `🤖 LLM 辅助分析完成，共识别 ${localResult.matches.length} 处语法点`
        : `🤖 LLM-assisted analysis complete: ${localResult.matches.length} grammar points found`;

    } catch (e) {
      localResult.llmUsed = false;
      localResult.llmNote = (lang === 'zh' ? '⚠️ LLM 分析失败：' : '⚠️ LLM analysis failed: ') + e.message;
    }

    return localResult;
  }

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

  _generateSuggestions(result, lang) {
    const suggestions = [];
    if (!result.matches.length) {
      suggestions.push(lang === 'zh'
        ? '⚠️ 未检测到明确的语法点，请提供更长的文本以获得准确分析。'
        : '⚠️ No clear grammar points detected. Please provide a longer text for accurate analysis.');
      return suggestions;
    }
    const high = result.matches.filter(m => m.level >= 4);
    if (high.length > 0) {
      const pts = [...new Set(high.map(m => m.grammarPoint))].slice(0, 5);
      suggestions.push(lang === 'zh'
        ? `📌 检测到 ${high.length} 处中高级(HSK4-6)语法，涉及：${pts.join('、')}`
        : `📌 Found ${high.length} advanced (HSK4-6) grammar points: ${pts.join(', ')}`);
    }
    if (Object.keys(result.levelDistribution).length > 0) {
      const dominant = Object.entries(result.levelDistribution).sort((a, b) => b[1] - a[1])[0];
      const lvl = parseInt(dominant[0]);
      suggestions.push(lang === 'zh'
        ? `📊 语法等级主要集中在 HSK${lvl}，占比 ${Math.round(dominant[1] / result.matches.length * 100)}%`
        : `📊 Grammar mainly concentrated at HSK${lvl}, ${Math.round(dominant[1] / result.matches.length * 100)}%`);
    }
    const unique = new Set(result.matches.map(m => m.grammarPoint));
    const richness = unique.size / result.sentenceCount;
    if (richness >= 3) suggestions.push(lang === 'zh' ? '✅ 语法丰富度：优秀' : '✅ Grammar richness: Excellent');
    else if (richness >= 1.5) suggestions.push(lang === 'zh' ? '📝 语法丰富度：良好' : '📝 Grammar richness: Good');
    else suggestions.push(lang === 'zh' ? '💬 语法丰富度：一般' : '💬 Grammar richness: Average');

    const sl = result.suggestedLevel;
    if (sl >= 5) suggestions.push(lang === 'zh'
      ? '🎓 文本含有大量高级语法，适合HSK5-6级/专业级学习者。'
      : '🎓 Text contains extensive advanced grammar, suitable for HSK 5-6 / professional learners.');
    else if (sl >= 3) suggestions.push(lang === 'zh'
      ? '📖 文本语法难度适中，适合HSK3-4级学习者。'
      : '📖 Text grammar difficulty is moderate, suitable for HSK 3-4 learners.');
    else suggestions.push(lang === 'zh'
      ? '📗 文本语法较为基础，适合HSK1-2级初学者。'
      : '📗 Text grammar is basic, suitable for HSK 1-2 beginners.');

    return suggestions;
  }
}
