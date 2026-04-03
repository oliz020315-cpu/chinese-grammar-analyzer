/**
 * @module GrammarAnalyzer
 * @description 中文语法分析引擎 v5.2
 * 基于《国际中文教育中文水平等级标准》(GF 0025-2021)
 *
 * 4层匹配架构:
 *   Phase 1: Built-in 正则 patterns (200+ 条，含成语/四字格)
 *   Phase 1.5: 分词驱动匹配 (HSK词汇表 11000+ 词)
 *   Phase 2: Structural Patterns (head-tail gap 上下文感知)
 *   Phase 2.5: 句子级模式 (祈使句、感叹句、"是…的"强调句等)
 *   Phase 2.7: 助词语境分析 (的/得/地 精准区分)
 *   Phase 3: Database 关键词索引 (从语法点名称提取)
 *   Phase 4: Phrase Dictionary (从例句提取 + 时间/固定短语)
 *   Phase 5: 重叠消解 (不同等级允许共存，同等级按 source 优先级)
 *
 * LLM 辅助: 支持 OpenAI 兼容 API (DeepSeek/Moonshot/Qwen/GLM 等)
 *
 * @author 墨析 (Moxi)
 * @license MIT
 */

/**
 * 语法点数据条目 (来自 GRAMMAR_DATA)
 * @typedef {Object} GrammarPoint
 * @property {string} id - 语法点编号 (如 "三01")
 * @property {string} name - 语法点名称
 * @property {string} section - 所属分类路径
 * @property {number} level - HSK 等级 (1-7)
 * @property {string[]} examples - 例句列表
 * @property {string} [name_en] - 英文名称 (可选)
 */

/**
 * 匹配结果
 * @typedef {Object} MatchResult
 * @property {string} pattern - 匹配到的原文片段
 * @property {string} grammarPoint - 语法点名称 (中文)
 * @property {string} [grammarPointEn] - 语法点名称 (英文)
 * @property {number} level - HSK 等级 (1-7)
 * @property {number} position - 在原文中的起始位置 (0-based)
 * @property {string} source - 匹配来源 (builtin|structural|database|phrase|segment-phrase|segment-hsk|sentence-pattern|context-particle|llm)
 * @property {string} [gpId] - 关联的语法点ID (可选)
 */

/**
 * 分析结果
 * @typedef {Object} AnalysisResult
 * @property {string} text - 原文文本
 * @property {number} charCount - 字符数
 * @property {number} sentenceCount - 句子数
 * @property {MatchResult[]} matches - 匹配结果数组
 * @property {Object.<number, number>} levelDistribution - 等级分布 {level: count}
 * @property {number} maxLevel - 最高等级
 * @property {number} avgLevel - 平均等级
 * @property {number} suggestedLevel - 建议等级 (基于加权频率)
 * @property {string[]} suggestions - 学习建议
 * @property {boolean} [llmUsed] - 是否使用了 LLM 分析
 * @property {string} [llmNote] - LLM 分析备注信息
 */

/**
 * 内置正则模式
 * @typedef {Object} BuiltinPattern
 * @property {RegExp} pattern - 正则表达式
 * @property {number} level - HSK 等级
 * @property {string} desc_zh - 中文描述
 * @property {string} desc_en - 英文描述
 */

/**
 * 结构化模式 (头尾间距匹配)
 * @typedef {Object} StructuralPattern
 * @property {string} head - 匹配锚点 (头部)
 * @property {string} tail - 匹配锚点 (尾部)
 * @property {{min: number, max: number}} gap - 头尾之间允许的字符数范围
 * @property {Set<string>} exclude - 中间不允许出现的字符集
 * @property {number} level - HSK 等级
 * @property {string} desc_zh - 中文描述
 * @property {string} desc_en - 英文描述
 */

/**
 * 短语字典条目
 * @typedef {Object} PhraseEntry
 * @property {number} level - HSK 等级
 * @property {string} grammarPoint - 语法点名称 (中文)
 * @property {string} grammarPointEn - 语法点名称 (英文)
 * @property {string} [gpId] - 关联的语法点ID (可选)
 */

/**
 * 分词 Token
 * @typedef {Object} SegmentToken
 * @property {string} w - 词文本
 * @property {number} pos - 起始位置
 * @property {number} len - 长度
 * @property {number} level - HSK 等级
 * @property {string} pos_tag - 词性标签
 */

/**
 * 句子
 * @typedef {Object} Sentence
 * @property {string} text - 句子文本 (含标点)
 * @property {number} start - 起始位置
 * @property {number} end - 结束位置
 */

/**
 * LLM 配置
 * @typedef {Object} LLMConfig
 * @property {string} apiKey - API 密钥
 * @property {string} endpoint - API 端点 URL
 * @property {string} model - 模型名称 (默认 'gpt-4o-mini')
 * @property {string|null} customTemplate - 自定义请求模板 (含 {{text}} 占位符)
 * @property {string|null} responsePath - 响应内容提取路径 (如 'choices[0].message.content')
 */

class GrammarAnalyzer {
  /**
   * 非补语词白名单——含"得"但不构成程度/状态补语结构的词。
   * 用于过滤误匹配，如"觉得/懂得/获得/值得"等。
   * @type {string[]}
   */
  static NON_COMPLEMENT = (typeof window !== 'undefined' && window.MoxiPatternsConfig)
    ? window.MoxiPatternsConfig.nonComplementWords
    : ['觉得', '懂得', '晓得', '获得', '取得', '赢得', '记得', '值得', '懒得', '免得', '博得'];

