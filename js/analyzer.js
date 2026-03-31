/**
 * GrammarAnalyzer - Chinese Grammar Analysis Engine
 * 
 * Analyzes Chinese text against HSK Grammar Standards (GF 0025-2021)
 * Supports: regex pattern matching, database keyword matching, and optional LLM-assisted analysis.
 */

class GrammarAnalyzer {
  constructor(grammarData) {
    this.grammarData = grammarData;
    this.keywordIndex = this._buildKeywordIndex();
    this.builtinPatterns = this._initPatterns();
    // LLM API config (optional, user provides key + endpoint)
    this.llmConfig = null;
  }

  /**
   * Configure LLM API for enhanced analysis.
   * Supports OpenAI-compatible endpoints (OpenAI, DeepSeek, Moonshot, etc.)
   */
  configureLLM({ apiKey, endpoint, model }) {
    this.llmConfig = { apiKey, endpoint, model: model || 'gpt-4o-mini' };
  }

  _initPatterns() {
    return [
      // ═══════════════════════════════════════
      // Level 1 — 基础 Basic (24 patterns)
      // ═══════════════════════════════════════
      // 否定
      {pattern: /不是/g, level: 1, desc_zh: '否定（不是）', desc_en: 'Negation (不是)'},
      {pattern: /不[是会不会能好坏对错多大小少长新]/g, level: 1, desc_zh: '否定（不+形容词/能愿）', desc_en: 'Negation (不+adj/modal)'},
      {pattern: /没[有]?[来去吃喝做写看听说读买卖]/g, level: 1, desc_zh: '否定（没/没有+动词）', desc_en: 'Negation (没/没有+verb)'},
      // 疑问
      {pattern: /吗[？?]/g, level: 1, desc_zh: '是非疑问（吗）', desc_en: 'Yes-no question (吗)'},
      {pattern: /什么/g, level: 1, desc_zh: '疑问代词（什么）', desc_en: 'Interrogative (什么)'},
      {pattern: /谁/g, level: 1, desc_zh: '疑问代词（谁）', desc_en: 'Interrogative (谁)'},
      {pattern: /哪[里儿个些时天号]/g, level: 1, desc_zh: '疑问代词（哪…）', desc_en: 'Interrogative (哪…)'},
      {pattern: /怎么/g, level: 1, desc_zh: '疑问代词（怎么）', desc_en: 'Interrogative (怎么)'},
      {pattern: /几[个点分号]?/g, level: 1, desc_zh: '疑问代词（几）', desc_en: 'Interrogative (几)'},
      {pattern: /多少/g, level: 1, desc_zh: '疑问代词（多少）', desc_en: 'Interrogative (多少)'},
      // 程度
      {pattern: /很[好吃大漂亮多高低快慢早晚远近新贵便宜难容易忙]/g, level: 1, desc_zh: '程度副词（很）', desc_en: 'Degree adverb (很)'},
      {pattern: /真[好吃大漂亮多高低]/g, level: 1, desc_zh: '程度副词（真）', desc_en: 'Degree adverb (真)'},
      {pattern: /太[好吃大漂亮多了高了]/g, level: 1, desc_zh: '程度副词（太）', desc_en: 'Degree adverb (太)'},
      // 数量
      {pattern: /一[个只条张本位名次间把朵块片双对群批套串碗杯瓶斤公斤米]/g, level: 1, desc_zh: '数量词（一+量词）', desc_en: 'Numeral+classifier'},
      // 代词
      {pattern: /我[们]?|你[们]?|他[们]?|她[们]?|它[们]?/g, level: 1, desc_zh: '人称代词', desc_en: 'Personal pronoun'},
      {pattern: /这[个些里样种时候天儿点]/g, level: 1, desc_zh: '指示代词（这…）', desc_en: 'Demonstrative (这…)'},
      {pattern: /那[个些里样种时候天儿点]/g, level: 1, desc_zh: '指示代词（那…）', desc_en: 'Demonstrative (那…)'},
      // 介词/方位
      {pattern: /在[^，。？！]{1,6}[上中下里前后外旁边]/g, level: 1, desc_zh: '方位词（在…上/里）', desc_en: 'Locative (在…上/里)'},
      {pattern: /的(?=[\u4e00-\u9fff])/g, level: 1, desc_zh: '结构助词（的）', desc_en: 'Structural particle (的)'},
      {pattern: /了(?=[。！？\u4e00])/g, level: 1, desc_zh: '动态助词（了）', desc_en: 'Aspect particle (了)'},
      // 能愿动词
      {pattern: /会[说写做看听读吃喝画唱]/g, level: 1, desc_zh: '能愿动词（会）', desc_en: 'Modal verb (会)'},
      {pattern: /想[要去吃看学做买]/g, level: 1, desc_zh: '能愿动词（想/要）', desc_en: 'Modal verb (想/要)'},

      // ═══════════════════════════════════════
      // Level 2 — 初级 Elementary (20 patterns)
      // ═══════════════════════════════════════
      // 时态/体
      {pattern: /正在[^，。？！]{1,8}/g, level: 2, desc_zh: '进行体（正在）', desc_en: 'Progressive (正在)'},
      {pattern: /在[^，。？！]{0,3}着/g, level: 2, desc_zh: '进行体（在…着）', desc_en: 'Progressive (在…着)'},
      {pattern: /了(?=[过])/g, level: 2, desc_zh: '完成体（了）', desc_en: 'Perfective (了)'},
      {pattern: /过[。？！了，]/g, level: 2, desc_zh: '经历体（过）', desc_en: 'Experiential (过)'},
      {pattern: /已经[^，。？！]{1,8}[了]/g, level: 2, desc_zh: '完成体（已经…了）', desc_en: 'Perfective (已经…了)'},
      // 比较
      {pattern: /比[^，。？！]{1,10}[都还更最]/g, level: 2, desc_zh: '比较句（比）', desc_en: 'Comparative (比)'},
      {pattern: /没有[^，。？！]{1,8}[好吃大漂亮高低]/g, level: 2, desc_zh: '比较句（没有）', desc_en: 'Comparative (没有)'},
      {pattern: /跟[^，。？！]{1,6}[一同样]/g, level: 2, desc_zh: '比较句（跟…一样）', desc_en: 'Comparative (跟…一样)'},
      // 情态
      {pattern: /应该/g, level: 2, desc_zh: '能愿动词（应该）', desc_en: 'Modal (应该)'},
      {pattern: /可以/g, level: 2, desc_zh: '能愿动词（可以）', desc_en: 'Modal (可以)'},
      {pattern: /必须/g, level: 2, desc_zh: '能愿动词（必须）', desc_en: 'Modal (必须)'},
      {pattern: /得[到起]/g, level: 2, desc_zh: '可能补语（得）', desc_en: 'Potential complement (得)'},
      {pattern: /.不到|.不起/g, level: 2, desc_zh: '可能补语（不+动+到/起）', desc_en: 'Potential complement negation'},
      {pattern: /把(?=[\u4e00-\u9fff])/g, level: 2, desc_zh: '介词（把）', desc_en: 'Preposition (把)'},
      {pattern: /被(?=[\u4e00-\u9fff])/g, level: 2, desc_zh: '介词（被）', desc_en: 'Preposition (被)'},
      // 时间
      {pattern: /的时候/g, level: 2, desc_zh: '时间表达（…的时候）', desc_en: 'Time expression (…的时候)'},
      {pattern: /从[^，。？！]{1,6}[开始起]/g, level: 2, desc_zh: '时间起点（从…起）', desc_en: 'Time starting point (从…起)'},
      {pattern: /到[^，。？！]{1,6}为止/g, level: 2, desc_zh: '时间终点（到…为止）', desc_en: 'Time endpoint (到…为止)'},
      // 动量
      {pattern: /了两次|吃了三|看了几|去了多/g, level: 2, desc_zh: '动量表达', desc_en: 'Verb-reduplication / frequency'},
      {pattern: /一下/g, level: 2, desc_zh: '动量补语（一下）', desc_en: 'Frequency complement (一下)'},

      // ═══════════════════════════════════════
      // Level 3 — 中级 Intermediate (22 patterns)
      // ═══════════════════════════════════════
      // 关联复句
      {pattern: /虽然[^，。？！]{1,20}但是/g, level: 3, desc_zh: '虽然……但是', desc_en: '虽然……但是 (Although…but)'},
      {pattern: /虽然[^，。？！]{1,20}可是/g, level: 3, desc_zh: '虽然……可是', desc_en: '虽然……可是 (Although…however)'},
      {pattern: /因为[^，。？！]{1,20}所以/g, level: 3, desc_zh: '因为……所以', desc_en: '因为……所以 (Because…so)'},
      {pattern: /如果[^，。？！]{1,20}就/g, level: 3, desc_zh: '如果……就', desc_en: '如果……就 (If…then)'},
      {pattern: /要是[^，。？！]{1,20}就/g, level: 3, desc_zh: '要是……就', desc_en: '要是……就 (If…then)'},
      {pattern: /只有[^，。？！]{1,15}才/g, level: 3, desc_zh: '只有……才', desc_en: '只有……才 (Only if…then)'},
      {pattern: /只要[^，。？！]{1,15}就/g, level: 3, desc_zh: '只要……就', desc_en: '只要……就 (As long as…then)'},
      {pattern: /不但[^，。？！]{1,15}而且/g, level: 3, desc_zh: '不但……而且', desc_en: '不但……而且 (Not only…but also)'},
      {pattern: /一边[^，。？！]{1,10}一边/g, level: 3, desc_zh: '一边……一边', desc_en: '一边……一边 (Simultaneous)'},
      {pattern: /越[^，。？！]{1,8}越/g, level: 3, desc_zh: '越……越', desc_en: '越……越 (The more…the more)'},
      {pattern: /除了[^，。？！]{1,12}以外/g, level: 3, desc_zh: '除了……以外', desc_en: '除了……以外 (Besides)'},
      {pattern: /除了[^，。？！]{1,12}还/g, level: 3, desc_zh: '除了……还', desc_en: '除了……还 (Besides…also)'},
      // 把/被句
      {pattern: /把[^，。？！]{1,15}[放在送给带给扔丢吃喝拿拉推]/g, level: 3, desc_zh: '把字句', desc_en: '把-construction'},
      {pattern: /被[^，。？！]{1,12}[吃了打了发现了知道]/g, level: 3, desc_zh: '被字句', desc_en: '被-construction'},
      // 补语
      {pattern: /得[^，。？！]{1,10}[好快慢对错清楚漂亮干净]/g, level: 3, desc_zh: '程度补语（动词+得+形）', desc_en: 'Degree complement (V+得+adj)'},
      {pattern: /给(?=[\u4e00-\u9fff]{1,3}[看听说读写打送])/, level: 3, desc_zh: '介词（给）', desc_en: 'Preposition (给)'},
      // 固定格式
      {pattern: /连[^，。？！]{1,8}都[没不]/g, level: 3, desc_zh: '连……都（不/没）', desc_en: '连…都 (Even…)'},
      {pattern: /对[^，。？！]{1,8}[感兴趣满意意意思]/g, level: 3, desc_zh: '对……（感兴趣/满意）', desc_en: '对…(interested/satisfied)'},
      {pattern: /值得/g, level: 3, desc_zh: '值得', desc_en: '值得 (Worth)'},
      {pattern: /来得及|来不及/g, level: 3, desc_zh: '来得及/来不及', desc_en: '来得及/来不及 (In time / Too late)'},
      {pattern: /忍不住|不得不|不能不/g, level: 3, desc_zh: '双重否定/情态', desc_en: 'Double negation / modality'},
      {pattern: /越来越/g, level: 3, desc_zh: '越来越', desc_en: '越来越 (More and more)'},

      // ═══════════════════════════════════════
      // Level 4 — 中高级 Upper-Intermediate (22 patterns)
      // ═══════════════════════════════════════
      // 让步转折
      {pattern: /尽管[^，。？！]{1,15}但/g, level: 4, desc_zh: '尽管……但', desc_en: '尽管……但 (Despite…)'},
      {pattern: /即使[^，。？！]{1,15}也/g, level: 4, desc_zh: '即使……也', desc_en: '即使……也 (Even if…)'},
      {pattern: /无论[^，。？！]{1,15}都/g, level: 4, desc_zh: '无论……都', desc_en: '无论……都 (No matter…)'},
      {pattern: /不管[^，。？！]{1,15}都/g, level: 4, desc_zh: '不管……都', desc_en: '不管……都 (Regardless…)'},
      {pattern: /既然[^，。？！]{1,12}就/g, level: 4, desc_zh: '既然……就', desc_en: '既然……就 (Since…then)'},
      {pattern: /与其[^，。？！]{1,12}不如/g, level: 4, desc_zh: '与其……不如', desc_en: '与其……不如 (Rather than…)'},
      {pattern: /不是[^，。？！]{1,10}而是/g, level: 4, desc_zh: '不是……而是', desc_en: '不是……而是 (Not…but rather)'},
      // 条件假设
      {pattern: /倘若[^，。？！]{1,12}便|假若[^，。？！]{1,12}则/g, level: 4, desc_zh: '假设（倘若/假若）', desc_en: 'Hypothetical (倘若/假若)'},
      {pattern: /的话[^，。？！]{0,4}[那就]/g, level: 4, desc_zh: '假设（的话）', desc_en: 'Hypothetical (的话)'},
      // 话语标记
      {pattern: /换句话说|也就是说|换言之/g, level: 4, desc_zh: '话语标记（换言之）', desc_en: 'Discourse marker (In other words)'},
      {pattern: /例如|比如|举例来说/g, level: 4, desc_zh: '话语标记（例如）', desc_en: 'Discourse marker (For example)'},
      {pattern: /首先[^，。？！]{1,10}[其次接着然后]/g, level: 4, desc_zh: '序数标记（首先…其次）', desc_en: 'Sequential marker (First…then)'},
      // 强调
      {pattern: /正是|恰恰是|尤其是/g, level: 4, desc_zh: '强调（正是/尤其是）', desc_en: 'Emphasis (正是/尤其是)'},
      {pattern: /难道[^？?]{1,10}[？?]/g, level: 4, desc_zh: '反问（难道）', desc_en: 'Rhetorical question (难道)'},
      {pattern: /到底/g, level: 4, desc_zh: '强调疑问（到底）', desc_en: 'Emphatic question (到底)'},
      // 特殊句式
      {pattern: /连[^，。？！]{1,6}甚至[^，。？！]{1,8}/g, level: 4, desc_zh: '递进（甚至）', desc_en: 'Progressive (甚至)'},
      {pattern: /之所以[^，。？！]{1,15}是因为/g, level: 4, desc_zh: '之所以……是因为', desc_en: '之所以…是因为 (The reason…)'},
      {pattern: /与其说[^，。？！]{1,8}不如说/g, level: 4, desc_zh: '与其说……不如说', desc_en: '与其说…不如说 (Rather than)'},
      {pattern: /并非|并不是|并没有/g, level: 4, desc_zh: '否定强调（并非）', desc_en: 'Emphatic negation (并非)'},
      // 结果
      {pattern: /因此[^，。？！]{0,8}/g, level: 4, desc_zh: '因果（因此）', desc_en: 'Causal (因此)'},
      {pattern: /于是/g, level: 4, desc_zh: '承接（于是）', desc_en: 'Sequential (于是)'},
      // 比喻
      {pattern: /像[^，。？！]{1,10}[一样一般似的]/g, level: 4, desc_zh: '比喻（像……一样）', desc_en: 'Simile (像…一样)'},

      // ═══════════════════════════════════════
      // Level 5 — 高级 Advanced (20 patterns)
      // ═══════════════════════════════════════
      {pattern: /恰恰相反|恰恰是/g, level: 5, desc_zh: '反预期（恰恰）', desc_en: 'Counter-expectation (恰恰)'},
      {pattern: /旨在|意在|目的在于/g, level: 5, desc_zh: '目的表达', desc_en: 'Purpose expression'},
      {pattern: /以致|以至于/g, level: 5, desc_zh: '结果（以致）', desc_en: 'Result (以致)'},
      {pattern: /鉴于|考虑到/g, level: 5, desc_zh: '原因（鉴于）', desc_en: 'Reason (鉴于)'},
      {pattern: /然而|不过|可是/g, level: 5, desc_zh: '转折（然而/不过）', desc_en: 'Transition (然而/不过)'},
      {pattern: /尽管如此|即便如此|虽然如此/g, level: 5, desc_zh: '让步总结', desc_en: 'Concessive summary'},
      {pattern: /与此同时|同时/g, level: 5, desc_zh: '并存（与此同时）', desc_en: 'Co-occurrence (与此同时)'},
      {pattern: /随着[^，。？！]{1,12}[的增加的变化的发展]/g, level: 5, desc_zh: '伴随（随着）', desc_en: 'Accompanying (随着)'},
      {pattern: /以[^，。？！]{1,8}为/g, level: 5, desc_zh: '介词结构（以…为）', desc_en: 'Prepositional structure (以…为)'},
      {pattern: /不仅[^，。？！]{1,10}还|不仅[^，。？！]{1,10}也/g, level: 5, desc_zh: '不仅……还/也', desc_en: '不仅…还/也 (Not only…)'},
      {pattern: /所谓/g, level: 5, desc_zh: '话语标记（所谓）', desc_en: 'Discourse marker (所谓)'},
      {pattern: /不可否认|毋庸置疑|不言而喻/g, level: 5, desc_zh: '强调断言', desc_en: 'Emphatic assertion'},
      {pattern: /一方面[^，。？！]{1,10}另一方面/g, level: 5, desc_zh: '并列（一方面…另一方面）', desc_en: 'Coordination (一方面…另一方面)'},
      {pattern: /固然[^，。？！]{1,12}但/g, level: 5, desc_zh: '让步（固然）', desc_en: 'Concessive (固然)'},
      {pattern: /反而|反倒/g, level: 5, desc_zh: '反转（反而）', desc_en: 'Reversal (反而)'},
      {pattern: /尚未|仍未|并未/g, level: 5, desc_zh: '书面否定（尚未）', desc_en: 'Written negation (尚未)'},
      {pattern: /对此|就此|对此而言/g, level: 5, desc_zh: '指代（对此）', desc_en: 'Reference (对此)'},
      {pattern: /换言之|具体来说|确切地说/g, level: 5, desc_zh: '解释标记', desc_en: 'Clarification marker'},
      {pattern: /在[^，。？！]{1,4}[当天那时那时此刻此期间此之前之后]/g, level: 5, desc_zh: '时间表达（在…当天/时）', desc_en: 'Time expression (在…当天)'},
      {pattern: /由[^，。？！]{1,8}[的负责承担担任]/g, level: 5, desc_zh: '被动标记（由…的）', desc_en: 'Passive marker (由…)'},
      // Level 5 extra - structure patterns
      {pattern: /自[^，。？！]{1,6}以来/g, level: 5, desc_zh: '时间结构（自…以来）', desc_en: 'Time structure (自…以来)'},

      // ═══════════════════════════════════════
      // Level 6 — 精通 Proficient (20 patterns)
      // ═══════════════════════════════════════
      {pattern: /毋庸[讳言赘述置言质疑]/g, level: 6, desc_zh: '书面语（毋庸）', desc_en: 'Written (毋庸)'},
      {pattern: /归根结底|总而言之|综上所述/g, level: 6, desc_zh: '总结标记', desc_en: 'Summary marker'},
      {pattern: /任凭|哪怕|纵然|即便/g, level: 6, desc_zh: '高级让步', desc_en: 'Advanced concessive'},
      {pattern: /诚然[^，。？！]{1,10}但/g, level: 6, desc_zh: '高级让步（诚然）', desc_en: 'Advanced concessive (诚然)'},
      {pattern: /毋庸置疑|无可厚非|无可非议/g, level: 6, desc_zh: '评价表达', desc_en: 'Evaluation expression'},
      {pattern: /与此同时|与此同時/g, level: 6, desc_zh: '高级关联', desc_en: 'Advanced conjunction'},
      {pattern: /亦|亦[^，。？！]{0,5}[无不未]/g, level: 6, desc_zh: '文言成分（亦）', desc_en: 'Classical element (亦)'},
      {pattern: /乃至|甚至于|以至于/g, level: 6, desc_zh: '递进（乃至）', desc_en: 'Progressive (乃至)'},
      {pattern: /若[^，。？！]{0,4}则/g, level: 6, desc_zh: '文言条件（若…则）', desc_en: 'Classical conditional (若…则)'},
      {pattern: /而非/g, level: 6, desc_zh: '文言否定（而非）', desc_en: 'Classical negation (而非)'},
      {pattern: /以期|旨在/g, level: 6, desc_zh: '目的（以期）', desc_en: 'Purpose (以期)'},
      {pattern: /一方面[^，。？！]{1,12}另一方面/g, level: 6, desc_zh: '高级并列', desc_en: 'Advanced coordination'},
      {pattern: /处于[^，。？！]{1,8}状态|处于[^，。？！]{1,8}阶段/g, level: 6, desc_zh: '状态表达', desc_en: 'State expression'},
      {pattern: /从[^，。？！]{1,10}来看|从[^，。？！]{1,10}而言/g, level: 6, desc_zh: '视角标记', desc_en: 'Perspective marker'},
      {pattern: /在此|于此|至此|届时/g, level: 6, desc_zh: '文言指示代词', desc_en: 'Classical demonstrative'},
      {pattern: /作为[^，。？！]{1,8}[的重要的关键的]/g, level: 6, desc_zh: '作为…', desc_en: '作为… (As…)'},
      {pattern: /对[^，。？！]{1,10}而言|就[^，。？！]{1,10}而言/g, level: 6, desc_zh: '限定表达（…而言）', desc_en: 'Limiting expression (…而言)'},
      {pattern: /进而|从而|继而/g, level: 6, desc_zh: '高级承接', desc_en: 'Advanced sequential'},
      {pattern: /亦[^，。？！]{0,3}是|亦是/g, level: 6, desc_zh: '文言判断', desc_en: 'Classical copula'},
      {pattern: /且[^，。？！]{0,3}[不未]|且[^，。？！]{0,6}而言/g, level: 6, desc_zh: '文言递进/限定', desc_en: 'Classical progressive'},
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

    // Phase 1: Match built-in regex patterns
    for (const bp of this.builtinPatterns) {
      try {
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
          // Prevent infinite loops on zero-length matches
          if (m[0].length === 0) regex.lastIndex++;
        }
      } catch (e) { /* skip invalid patterns */ }
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

    // Phase 3: Remove overlapping matches
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

    // Phase 4: Calculate distribution
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
        ? `你是一个中文语法分析专家。请分析以下中文文本中包含的所有语法点，按照《国际中文教育中文水平等级标准》(GF 0025-2021) 判定每个语法点的等级(1-6级)。

请以JSON数组格式返回结果，每个元素包含：
- "pattern": 文本中匹配的原文片段
- "grammarPoint": 语法点名称（中文）
- "level": 等级数字(1-6)
- "position": 在原文中的起始位置(字符索引)

注意：
1. 尽可能全面地识别所有语法现象，包括但不限于：时态标记、介词结构、关联词、补语、把/被句式、话语标记等
2. 只返回JSON数组，不要其他文字
3. pattern 必须是原文中的确切子串`
        : `You are a Chinese grammar analysis expert. Analyze the following Chinese text for ALL grammar points, rating each according to GF 0025-2021 (HSK Grammar Standard) at levels 1-6.

Return a JSON array where each element has:
- "pattern": the exact text fragment
- "grammarPoint": grammar point name (English)
- "level": level number (1-6)
- "position": starting character index in the original text

Rules:
1. Be comprehensive: identify tense markers, prepositions, conjunctions, complements, 把/被 constructions, discourse markers, etc.
2. Return ONLY the JSON array, no other text
3. pattern must be an exact substring of the original`;

      const response = await fetch(this.llmConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.llmConfig.apiKey}`
        },
        body: JSON.stringify({
          model: this.llmConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '[]';

      // Parse LLM response
      let llmMatches = [];
      try {
        const parsed = JSON.parse(content);
        llmMatches = Array.isArray(parsed) ? parsed : (parsed.matches || parsed.results || parsed.data || []);
      } catch (e) {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try { llmMatches = JSON.parse(jsonMatch[0]); } catch (e2) { /* skip */ }
        }
      }

      // Merge LLM matches with local results
      const localPatterns = new Set(localResult.matches.map(m => m.pattern + m.position));

      for (const lm of llmMatches) {
        if (lm.pattern && lm.grammarPoint && lm.level) {
          const key = lm.pattern + (lm.position || 0);
          if (!localPatterns.has(key)) {
            localResult.matches.push({
              pattern: lm.pattern,
              grammarPoint: lm.grammarPoint,
              level: Math.max(1, Math.min(6, parseInt(lm.level) || 1)),
              position: typeof lm.position === 'number' ? lm.position : -1,
              source: 'llm',
              gpId: lm.gpId || ''
            });
            localPatterns.add(key);
          }
        }
      }

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