  /**
   * 创建语法分析引擎实例。
   * 初始化关键词索引、内置正则模式（预编译）、结构化模式、短语字典。
   * @param {GrammarPoint[]} grammarData - 语法点数据数组 (GRAMMAR_DATA)
   */
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
   * 通过点号/方括号路径字符串从嵌套对象中提取值。
   * 支持 "choices[0].message.content"、"data.result"、"output.text" 等格式。
   * @param {*} obj - 目标对象
   * @param {string} path - 点号/方括号路径字符串
   * @returns {*} 路径对应的值，未找到返回 ''
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

  /**
   * 初始化内置正则匹配模式。
   * 优先从外部配置 (window.MoxiPatternsConfig) 加载，否则使用回退的最小模式集。
   * @returns {BuiltinPattern[]} 内置正则模式数组
   */
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
   * 在文本中执行结构化模式匹配（头-尾间距匹配）。
   * 带跨句保护（拒绝跨越句末标点的匹配）和位置去重。
   * @param {string} text - 待分析文本
   * @param {'zh'|'en'} lang - 输出语言
   * @returns {MatchResult[]} 匹配结果数组 (source='structural')
   */
  _matchStructuralPatterns(text, lang) {
    const matches = [];
    const matchedPositions = new Set(); // Track matched character positions for dedup
    const SENTENCE_END = /[。！？!?…；;]/;
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
            // Cross-sentence guard: reject matches spanning sentence-ending punctuation
            if (!SENTENCE_END.test(fullMatch)) {
              // Dedup: check if any character position in this match is already taken
              let alreadyMatched = false;
              for (let p = headIdx; p < tailIdx + sp.tail.length; p++) {
                if (matchedPositions.has(p)) { alreadyMatched = true; break; }
              }
              if (!alreadyMatched) {
                matches.push({
                  pattern: fullMatch,
                  grammarPoint: lang === 'zh' ? sp.desc_zh : sp.desc_en,
                  level: sp.level,
                  position: headIdx,
                  source: 'structural',
                  gpId: ''
                });
                // Mark positions as matched
                for (let p = headIdx; p < tailIdx + sp.tail.length; p++) {
                  matchedPositions.add(p);
                }
              }
            }
          }
        }
        searchFrom = afterHead;
      }
    }
    return matches;
  }

  /**
   * 构建短语字典。包含基础词汇、时间短语、书面语标记、固定搭配，
   * 以及从语法数据例句中自动提取的短语。
   * @returns {Object.<string, PhraseEntry>} 短语字典 (key=短语, value=条目)
   */
  _buildPhraseDict() {
    const phrases = {};
    
    // ═══ 1-2级基础词汇（HSK词汇补充） ═══
    const basicWords = {
      // ── 人称代词 ──
      '自己': { level: 1, grammarPoint: '反身代词（自己）', grammarPointEn: 'Reflexive pronoun (自己)' },
      '大家': { level: 1, grammarPoint: '代词（大家）', grammarPointEn: 'Pronoun (大家)' },
      '别人': { level: 2, grammarPoint: '代词（别人）', grammarPointEn: 'Pronoun (别人)' },

      // ── 时间词（高频日常） ──
      '昨天': { level: 1, grammarPoint: '时间词（昨天）', grammarPointEn: 'Time word (昨天)' },
      '今天': { level: 1, grammarPoint: '时间词（今天）', grammarPointEn: 'Time word (今天)' },
      '明天': { level: 1, grammarPoint: '时间词（明天）', grammarPointEn: 'Time word (明天)' },
      '后天': { level: 2, grammarPoint: '时间词（后天）', grammarPointEn: 'Time word (后天)' },
      '前天': { level: 2, grammarPoint: '时间词（前天）', grammarPointEn: 'Time word (前天)' },
      '早上': { level: 1, grammarPoint: '时间词（早上）', grammarPointEn: 'Time word (早上)' },
      '上午': { level: 1, grammarPoint: '时间词（上午）', grammarPointEn: 'Time word (上午)' },
      '中午': { level: 1, grammarPoint: '时间词（中午）', grammarPointEn: 'Time word (中午)' },
      '下午': { level: 1, grammarPoint: '时间词（下午）', grammarPointEn: 'Time word (下午)' },
      '晚上': { level: 1, grammarPoint: '时间词（晚上）', grammarPointEn: 'Time word (晚上)' },
      '这次': { level: 1, grammarPoint: '指示代词+时间（这次）', grammarPointEn: 'Demonstrative+time (这次)' },
      '那次': { level: 1, grammarPoint: '指示代词+时间（那次）', grammarPointEn: 'Demonstrative+time (那次)' },
      '下次': { level: 2, grammarPoint: '指示代词+时间（下次）', grammarPointEn: 'Demonstrative+time (下次)' },
      '上次': { level: 2, grammarPoint: '指示代词+时间（上次）', grammarPointEn: 'Demonstrative+time (上次)' },
      '每次': { level: 2, grammarPoint: '量词短语（每次）', grammarPointEn: 'Classifier phrase (每次)' },
      '现在': { level: 1, grammarPoint: '时间词（现在）', grammarPointEn: 'Time word (现在)' },
      '以后': { level: 2, grammarPoint: '时间词（以后）', grammarPointEn: 'Time word (以后)' },
      '以前': { level: 2, grammarPoint: '时间词（以前）', grammarPointEn: 'Time word (以前)' },
      '这时候': { level: 1, grammarPoint: '时间词（这时候）', grammarPointEn: 'Time word (这时候)' },
      '那时候': { level: 2, grammarPoint: '时间词（那时候）', grammarPointEn: 'Time word (那时候)' },

      // ── 高频名词（含语法功能）───
      '同学': { level: 1, grammarPoint: '名词（同学）', grammarPointEn: 'Noun (同学)' },
      '朋友': { level: 1, grammarPoint: '名词（朋友）', grammarPointEn: 'Noun (朋友)' },
      '老师': { level: 1, grammarPoint: '名词（老师）', grammarPointEn: 'Noun (老师)' },
      '学生': { level: 1, grammarPoint: '名词（学生）', grammarPointEn: 'Noun (学生)' },
      '东西': { level: 1, grammarPoint: '名词（东西）', grammarPointEn: 'Noun (东西)' },
      '地方': { level: 1, grammarPoint: '名词（地方）', grammarPointEn: 'Noun (地方)' },
      '时候': { level: 1, grammarPoint: '名词/时间（时候）', grammarPointEn: 'Noun/Time (时候)' },
      '问题': { level: 1, grammarPoint: '名词（问题）', grammarPointEn: 'Noun (问题)' },
      '事情': { level: 1, grammarPoint: '名词（事情）', grammarPointEn: 'Noun (事情)' },
      '办法': { level: 2, grammarPoint: '名词（办法）', grammarPointEn: 'Noun (办法)' },
      '意思': { level: 1, grammarPoint: '名词（意思）', grammarPointEn: 'Noun (意思)' },
      '名字': { level: 1, grammarPoint: '名词（名字）', grammarPointEn: 'Noun (名字)' },
      '样子': { level: 2, grammarPoint: '名词（样子）', grammarPointEn: 'Noun (样子)' },


      // ── "有"+形容词（评价）───
      '有意思': { level: 2, grammarPoint: '形容词评价（有意思）', grammarPointEn: 'Adjective evaluation (有意思)' },
      '有道理': { level: 3, grammarPoint: '形容词评价（有道理）', grammarPointEn: 'Adjective evaluation (有道理)' },
      '有礼貌': { level: 2, grammarPoint: '形容词评价（有礼貌）', grammarPointEn: 'Adjective evaluation (有礼貌)' },
      '有水平': { level: 3, grammarPoint: '形容词评价（有水平）', grammarPointEn: 'Adjective evaluation (有水平)' },
      '有经验': { level: 3, grammarPoint: '形容词评价（有经验）', grammarPointEn: 'Adjective evaluation (有经验)' },
      '有能力': { level: 3, grammarPoint: '形容词评价（有能力）', grammarPointEn: 'Adjective evaluation (有能力)' },
      '有名': { level: 2, grammarPoint: '形容词评价（有名）', grammarPointEn: 'Adjective evaluation (有名)' },
      '有用': { level: 2, grammarPoint: '形容词评价（有用）', grammarPointEn: 'Adjective evaluation (有用)' },
      '好吃': { level: 1, grammarPoint: '形容词（好吃）', grammarPointEn: 'Adjective (好吃)' },
      '好看': { level: 1, grammarPoint: '形容词（好看）', grammarPointEn: 'Adjective (好看)' },
      '好听': { level: 1, grammarPoint: '形容词（好听）', grammarPointEn: 'Adjective (好听)' },
      '好玩': { level: 1, grammarPoint: '形容词（好玩）', grammarPointEn: 'Adjective (好玩)' },

      // ── 高频形容词 ──
      '漂亮': { level: 1, grammarPoint: '形容词（漂亮）', grammarPointEn: 'Adjective (漂亮)' },
      '干净': { level: 1, grammarPoint: '形容词（干净）', grammarPointEn: 'Adjective (干净)' },
      '热闹': { level: 2, grammarPoint: '形容词（热闹）', grammarPointEn: 'Adjective (热闹)' },
      '辛苦': { level: 2, grammarPoint: '形容词（辛苦）', grammarPointEn: 'Adjective (辛苦)' },
      '厉害': { level: 2, grammarPoint: '形容词（厉害）', grammarPointEn: 'Adjective (厉害)' },

      // ── 口语表达（2级）───
      '好吧': { level: 2, grammarPoint: '口语表达（好吧）', grammarPointEn: 'Spoken expression (好吧)' },
      '行吧': { level: 2, grammarPoint: '口语表达（行吧）', grammarPointEn: 'Spoken expression (行吧)' },
      '算了': { level: 2, grammarPoint: '口语表达（算了）', grammarPointEn: 'Spoken expression (算了)' },
      '真的': { level: 1, grammarPoint: '副词（真的）', grammarPointEn: 'Adverb (真的)' },
      '真的吗': { level: 1, grammarPoint: '疑问（真的吗）', grammarPointEn: 'Question (真的吗)' },
    };
    Object.assign(phrases, basicWords);

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
      '就是说': { level: 3, grammarPoint: '话语标记', grammarPointEn: 'Discourse marker' },
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
      '现在看来': { level: 3, grammarPoint: '情态副词', grammarPointEn: 'Modal adverb' },
    };
    Object.assign(phrases, writtenPhrases);

    // ═══ 固定搭配 / 成语式表达 ═══
    const fixedPhrases = {
      '忍不住': { level: 3, grammarPoint: '情态（忍不住）', grammarPointEn: 'Cannot help (忍不住)' },
      '不得不': { level: 3, grammarPoint: '双重否定', grammarPointEn: 'Double negation' },
      '来不及': { level: 2, grammarPoint: '来不及', grammarPointEn: 'Too late' },
      '来得及': { level: 2, grammarPoint: '来得及', grammarPointEn: 'In time' },
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

    // ═══ v5.0 新增固定短语（来源：语法点检索表格） ═══
    const newFixedPhrases = {
      // ── 口语短语 ──
      '不一会儿': { level: 3, grammarPoint: '口语短语（不一会儿）', grammarPointEn: 'Spoken phrase (不一会儿)' },
      '一般来说': { level: 3, grammarPoint: '口语短语（一般来说）', grammarPointEn: 'Spoken phrase (一般来说)' },
      '说不定': { level: 3, grammarPoint: '情态副词（说不定）', grammarPointEn: 'Modal adverb (说不定)' },
      '看起来': { level: 2, grammarPoint: '情态副词（看起来）', grammarPointEn: 'Modal adverb (看起来)' },
      '看上去': { level: 2, grammarPoint: '情态副词（看上去）', grammarPointEn: 'Modal adverb (看上去)' },
      '用不着': { level: 3, grammarPoint: '固定短语（用不着）', grammarPointEn: 'Fixed phrase (用不着)' },
      '犯不着': { level: 4, grammarPoint: '固定短语（犯不着）', grammarPointEn: 'Fixed phrase (犯不着)' },
      '大不了': { level: 3, grammarPoint: '口语短语（大不了）', grammarPointEn: 'Spoken phrase (大不了)' },
      '算了吧': { level: 3, grammarPoint: '口语短语（算了）', grammarPointEn: 'Spoken phrase (算了)' },
      '得了吧': { level: 3, grammarPoint: '口语短语（得了吧）', grammarPointEn: 'Spoken phrase (得了吧)' },
      '不敢当': { level: 3, grammarPoint: '口语短语（不敢当）', grammarPointEn: 'Spoken phrase (不敢当)' },
      '不得了': { level: 3, grammarPoint: '口语短语（不得了）', grammarPointEn: 'Spoken phrase (不得了)' },
      '不怎么样': { level: 3, grammarPoint: '口语短语（不怎么样）', grammarPointEn: 'Spoken phrase (不怎么样)' },
      '那倒是': { level: 3, grammarPoint: '口语短语（那倒是）', grammarPointEn: 'Spoken phrase (那倒是)' },
      '实在没办法': { level: 3, grammarPoint: '口语短语（实在没办法）', grammarPointEn: 'Spoken phrase (实在没办法)' },
      '说干就干': { level: 3, grammarPoint: '口语短语（说干就干）', grammarPointEn: 'Spoken phrase (说干就干)' },
      '想来想去': { level: 3, grammarPoint: '口语短语（想来想去）', grammarPointEn: 'Spoken phrase (想来想去)' },
      '讨论来讨论去': { level: 4, grammarPoint: '口语短语（V来V去）', grammarPointEn: 'Spoken phrase (V来V去)' },
      '左思右想': { level: 4, grammarPoint: '固定短语（左思右想）', grammarPointEn: 'Fixed phrase (左思右想)' },
      '有说有笑': { level: 3, grammarPoint: '口语短语（有说有笑）', grammarPointEn: 'Spoken phrase (有说有笑)' },
      '莫名其妙': { level: 4, grammarPoint: '成语（莫名其妙）', grammarPointEn: 'Idiom (莫名其妙)' },

      // ── 情态 / 方式短语 ──
      '差不多': { level: 2, grammarPoint: '情态副词（差不多）', grammarPointEn: 'Modal adverb (差不多)' },
      '好不容易': { level: 3, grammarPoint: '口语短语（好不容易）', grammarPointEn: 'Spoken phrase (好不容易)' },
      '好容易': { level: 3, grammarPoint: '口语短语（好容易）', grammarPointEn: 'Spoken phrase (好容易)' },
      '不由得': { level: 4, grammarPoint: '情态短语（不由得）', grammarPointEn: 'Modal phrase (不由得)' },
      '只好': { level: 3, grammarPoint: '情态短语（只好）', grammarPointEn: 'Modal phrase (只好)' },
      '不得不说': { level: 4, grammarPoint: '双重否定', grammarPointEn: 'Double negation' },
      '不能不说': { level: 4, grammarPoint: '双重否定', grammarPointEn: 'Double negation' },

      // ── 对比 / 比较短语 ──
      '比起': { level: 3, grammarPoint: '介词（比起）', grammarPointEn: 'Preposition (比起)' },
      '与…相比': { level: 4, grammarPoint: '比较（与…相比）', grammarPointEn: 'Comparative (与…相比)' },

      // ── 书面语 / 连接短语 ──
      '事实标记': { level: 4, grammarPoint: '事实标记', grammarPointEn: 'Fact marker' },
      '从…来看': { level: 5, grammarPoint: '视角标记', grammarPointEn: 'Perspective marker' },
      '从…而言': { level: 5, grammarPoint: '视角标记', grammarPointEn: 'Perspective marker' },
      '从…出发': { level: 5, grammarPoint: '视角标记', grammarPointEn: 'Perspective marker' },

      // ── 时间 / 频率短语 ──
      '过一会儿': { level: 2, grammarPoint: '口语短语（过一会儿）', grammarPointEn: 'Spoken phrase' },
      '一段时间': { level: 3, grammarPoint: '时间表达', grammarPointEn: 'Time expression' },
      '到目前为止': { level: 5, grammarPoint: '时间表达（到目前为止）', grammarPointEn: 'Time expression' },
      '直到现在': { level: 4, grammarPoint: '时间表达（直到现在）', grammarPointEn: 'Time expression' },

      // ── 强调短语 ──
      '一点儿也不': { level: 2, grammarPoint: '强调否定', grammarPointEn: 'Emphatic negation' },
      '一点儿也不简单': { level: 2, grammarPoint: '强调否定', grammarPointEn: 'Emphatic negation' },
      '谁也不知道': { level: 3, grammarPoint: '强调否定', grammarPointEn: 'Emphatic negation' },
      '什么也不懂': { level: 2, grammarPoint: '强调否定', grammarPointEn: 'Emphatic negation' },
    };
    Object.assign(fixedPhrases, newFixedPhrases);
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
          // Skip trivial phrases that cause false matches
          if (/^[的得了着过是都在也有就没去来吃喝看做说想好坏多少].{0,1}$/.test(chunk)) continue;
          if (chunk.length === 2 && /[的得了着过是都在也]/.test(chunk[0]) && !/[好漂亮干净聪明重要简单安全热闹安静冷热忙累开心难过伤心高兴生气害怕担心奇怪特别普通正常]/.test(chunk)) continue;
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
   * 从语法数据构建关键词索引，提取语法点名称中的中文片段用于快速文本匹配。
   * 低等级条目优先（同一关键词取最低等级）。
   * @returns {Object.<string, GrammarPoint>} 关键词索引 (key=关键词, value=语法点)
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
   * 轻量级正向最大匹配 (FMM) 分词器。
   * 融合短语字典 (phraseDict) 和 HSK 词汇表进行分词。
   * @param {string} text - 待分词的中文文本
   * @returns {SegmentToken[]} 分词结果数组
   */
  _segment(text) {
    // Build merged dictionary: phraseDict (grammar-specific) + HSK vocab (general)
    // HSK vocab has priority for common words, phraseDict for grammar patterns
    const maxLen = 8;
    const tokens = [];
    let i = 0;

    // Check if HSK vocab is available (compact format: wm = word map)
    const hasHSK = typeof HSK_VOCAB !== 'undefined' && HSK_VOCAB.wm;

    while (i < text.length) {
      const ch = text[i];
      // Skip non-CJK characters (punctuation, spaces, etc.)
      if (!/[\u4e00-\u9fff]/.test(ch)) {
        tokens.push({ w: ch, pos: i, len: 1, level: 0, pos_tag: 'punct' });
        i++;
        continue;
      }

      let matched = false;
      // Try longest match first
      for (let len = Math.min(maxLen, text.length - i); len >= 2; len--) {
        const word = text.substring(i, i + len);

        // Check phraseDict first (grammar-specific, higher priority)
        if (this.phraseDict[word]) {
          tokens.push({
            w: word, pos: i, len,
            level: this.phraseDict[word].level,
            pos_tag: 'phrase'
          });
          i += len;
          matched = true;
          break;
        }

        // Then check HSK vocabulary (compact format: wm[word] = [level, pos])
        if (hasHSK && HSK_VOCAB.wm) {
          const arr = HSK_VOCAB.wm[word];
          if (arr) {
            tokens.push({
              w: word, pos: i, len,
              level: arr[0],
              pos_tag: arr[1] || 'unknown'
            });
            i += len;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        // Single character: try HSK charMap (compact format: cm[char] = [level, pos])
        let level = 0;
        let pos_tag = 'unknown';
        if (hasHSK && HSK_VOCAB.cm) {
          const arr = HSK_VOCAB.cm[ch];
          if (arr) {
            level = arr[0];
            pos_tag = arr[1] || 'unknown';
          }
        }
        tokens.push({ w: ch, pos: i, len: 1, level, pos_tag });
        i++;
      }
    }
    return tokens;
  }

  /**
   * 按句末标点将文本拆分为句子数组，保留标点符号。
   * @param {string} text - 待拆分的文本
   * @returns {Sentence[]} 句子数组 (含 text/start/end)
   */
  _splitSentences(text) {
    const sentences = [];
    // Split by sentence-ending punctuation but keep the punctuation
    const parts = text.split(/(?<=[。！？；!?;…])/g);
    let offset = 0;
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) { offset += part.length; continue; }
      sentences.push({
        text: trimmed,
        start: offset,
        end: offset + trimmed.length
      });
      offset += part.length;
    }
    // If no sentence-ending punctuation found, treat whole text as one sentence
    if (sentences.length === 0 && text.trim()) {
      sentences.push({ text: text.trim(), start: 0, end: text.trim().length });
    }
    return sentences;
  }

  /**
   * 上下文感知的结构助词（的/得/地）分析。
   * 通过周围字符判断语法功能，在正则匹配后调用以补充或修正匹配。
   * @param {string} text - 原文文本
   * @param {MatchResult[]} existingMatches - 已有的匹配结果 (用于去重)
   * @returns {MatchResult[]} 新增的匹配结果 (source='context-particle')
   */
  _analyzeParticleContext(text, existingMatches) {
    const additions = [];
    const existingPositions = new Set(existingMatches.map(m => m.position + '-' + m.pattern));

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch !== '的' && ch !== '得' && ch !== '地') continue;

      const prevCh = i > 0 ? text[i - 1] : '';
      const nextCh = i < text.length - 1 ? text[i + 1] : '';
      const prev2 = i > 1 ? text[i - 2] : '';
      const next2 = i < text.length - 2 ? text[i + 2] : '';

      if (ch === '地') {
        // 地：前面应该是修饰语（副词/形容词），后面应该是动词
        // Pattern: 副词/形容词 + 地 + 动词
        if (nextCh && /[\u4e00-\u9fff]/.test(nextCh)) {
          // Check if this is already matched
          const key = (i - 2) + '-';
          const matchLen = Math.min(i + 3, text.length) - Math.max(0, i - 2);
          const contextText = text.substring(Math.max(0, i - 2), Math.min(i + 3, text.length));
          // Only add if we see a clear Adverb+地+Verb pattern
          if (/[\u4e00-\u9fff]地[\u4e00-\u9fff]{2,}/.test(text.substring(i - 1, i + 4))) {
            const matchStart = Math.max(0, i - 1);
            const matchEnd = Math.min(text.length, i + 3);
            const matchText = text.substring(matchStart, matchEnd);
            if (!existingPositions.has(matchStart + '-' + matchText)) {
              additions.push({
                pattern: matchText,
                grammarPoint: '结构助词（…地…）',
                grammarPointEn: 'Structural particle (…地…)',
                level: 3,
                position: matchStart,
                source: 'context-particle'
              });
            }
          }
        }
      }

      if (ch === '的' && !nextCh) {
        // 句末"的"：可能是省略定语的"是…的"强调句
        // e.g., "我是昨天来的"
        if (prevCh && /[\u4e00-\u9fff]/.test(prevCh)) {
          // Look back for "是"
          let foundShi = false;
          for (let j = i - 2; j >= Math.max(0, i - 20); j--) {
            if (text[j] === '是' && (j === 0 || /[\u4e00-\u9fff，]/.test(text[j - 1]) || text[j - 1] === '，')) {
              foundShi = true;
              break;
            }
            if (/[\u4e00-\u9fff]{1,4}/.test(text.substring(j, j + 1)) === false) break;
          }
          if (foundShi) {
            // This is a "是...的" pattern at sentence end
            // Don't add duplicate if already matched
          }
        }
      }

      if (ch === '呢') {
        // 呢：上下文判断
        // 句末 + 疑问号 → 疑问语气词
        // 句中 + 前面有动词 → "正在...呢"持续态
        if (nextCh === '？' || nextCh === '?') {
          // Already handled by regex, skip
        } else if (/[，。！?！\s]/.test(nextCh)) {
          // 句末但不是疑问 → 可能是"还有呢"类
        } else if (/[\u4e00-\u9fff]/.test(nextCh)) {
          // 句中的"呢" → 疑问/列举
          // e.g., "你觉得呢？"
        }
      }
    }
    return additions;
  }

  /**
   * 句子级模式匹配。识别正则难以捕获的整句结构。
   * 包括：祈使句、感叹句（太…了）、"是…的"强调句、"有"+形容词评价、"挺…的"结构、疑问语气（呢/吗）。
   * @param {string} text - 待分析文本
   * @returns {MatchResult[]} 匹配结果数组 (source='sentence-pattern')
   */
  _matchSentencePatterns(text) {
    const matches = [];
    const sentences = this._splitSentences(text);

    for (const sent of sentences) {
      const s = sent.text;
      const sStart = sent.start;

      // ── 祈使句：V/VP + 吧/呗 ──
      if (/[吧呗啊]$/.test(s) && /[\u4e00-\u9fff]{2,}(吧|呗|啊)$/.test(s)) {
        const match = s.match(/([\u4e00-\u9fff]{2,}(吧|呗))$/);
        if (match) {
          matches.push({
            pattern: match[1],
            grammarPoint: '祈使句（…吧）',
            grammarPointEn: 'Imperative (…吧)',
            level: 2,
            position: sStart + s.indexOf(match[1]),
            source: 'sentence-pattern'
          });
        }
      }

      // ── 感叹句：太…了 ──
      if (/^[\u4e00-\u9fff]*太[\u4e00-\u9fff]{1,6}了[！!]?$/.test(s)) {
        const match = s.match(/(太[\u4e00-\u9fff]{1,6}了)/);
        if (match) {
          matches.push({
            pattern: match[1],
            grammarPoint: '感叹句（太…了）',
            grammarPointEn: 'Exclamatory (太…了)',
            level: 1,
            position: sStart + s.indexOf(match[1]),
            source: 'sentence-pattern'
          });
        }
      }

      // ── "的"字句末省略（是…的强调句）──
      if (/^.{2,20}的$/.test(s) && s.includes('是')) {
        const shiIdx = s.indexOf('是');
        const matchText = s.substring(shiIdx);
        if (matchText.length >= 3 && matchText.length <= 20) {
          matches.push({
            pattern: matchText,
            grammarPoint: '是…的强调句',
            grammarPointEn: '是…的 cleft sentence',
            level: 4,
            position: sStart + shiIdx,
            source: 'sentence-pattern'
          });
        }
      }

      // ── "有"+形容词评价句 ──
      if (/^.{0,6}有[\u4e00-\u9fff]{1,4}(了|[。！?！])?$/.test(s)) {
        const match = s.match(/(有[\u4e00-\u9fff]{1,4})/);
        if (match) {
          const adjWords = ['意思', '道理', '礼貌', '水平', '经验', '能力', '名', '用', '趣'];
          if (adjWords.some(w => match[1].includes(w))) {
            matches.push({
              pattern: match[1],
              grammarPoint: '评价表达（有+adj）',
              grammarPointEn: 'Evaluation (有+adj)',
              level: 2,
              position: sStart + s.indexOf(match[1]),
              source: 'sentence-pattern'
            });
          }
        }
      }

      // ── "挺…的" 固定结构 ──
      if (/挺[\u4e00-\u9fff]{1,6}的/.test(s)) {
        const match = s.match(/(挺[\u4e00-\u9fff]{1,6}的)/);
        if (match) {
          matches.push({
            pattern: match[1],
            grammarPoint: '程度副词结构（挺…的）',
            grammarPointEn: 'Degree structure (挺…的)',
            level: 2,
            position: sStart + s.indexOf(match[1]),
            source: 'sentence-pattern'
          });
        }
      }

      // ── 疑问句末"呢"（非紧跟问号）──
      if (/[\u4e00-\u9fff]呢[？?]?$/.test(s) && !/吗呢|什么呢$/.test(s)) {
        const match = s.match(/([\u4e00-\u9fff]呢)/);
        if (match) {
          matches.push({
            pattern: match[1],
            grammarPoint: '疑问语气（呢）',
            grammarPointEn: 'Question particle (呢)',
            level: 1,
            position: sStart + s.lastIndexOf(match[1]),
            source: 'sentence-pattern'
          });
        }
      }

      // ── 反问句末"吗" ──
      if (/[\u4e00-\u9fff]吗[？?]?$/.test(s)) {
        const match = s.match(/([\u4e00-\u9fff]{1,4}吗)/);
        if (match) {
          matches.push({
            pattern: match[1],
            grammarPoint: '是非疑问（…吗）',
            grammarPointEn: 'Yes-no question (…吗)',
            level: 1,
            position: sStart + s.lastIndexOf(match[1]),
            source: 'sentence-pattern'
          });
        }
      }
    }
    return matches;
  }

  /**
   * 分析中文文本的语法点（纯本地，无 API 调用）。
   * 执行 6 个阶段的匹配: 内置正则 → 分词 → 结构化 → 句子模式 → 助词语境 → 数据库/短语，
   * 最后进行重叠消解和等级分布统计。
   * @param {string} text - 待分析的中文文本
   * @param {'zh'|'en'} [lang='zh'] - 输出语言 ('zh' 或 'en')
   * @returns {AnalysisResult} 分析结果
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
    const SENTENCE_END = /[。！？!?…；;]/;
    for (const bp of this.compiledPatterns) {
      if (!bp.regex) continue;
      try {
        const regex = bp.regex;
        regex.lastIndex = 0; // Reset for each text
        let m;
        while ((m = regex.exec(text)) !== null) {
          const matched = m[0];
          // Skip "得" matches where "得" is preceded by non-complement words (觉得/懂得/获得 etc.)
          if (matched.includes('得') && GrammarAnalyzer.NON_COMPLEMENT.some(w => {
            const deIdx = matched.indexOf('得');
            // Check if the character before "得" is part of a non-complement word
            return deIdx > 0 && matched.substring(Math.max(0, deIdx - w.length + 1), deIdx + 1) === w;
          })) {
            if (matched.length === 0) regex.lastIndex++; continue;
          }
          // Cross-sentence guard: reject matches spanning sentence-ending punctuation
          if (matched.length > 6 && SENTENCE_END.test(matched)) continue;
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

    // Phase 1.5: Segmentation-driven matching using HSK vocabulary + phraseDict
    // This catches words missed by regex but present in the grammar/HSK vocabulary
    const segTokens = this._segment(text);
    const existingPosSet = new Set();
    for (const m of result.matches) {
      for (let p = m.position; p < m.position + m.pattern.length; p++) {
        existingPosSet.add(p);
      }
    }
    // Define POS categories that are grammar-relevant (not every word should be a match)
    const GRAMMAR_POS = new Set([
      '代', '动', '形', '副', '介', '连', '助', '叹', '数', '量',
      '名', '区别', '拟声', '时间', '处所', '方位'
    ]);
    // Classifiers and common grammatical function words to always match from segmentation
    const GRAMMAR_FUNCTION_CHARS = new Set('的得了着过是在都有也还没就不都更最比较特别已经正在刚快马上别人自己大家'.split(''));
    
    for (const token of segTokens) {
      if (token.len < 2) continue; // Skip single chars (already handled by regex)
      // Skip if this token's position range already has a match
      let overlaps = false;
      for (let p = token.pos; p < token.pos + token.len; p++) {
        if (existingPosSet.has(p)) { overlaps = true; break; }
      }
      if (overlaps) continue;
      
      // Only match words that have grammatical relevance
      const posTag = token.pos_tag || '';
      const firstChar = token.w[0];
      
      // Match words from phraseDict that are 2+ chars
      if (this.phraseDict[token.w]) {
        const info = this.phraseDict[token.w];
        result.matches.push({
          pattern: token.w,
          grammarPoint: lang === 'zh' ? info.grammarPoint : (info.grammarPointEn || info.grammarPoint),
          level: info.level,
          position: token.pos,
          source: 'segment-phrase',
          gpId: info.gpId || ''
        });
        for (let p = token.pos; p < token.pos + token.len; p++) existingPosSet.add(p);
        continue;
      }
      
      // Match HSK vocabulary words that are grammar-relevant
      // Focus on: conjunctions, prepositions, adverbs, particles, pronouns, modal verbs
      if (token.level <= 6) {
        const isGrammarRelevant = GRAMMAR_POS.has(posTag) ||
          posTag.includes('副') || posTag.includes('连') || posTag.includes('介') ||
          posTag.includes('助') || posTag.includes('代');
        
        if (isGrammarRelevant && token.level <= 3) {
          // Low-level grammar words are likely important
          result.matches.push({
            pattern: token.w,
            grammarPoint: lang === 'zh' 
              ? `${this._posLabelZh(posTag)}（${token.w}）`
              : `${this._posLabelEn(posTag)} (${token.w})`,
            level: token.level,
            position: token.pos,
            source: 'segment-hsk'
          });
          for (let p = token.pos; p < token.pos + token.len; p++) existingPosSet.add(p);
        }
      }
    }

    // Phase 2: Match structural patterns (context-aware head-tail matching)
    const structuralMatches = this._matchStructuralPatterns(text, lang);
    result.matches.push(...structuralMatches);

    // Phase 2.5: Match sentence-level patterns (imperative, exclamatory, etc.)
    const sentenceMatches = this._matchSentencePatterns(text);
    result.matches.push(...sentenceMatches);

    // Phase 2.7: Context-aware particle analysis (的/得/地 refinement)
    const particleAdditions = this._analyzeParticleContext(text, result.matches);
    result.matches.push(...particleAdditions);

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
    const SOURCE_PRIORITY = { phrase: 4, structural: 3, builtin: 2, database: 1, 'segment-phrase': 3.5, 'segment-hsk': 1.5, 'sentence-pattern': 3.8, 'context-particle': 3.2 };
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

    // Phase 5.5: Post-processing — remove matches that are substrings of higher-quality matches
    // E.g., if "明天" (phrase, L1) is matched and "明" (builtin result complement, L2) overlaps, keep "明天"
    const timeWordPositions = new Set();
    for (const m of result.matches) {
      if (m.source === 'phrase' && (
        m.grammarPoint.includes('时间') || m.grammarPoint.includes('名词') || m.grammarPoint.includes('代词')
      )) {
        for (let p = m.position; p < m.position + m.pattern.length; p++) {
          timeWordPositions.add(p);
        }
      }
    }
    if (timeWordPositions.size > 0) {
      result.matches = result.matches.filter(m => {
        if (m.source !== 'builtin' && m.pattern.length <= 1) return true;
        // Check if this match's position overlaps with a time/noun word
        const startPos = m.position;
        const endPos = m.position + m.pattern.length;
        for (let p = startPos; p < endPos; p++) {
          if (timeWordPositions.has(p)) {
            // This match overlaps with a time/noun word — skip if it's a single-char or low-priority builtin
            if (m.source === 'builtin' && m.pattern.length <= 2) return false;
          }
        }
        return true;
      });
    }

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
   * LLM 辅助分析。先执行本地分析，再调用 OpenAI 兼容 API 获取更深入的语法识别。
   * API 不可用时优雅降级为纯本地结果。
   * 输入上限 10000 字，超出仅使用本地分析。
   * @param {string} text - 待分析的中文文本
   * @param {'zh'|'en'} [lang='zh'] - 输出语言 ('zh' 或 'en')
   * @returns {Promise<AnalysisResult>} 分析结果 (包含 llmUsed 和 llmNote 字段)
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
      const llmSrcPrio = (m) => ({ phrase: 4, structural: 3, builtin: 2, database: 1, llm: 5, 'segment-phrase': 3.5, 'segment-hsk': 1.5, 'sentence-pattern': 3.8, 'context-particle': 3.2 }[m.source] || 0);
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

  /**
   * 将 HSK 词性标签缩写映射为中文名称。
   * @param {string} pos - 词性标签 (如 '副', '动', '形')
   * @returns {string} 中文名称 (如 '副词', '动词', '形容词')
   */
  _posLabelZh(pos) {
    const map = {
      '代': '代词', '动': '动词', '形': '形容词', '副': '副词', '介': '介词',
      '连': '连词', '助': '助词', '叹': '叹词', '数': '数词', '量': '量词',
      '名': '名词', '区别': '区别词', '拟声': '拟声词', '时间': '时间词',
      '处所': '处所词', '方位': '方位词'
    };
    for (const [key, label] of Object.entries(map)) {
      if (pos.includes(key)) return label;
    }
    return '词';
  }

  /**
   * 将 HSK 词性标签缩写映射为英文名称。
   * @param {string} pos - 词性标签 (如 '副', '动', '形')
   * @returns {string} 英文名称 (如 'Adverb', 'Verb', 'Adjective')
   */
  _posLabelEn(pos) {
    const map = {
      '代': 'Pronoun', '动': 'Verb', '形': 'Adjective', '副': 'Adverb', '介': 'Preposition',
      '连': 'Conjunction', '助': 'Particle', '叹': 'Interjection', '数': 'Numeral', '量': 'Classifier',
      '名': 'Noun', '区别': 'Distinguisher', '拟声': 'Onomatopoeia', '时间': 'Time word',
      '处所': 'Place word', '方位': 'Locative'
    };
    for (const [key, label] of Object.entries(map)) {
      if (pos.includes(key)) return label;
    }
    return 'Word';
  }

  /**
   * 基于加权频率分布计算建议的 HSK 等级 (1-6)。
   * 使用 count² 加权，使高频等级有更大影响。
   * @param {AnalysisResult} result - 分析结果
   * @returns {number} 建议等级 (1-6)
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
   * 根据分析结果生成学习建议。
   * 包括：高级语法提示、等级分布、语法丰富度评估、难度建议。
   * @param {AnalysisResult} result - 分析结果
   * @param {'zh'|'en'} lang - 语言 ('zh' 或 'en')
   * @returns {string[]} 建议文本数组
   */
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
