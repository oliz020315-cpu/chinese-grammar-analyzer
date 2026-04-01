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
  constructor(grammarData) {
    this.grammarData = grammarData;
    this.keywordIndex = this._buildKeywordIndex();
    this.builtinPatterns = this._initPatterns();
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
   */
  configureLLM(config) {
    if (!config || !config.apiKey || !config.endpoint) {
      this.llmConfig = null;
      return;
    }
    this.llmConfig = { apiKey: config.apiKey, endpoint: config.endpoint, model: config.model || 'gpt-4o-mini' };
  }

  // Helper: CJK + digits + common punctuation within a clause
  // \u4e00-\u9fff = CJK Unified Ideographs
  // \u3000-\u303f = CJK Symbols and Punctuation (includes 、etc)
  // We exclude sentence-ending: 。！？；… and clause-separating: ，
  _C = '\\u4e00-\\u9fff\\u3000-\\u3003\\u3005-\\u303f\\uff00-\\uffef';  // CJK chars for use in regex patterns
  _N = '0-9'; // digits

  _initPatterns() {
    // Shorthand for CJK character class (within regex source)
    const C = '[\u4e00-\u9fff\u3000-\u3003\u3005-\u303f\uff00-\uffef0-9a-zA-Z]';
    const NC = '[^\u4e00-\u9fff\u3000-\u3003\u3005-\u303f\uff00-\uffef0-9a-zA-Z]'; // non-CJK
    // Clause boundary = sentence or clause separator
    const SEP = '[，。？！；…、：」』】）\n\r]';

    return [
      // ═══════════════════════════════════════════════════════════════
      // Level 1 — 基础 Basic (HSK 1)
      // 否定、疑问、程度、数量、代词、方位、助词、能愿、频率
      // ═══════════════════════════════════════════════════════════════

      // ─── 否定 ───
      {pattern: /不是/g, level: 1, desc_zh: '否定（不是）', desc_en: 'Negation (不是)'},
      {pattern: /没有/g, level: 1, desc_zh: '否定（没有）', desc_en: 'Negation (没有)'},
      {pattern: /不[是会不会能好坏对错多大小少长新高矮胖瘦冷热远近快慢早晚忙累苦甜酸咸干净便宜贵难容易认真安静安全危险重要简单复杂美丽漂亮帅开心高兴难过伤心生气害怕担心舒服好吃有趣无聊]/g, level: 1, desc_zh: '否定（不+形容词/能愿）', desc_en: 'Negation (不+adj/modal)'},
      {pattern: /没[有]?[来去吃喝做写看听说读买卖走跑坐站睡醒开门关门知道认识学习工作休息吃饭洗澡上课]/g, level: 1, desc_zh: '否定（没+动词）', desc_en: 'Negation (没+verb)'},
      {pattern: /别[进来出去说笑哭跑走动碰摸吵喝吃买做看]/g, level: 1, desc_zh: '否定祈使（别+动词）', desc_en: 'Negative imperative (别+verb)'},

      // ─── 疑问 ───
      {pattern: /吗[？?]/g, level: 1, desc_zh: '是非疑问（吗）', desc_en: 'Yes-no question (吗)'},
      {pattern: /什么/g, level: 1, desc_zh: '疑问代词（什么）', desc_en: 'Interrogative (什么)'},
      {pattern: /谁/g, level: 1, desc_zh: '疑问代词（谁）', desc_en: 'Interrogative (谁)'},
      {pattern: /哪[里儿个些时天号种位]/g, level: 1, desc_zh: '疑问代词（哪…）', desc_en: 'Interrogative (哪…)'},
      {pattern: /怎么/g, level: 1, desc_zh: '疑问代词（怎么）', desc_en: 'Interrogative (怎么)'},
      {pattern: /几[个点分号位名次]?/g, level: 1, desc_zh: '疑问代词（几）', desc_en: 'Interrogative (几)'},
      {pattern: /多少/g, level: 1, desc_zh: '疑问代词（多少）', desc_en: 'Interrogative (多少)'},
      {pattern: /呢[？?]$/gm, level: 1, desc_zh: '疑问语气（呢）', desc_en: 'Question particle (呢)'},
      {pattern: /还是/g, level: 1, desc_zh: '选择疑问（还是）', desc_en: 'Alternative question (还是)'},

      // ─── 程度副词 ───
      {pattern: /很[\u4e00-\u9fff]/g, level: 1, desc_zh: '程度副词（很）', desc_en: 'Degree adverb (很)'},
      {pattern: /非常[\u4e00-\u9fff]/g, level: 1, desc_zh: '程度副词（非常）', desc_en: 'Degree adverb (非常)'},
      {pattern: /真[好吃大漂亮多高低快慢好帅棒难]/g, level: 1, desc_zh: '程度副词（真）', desc_en: 'Degree adverb (真)'},
      {pattern: /太[\u4e00-\u9fff]+了/g, level: 1, desc_zh: '程度副词（太…了）', desc_en: 'Degree adverb (太…了)'},
      {pattern: /最[\u4e00-\u9fff]/g, level: 1, desc_zh: '程度副词（最）', desc_en: 'Degree adverb (最)'},

      // ─── 数量短语 ───
      {pattern: /[一二三四五六七八九十百千万两零半][个只条张本位名次间把朵块片双对群批套串碗杯瓶斤公斤米号岁年天月日种位分秒期届][\u4e00-\u9fff]?/g, level: 1, desc_zh: '数量词（数+量词）', desc_en: 'Numeral+classifier'},

      // ─── 代词 ───
      {pattern: /我[们]?|你[们]?|他[们]?|她[们]?|它[们]?/g, level: 1, desc_zh: '人称代词', desc_en: 'Personal pronoun'},
      {pattern: /这[个些里样种时候天儿点位边]/g, level: 1, desc_zh: '指示代词（这…）', desc_en: 'Demonstrative (这…)'},
      {pattern: /那[个些里样种时候天儿点位边]/g, level: 1, desc_zh: '指示代词（那…）', desc_en: 'Demonstrative (那…)'},
      {pattern: /别的|有的/g, level: 1, desc_zh: '代词（别的/有的）', desc_en: 'Pronoun (别的/有的)'},

      // ─── 介词 / 方位 ───
      {pattern: /在[\u4e00-\u9fff]{1,6}[上中下里前后外旁边对面中间左右]/g, level: 1, desc_zh: '方位词（在…上/里）', desc_en: 'Locative (在…上/里)'},
      {pattern: /在[\u4e00-\u9fff]{2,6}(?![的])/g, level: 1, desc_zh: '介词（在+地点/时间）', desc_en: 'Preposition (在+location/time)'},

      // ─── 助词 ───
      {pattern: /[\u4e00-\u9fff]{1,6}的[\u4e00-\u9fff]{0,4}/g, level: 1, desc_zh: '结构助词（…的…）', desc_en: 'Structural particle (…的…)'},
      {pattern: /[\u4e00-\u9fff]+地[\u4e00-\u9fff]+/g, level: 2, desc_zh: '结构助词（…地…）', desc_en: 'Structural particle (…地…)'},
      {pattern: /[\u4e00-\u9fff]+得(?!并不)[\u4e00-\u9fff]+/g, level: 3, desc_zh: '程度/状态补语（…得…）', desc_en: 'Degree/state complement (…得…)'}

      // ─── 简单并列结构 ───
      {pattern: /[\u4e00-\u9fff]{2,6}并[\u4e00-\u9fff]{2,6}/g, level: 3, desc_zh: '并列结构（A并B）', desc_en: 'Coordinating structure (A and B)'},
      {pattern: /了(?=[。！？\u4e00])/g, level: 1, desc_zh: '动态助词（了₁）', desc_en: 'Aspect particle (了₁)'},
      {pattern: /[\u4e00-\u9fff]+着[\u4e00-\u9fff]*/g, level: 3, desc_zh: '持续体（V着…）', desc_en: 'Durative aspect (V着…)'},
      {pattern: /[\u4e00-\u9fff]+过[\u4e00-\u9fff]*/g, level: 2, desc_zh: '经历体（V过…）', desc_en: 'Experiential aspect (V过…)'},

      // ─── 能愿动词 ───
      {pattern: /会[\u4e00-\u9fff]/g, level: 1, desc_zh: '能愿动词（会）', desc_en: 'Modal verb (会)'},
      {pattern: /能[\u4e00-\u9fff]/g, level: 1, desc_zh: '能愿动词（能）', desc_en: 'Modal verb (能)'},
      {pattern: /想[\u4e00-\u9fff]/g, level: 1, desc_zh: '能愿动词（想）', desc_en: 'Modal verb (想)'},
      {pattern: /要[\u4e00-\u9fff]/g, level: 1, desc_zh: '能愿动词（要）', desc_en: 'Modal verb (要)'},

      // ─── 频率 / 范围副词 ───
      {pattern: /常常|经常|往往|通常|有时|偶尔/g, level: 1, desc_zh: '频率副词', desc_en: 'Frequency adverb'},
      {pattern: /一起|一块儿/g, level: 1, desc_zh: '协同副词（一起）', desc_en: 'Adverb (一起)'},
      {pattern: /都(?!是)/g, level: 1, desc_zh: '范围副词（都）', desc_en: 'Range adverb (都)'},
      {pattern: /也/g, level: 1, desc_zh: '关联副词（也）', desc_en: 'Adverb (也)'},
      {pattern: /还(?!是)/g, level: 1, desc_zh: '关联副词（还）', desc_en: 'Adverb (还)'},
      {pattern: /再[来看去吃说写做]/g, level: 1, desc_zh: '副词（再）', desc_en: 'Adverb (再)'},
      {pattern: /先[^，。？！]{0,4}[然后再后]/g, level: 1, desc_zh: '时间副词（先…再）', desc_en: 'Adverb (先…再)'},

      // ═══════════════════════════════════════════════════════════════
      // Level 2 — 初级 Elementary (HSK 2)
      // 时体标记、比较句、能愿扩展、可能补语、时间表达、动量
      // ═══════════════════════════════════════════════════════════════

      // ─── 时态 / 体标记 ───
      {pattern: /正在[\u4e00-\u9fff]{1,8}/g, level: 2, desc_zh: '进行体（正在）', desc_en: 'Progressive (正在)'},
      {pattern: /正[\u4e00-\u9fff]{1,4}呢/g, level: 2, desc_zh: '进行体（正…呢）', desc_en: 'Progressive (正…呢)'},
      {pattern: /已经[\u4e00-\u9fff]{1,10}了/g, level: 2, desc_zh: '完成体（已经…了）', desc_en: 'Perfective (已经…了)'},
      {pattern: /刚[刚才][\u4e00-\u9fff]{0,4}/g, level: 2, desc_zh: '短时体（刚/刚才）', desc_en: 'Recent past (刚/刚才)'},
      {pattern: /快要[^，。？！]{1,6}了|就要[^，。？！]{1,6}了/g, level: 2, desc_zh: '将完成体（快/就要…了）', desc_en: 'Imminent (快…了)'},

      // ─── 比较句（核心） ───
      {pattern: /比[\u4e00-\u9fff]{1,10}得?多/g, level: 2, desc_zh: '比较句（比…多）', desc_en: 'Comparative (比…多)'},
      {pattern: /比[\u4e00-\u9fff，]{1,10}[还更最]/g, level: 2, desc_zh: '比较句（比…还/更/最）', desc_en: 'Comparative (比…还/更/最)'},
      {pattern: /比[\u4e00-\u9fff，]{1,15}/g, level: 2, desc_zh: '比较句（比…）', desc_en: 'Comparative (比…)'},
      {pattern: /没有[\u4e00-\u9fff]{1,10}[好吃大漂亮高低快慢好远多]/g, level: 2, desc_zh: '比较句（没有…）', desc_en: 'Comparative (没有…)'},
      {pattern: /跟[^，。？！\n]{1,8}一[样般]/g, level: 2, desc_zh: '比较句（跟…一样）', desc_en: 'Comparative (跟…一样)'},
      {pattern: /不如[^，。？！\n]{1,8}/g, level: 2, desc_zh: '比较句（不如）', desc_en: 'Comparative (不如)'},

      // ─── 能愿动词扩展 ───
      {pattern: /应该|应当/g, level: 2, desc_zh: '能愿动词（应该）', desc_en: 'Modal (应该)'},
      {pattern: /可以/g, level: 2, desc_zh: '能愿动词（可以）', desc_en: 'Modal (可以)'},
      {pattern: /必须|得(děi)/g, level: 2, desc_zh: '能愿动词（必须）', desc_en: 'Modal (必须)'},
      {pattern: /愿意|肯|敢/g, level: 2, desc_zh: '能愿动词（愿意/肯/敢）', desc_en: 'Modal (愿意/肯/敢)'},

      // ─── 可能补语 ───
      {pattern: /[\u4e00-\u9fff]得到[\u4e00-\u9fff]/g, level: 2, desc_zh: '可能补语（…得到…）', desc_en: 'Potential complement (V得到V)'},
      {pattern: /[\u4e00-\u9fff]{1,4}不起|[\u4e00-\u9fff]{1,4}不到|[\u4e00-\u9fff]{1,4}不了/g, level: 3, desc_zh: '可能补语否定', desc_en: 'Potential complement negation'},
      {pattern: /[\u4e00-\u9fff]{1,4}得[完好起]/g, level: 3, desc_zh: '可能补语肯定', desc_en: 'Potential complement affirmative'},

      // ─── 把 / 被 句（初步引入） ───
      {pattern: /把(?=[\u4e00-\u9fff])/g, level: 2, desc_zh: '把字句（把）', desc_en: '把-construction (把)'},
      {pattern: /被(?=[\u4e00-\u9fff])/g, level: 2, desc_zh: '被字句（被）', desc_en: '被-construction (被)'},
      {pattern: /给(?=[\u4e00-\u9fff]{1,3}[看听说读写打送])/g, level: 2, desc_zh: '介词（给）', desc_en: 'Preposition (给)'},

      // ─── 时间表达 ───
      {pattern: /的时候/g, level: 2, desc_zh: '时间表达（…的时候）', desc_en: 'Time expression (…的时候)'},
      {pattern: /以前|以后/g, level: 2, desc_zh: '时间表达（以前/以后）', desc_en: 'Time expression (以前/以后)'},
      {pattern: /从[\u4e00-\u9fff0-9]{1,8}[开始起]/g, level: 2, desc_zh: '时间起点（从…起/开始）', desc_en: 'Time starting point (从…起/开始)'},
      {pattern: /到[\u4e00-\u9fff0-9]{1,12}为止/g, level: 2, desc_zh: '时间终点（到…为止）', desc_en: 'Time endpoint (到…为止)'},

      // ─── 自 + 时间（教学高频） ───
      {pattern: /自\d{4}年/g, level: 3, desc_zh: '自+时间（自+年份）', desc_en: '自+time (自+year)'},
      {pattern: /自\d{1,2}月/g, level: 3, desc_zh: '自+时间（自+月份）', desc_en: '自+time (自+month)'},
      {pattern: /自\d{1,2}日/g, level: 3, desc_zh: '自+时间（自+日期）', desc_en: '自+time (自+date)'},
      {pattern: /自\d{4}年\d{1,2}月\d{1,2}日/g, level: 3, desc_zh: '自+时间（自+年月日）', desc_en: '自+time (自+full date)'},
      {pattern: /自[前昨今明后][天日年月周]/g, level: 3, desc_zh: '自+时间（自+相对时间）', desc_en: '自+time (相对时间)'},
      {pattern: /自[春夏秋冬早晚夜间午初末]/g, level: 3, desc_zh: '自+时间（自+季节时段）', desc_en: '自+time (自+季节)'},
      {pattern: /自(?:过去|现在|将来|目前|当下|当时|如今|平时)/g, level: 3, desc_zh: '自+时间（自+时间名词）', desc_en: '自+time (自+时间名词)'},
      {pattern: /自[\u4e00-\u9fff0-9]{1,10}以来/g, level: 5, desc_zh: '自……以来', desc_en: '自…以来 (Since…)'},
      {pattern: /自[\u4e00-\u9fff0-9]{1,10}以后/g, level: 5, desc_zh: '自……以后', desc_en: '自…以后 (After…)'},
      {pattern: /自[\u4e00-\u9fff0-9]{1,10}起/g, level: 5, desc_zh: '自……起', desc_en: '自…起 (From…)'},
      {pattern: /自[\u4e00-\u9fff0-9]{1,8}/g, level: 3, desc_zh: '自+时间（通用）', desc_en: '自+time (general)'},

      // ─── 动量 / 动词重叠 ───
      {pattern: /[一二三四五六七八九十几多][次遍趟回场]/g, level: 2, desc_zh: '动量表达', desc_en: 'Verb frequency'},
      {pattern: /一下/g, level: 2, desc_zh: '动量补语（一下）', desc_en: 'Frequency complement (一下)'},

      // ─── "得"字补语初步 ───
      {pattern: /[\u4e00-\u9fff]得(?!并不)[\u4e00-\u9fff]{1,4}/g, level: 2, desc_zh: '程度补语初步', desc_en: 'Degree complement (basic)'},

      // ═══════════════════════════════════════════════════════════════
      // Level 3 — 中级 Intermediate (HSK 3-4)
      // 关联复句、把被完整、补语体系、强调句
      // ═══════════════════════════════════════════════════════════════

      // ─── 因果复句 ───
      {pattern: /因为[\u4e00-\u9fff，]{1,20}所以/g, level: 3, desc_zh: '因为……所以', desc_en: '因为……所以 (Because…so)'},
      {pattern: /由于[\u4e00-\u9fff，]{1,20}[因此所以因而]/g, level: 3, desc_zh: '由于……因此', desc_en: '由于……因此 (Due to…)'},
      {pattern: /[\u4e00-\u9fff]{1,10}是因为/g, level: 3, desc_zh: '……是因为', desc_en: '…是因为 (…is because)'},

      // ─── 转折让步复句 ───
      {pattern: /虽然[\u4e00-\u9fff，]{1,20}但是/g, level: 3, desc_zh: '虽然……但是', desc_en: '虽然……但是 (Although…but)'},
      {pattern: /虽然[\u4e00-\u9fff，]{1,20}可是|虽然[\u4e00-\u9fff，]{1,20}不过/g, level: 3, desc_zh: '虽然……可是/不过', desc_en: '虽然……可是 (Although…however)'},
      {pattern: /但是|可是|不过/g, level: 3, desc_zh: '转折连词', desc_en: 'But (但是/可是/不过)'},

      // ─── 条件假设复句 ───
      {pattern: /如果[\u4e00-\u9fff，]{1,20}就/g, level: 3, desc_zh: '如果……就', desc_en: '如果……就 (If…then)'},
      {pattern: /要是[\u4e00-\u9fff，]{1,20}就|假如[\u4e00-\u9fff，]{1,20}就/g, level: 3, desc_zh: '要是/假如……就', desc_en: '要是……就 (If…then)'},
      {pattern: /只有[\u4e00-\u9fff，]{1,15}才/g, level: 3, desc_zh: '只有……才', desc_en: '只有……才 (Only if…then)'},
      {pattern: /只要[\u4e00-\u9fff，]{1,15}就|只要[\u4e00-\u9fff，]{1,15}便/g, level: 3, desc_zh: '只要……就', desc_en: '只要……就 (As long as…then)'},
      {pattern: /无论[\u4e00-\u9fff，]{1,15}都|无论[\u4e00-\u9fff，]{1,15}也|不管[\u4e00-\u9fff，]{1,15}都|不管[\u4e00-\u9fff，]{1,15}也/g, level: 3, desc_zh: '无论/不管……都/也', desc_en: '无论……都 (No matter…)'},

      // ─── 递进并列复句 ───
      {pattern: /不但[\u4e00-\u9fff，]{1,15}而且|不但[\u4e00-\u9fff，]{1,15}还|不但[\u4e00-\u9fff，]{1,15}也/g, level: 3, desc_zh: '不但……而且/还/也', desc_en: '不但……而且 (Not only…but also)'},
      {pattern: /一边[\u4e00-\u9fff，]{1,10}一边/g, level: 3, desc_zh: '一边……一边', desc_en: '一边……一边 (Simultaneous)'},
      {pattern: /又[\u4e00-\u9fff，；]{1,8}又/g, level: 3, desc_zh: '又……又', desc_en: '又……又 (Both…and)'},
      {pattern: /越[\u4e00-\u9fff，]{1,8}越/g, level: 3, desc_zh: '越……越', desc_en: '越……越 (The more…the more)'},
      {pattern: /除了[\u4e00-\u9fff，]{1,12}以外|除了[\u4e00-\u9fff，]{1,12}之外/g, level: 3, desc_zh: '除了……以外', desc_en: '除了……以外 (Besides)'},
      {pattern: /除了[\u4e00-\u9fff，]{1,12}还|除了[\u4e00-\u9fff，]{1,12}也/g, level: 3, desc_zh: '除了……还/也', desc_en: '除了……还 (Besides…also)'},

      // ─── 目的复句 ───
      {pattern: /为了[\u4e00-\u9fff]{1,15}/g, level: 3, desc_zh: '目的（为了）', desc_en: 'Purpose (为了)'},

      // ─── 把字句完整形式 ───
      {pattern: /把[\u4e00-\u9fff]{2,15}得/g, level: 3, desc_zh: '把字句（把…得）', desc_en: '把-construction (把…得)'},
      {pattern: /把[\u4e00-\u9fff]{2,15}了/g, level: 3, desc_zh: '把字句（把…了）', desc_en: '把-construction (把…了)'},
      {pattern: /把[\u4e00-\u9fff]{2,15}[放在送给带给扔丢吃喝拿拉推搬翻收拾洗打扫收发寄]/g, level: 3, desc_zh: '把字句', desc_en: '把-construction'},

      // ─── 被字句完整形式 ───
      {pattern: /被[\u4e00-\u9fff]{1,12}[吃了打了发现了知道看见听到]/g, level: 3, desc_zh: '被字句', desc_en: '被-construction'},
      {pattern: /叫[\u4e00-\u9fff]{1,10}[给]?了|让[\u4e00-\u9fff]{1,10}[给]?了/g, level: 3, desc_zh: '被动（叫/让）', desc_en: 'Passive (叫/让)'},
      {pattern: /被[\u4e00-\u9fff]{1,10}给/g, level: 3, desc_zh: '被……给', desc_en: '被…给 (Passive with 给)'},

      // ─── 程度 / 结果补语 ───
      {pattern: /得[\u4e00-\u9fff]{1,12}[好快慢对错清楚漂亮干净厉害糟糕辛苦轻松]/g, level: 3, desc_zh: '程度补语（V+得+adj）', desc_en: 'Degree complement (V+得+adj)'},
      {pattern: /得[\u4e00-\u9fff；，]{1,8}[很非常太真]/g, level: 3, desc_zh: '程度补语（V+得+程度副词）', desc_en: 'Degree complement (V+得+degree)'},

      // ─── 趋向补语 ───
      {pattern: /[\u4e00-\u9fff]出来|[\u4e00-\u9fff]进去|[\u4e00-\u9fff]上去|[\u4e00-\u9fff]下来|[\u4e00-\u9fff]过来|[\u4e00-\u9fff]过去|[\u4e00-\u9fff]起来|[\u4e00-\u9fff]回来|[\u4e00-\u9fff]回去/g, level: 3, desc_zh: '趋向补语', desc_en: 'Directional complement'},

      // ─── 结果补语 ───
      {pattern: /到[\u4e00-\u9fff]{1,10}了/g, level: 3, desc_zh: '结果补语（…到…了）', desc_en: 'Result complement (…到…了)'},
      {pattern: /[\u4e00-\u9fff]{1,3}[到见完好坏错对住懂透明白清楚干净走跑开]/g, level: 2, desc_zh: '结果补语（V+结果）', desc_en: 'Result complement (V+result)'},

      // ─── 强调 / 固定格式 ───
      {pattern: /是[\u4e00-\u9fff，]{2,20}的/g, level: 4, desc_zh: '是…的 强调句', desc_en: '是…的 cleft sentence'},
      {pattern: /连[\u4e00-\u9fff，]{1,10}也[没不]/g, level: 3, desc_zh: '连……也（不/没）', desc_en: '连…也 (Even…)'},
      {pattern: /值得/g, level: 3, desc_zh: '值得', desc_en: '值得 (Worth)'},
      {pattern: /来不及|来得及/g, level: 3, desc_zh: '来得及/来不及', desc_en: '来得及/来不及'},
      {pattern: /忍不住|不得不|不能不/g, level: 3, desc_zh: '双重否定/情态', desc_en: 'Double negation'},
      {pattern: /越来越[\u4e00-\u9fff]{1,6}/g, level: 3, desc_zh: '越来越', desc_en: '越来越 (More and more)'},
      {pattern: /对[\u4e00-\u9fff]{1,8}[感兴趣满意意思]/g, level: 3, desc_zh: '对……（感兴趣/满意）', desc_en: '对…(interested/satisfied)'},
      {pattern: /除了/g, level: 3, desc_zh: '介词（除了）', desc_en: 'Preposition (除了)'},
      {pattern: /通过[\u4e00-\u9fff]{1,8}/g, level: 4, desc_zh: '介词（通过）', desc_en: 'Preposition (通过)'},
      {pattern: /按照[\u4e00-\u9fff]{1,8}/g, level: 4, desc_zh: '介词（按照）', desc_en: 'Preposition (按照)'},

      // ═══════════════════════════════════════════════════════════════
      // Level 4 — 中高级 Upper-Intermediate (HSK 4)
      // 让步转折进阶、条件假设变体、话语标记、强调句、比喻、总结
      // ═══════════════════════════════════════════════════════════════

      // ─── 让步转折进阶 ───
      {pattern: /尽管[\u4e00-\u9fff，]{1,18}但[是]?/g, level: 4, desc_zh: '尽管……但', desc_en: '尽管……但 (Despite…)'},
      {pattern: /即使[\u4e00-\u9fff，]{1,18}也[是]?/g, level: 4, desc_zh: '即使……也', desc_en: '即使……也 (Even if…)'},
      {pattern: /既然[\u4e00-\u9fff，]{1,15}就[是]?/g, level: 4, desc_zh: '既然……就', desc_en: '既然……就 (Since…then)'},
      {pattern: /与其[\u4e00-\u9fff，]{1,15}不如/g, level: 4, desc_zh: '与其……不如', desc_en: '与其……不如 (Rather than…)'},
      {pattern: /不是[\u4e00-\u9fff，]{1,12}而是/g, level: 4, desc_zh: '不是……而是', desc_en: '不是……而是 (Not…but rather)'},
      {pattern: /固然[\u4e00-\u9fff，；]{1,12}但/g, level: 4, desc_zh: '让步（固然……但）', desc_en: 'Concessive (固然…但)'},

      // ─── 条件假设变体 ───
      {pattern: /倘若[\u4e00-\u9fff，]{1,15}便|假若[\u4e00-\u9fff，]{1,15}则/g, level: 4, desc_zh: '假设（倘若/假若）', desc_en: 'Hypothetical (倘若/假若)'},
      {pattern: /的话[\u4e00-\u9fff，]{0,6}[那就]/g, level: 4, desc_zh: '假设（的话）', desc_en: 'Hypothetical (的话)'},

      // ─── 话语标记 ───
      {pattern: /换句话说|也就是说|换言之/g, level: 4, desc_zh: '话语标记（换言之）', desc_en: 'Discourse marker (换言之)'},
      {pattern: /例如|比如|举例来说/g, level: 4, desc_zh: '话语标记（例如）', desc_en: 'Discourse marker (例如)'},
      {pattern: /首先[\u4e00-\u9fff，]{1,12}其次|首先[\u4e00-\u9fff，]{1,12}然后|首先[\u4e00-\u9fff，]{1,12}接着/g, level: 4, desc_zh: '序数标记（首先…其次）', desc_en: 'Sequential marker'},
      {pattern: /总之|总的来说|一句话|简而言之/g, level: 4, desc_zh: '总结标记', desc_en: 'Summary marker'},
      {pattern: /具体来说|确切地说|准确地说/g, level: 4, desc_zh: '具体化标记', desc_en: 'Specification marker'},

      // ─── 强调 / 反问 ───
      {pattern: /正是|恰恰是|尤其是|特别是/g, level: 4, desc_zh: '强调（正是/尤其是）', desc_en: 'Emphasis (正是/尤其是)'},
      {pattern: /难道[\u4e00-\u9fff？?]{1,12}[？?]/g, level: 4, desc_zh: '反问（难道）', desc_en: 'Rhetorical question (难道)'},
      {pattern: /到底/g, level: 4, desc_zh: '强调疑问（到底）', desc_en: 'Emphatic question (到底)'},
      {pattern: /岂不是|何尝不是/g, level: 4, desc_zh: '反问（岂不是/何尝）', desc_en: 'Rhetorical question'},

      // ─── 因果 / 承接 ───
      {pattern: /因此[\u4e00-\u9fff]{0,10}/g, level: 4, desc_zh: '因果（因此）', desc_en: 'Causal (因此)'},
      {pattern: /于是|因而|故/g, level: 4, desc_zh: '承接（于是/因而）', desc_en: 'Sequential (于是/因而)'},

      // ─── 递进 / 对比 ───
      {pattern: /不仅[\u4e00-\u9fff，]{1,12}还|不仅[\u4e00-\u9fff，]{1,12}也|不仅[\u4e00-\u9fff，]{1,12}而且/g, level: 4, desc_zh: '不仅……还/也/而且', desc_en: '不仅…还 (Not only…)'},
      {pattern: /甚至[\u4e00-\u9fff，]{1,10}都|甚至于/g, level: 4, desc_zh: '递进（甚至）', desc_en: 'Progressive (甚至)'},
      {pattern: /之所以[\u4e00-\u9fff，]{1,18}是因为/g, level: 4, desc_zh: '之所以……是因为', desc_en: '之所以…是因为'},
      {pattern: /与其说[\u4e00-\u9fff，]{1,10}不如说/g, level: 4, desc_zh: '与其说……不如说', desc_en: '与其说…不如说'},

      // ─── 否定强调 ───
      {pattern: /并非|并不是|并没有/g, level: 4, desc_zh: '否定强调（并非）', desc_en: 'Emphatic negation (并非)'},

      // ─── 比喻 ───
      {pattern: /像[\u4e00-\u9fff，]{1,12}[一样一般似的]/g, level: 4, desc_zh: '比喻（像……一样）', desc_en: 'Simile (像…一样)'},
      {pattern: /好像[\u4e00-\u9fff，]{1,12}[一样]/g, level: 4, desc_zh: '比喻（好像……一样）', desc_en: 'Simile (好像…一样)'},

      // ═══════════════════════════════════════════════════════════════
      // Level 5 — 高级 Advanced (HSK 5)
      // 书面语标记、反预期、目的、伴随、复杂关联、高级时间表达、书面程度副词
      // ═══════════════════════════════════════════════════════════════

      // ─── 转折 / 反预期 ───
      {pattern: /然而|不过|可是/g, level: 5, desc_zh: '转折（然而/不过/可是）', desc_en: 'Transition (然而/不过)'},
      {pattern: /恰恰相反|恰恰是|恰恰/g, level: 5, desc_zh: '反预期（恰恰）', desc_en: 'Counter-expectation (恰恰)'},
      {pattern: /反而|反倒/g, level: 5, desc_zh: '反转（反而）', desc_en: 'Reversal (反而)'},
      {pattern: /不料|没想到|谁知|谁料/g, level: 5, desc_zh: '反预期（不料/没想到）', desc_en: 'Counter-expectation (不料)'},
      {pattern: /尽管如此|即便如此|虽然如此/g, level: 5, desc_zh: '让步总结', desc_en: 'Concessive summary'},
      {pattern: /即便[\u4e00-\u9fff，]{1,15}也/g, level: 5, desc_zh: '让步（即便…也）', desc_en: 'Concessive (即便…也)'},

      // ─── 目的 / 原因 ───
      {pattern: /旨在|意在|目的在于|目的就是/g, level: 5, desc_zh: '目的表达', desc_en: 'Purpose expression'},
      {pattern: /以致|以至于/g, level: 5, desc_zh: '结果（以致）', desc_en: 'Result (以致)'},
      {pattern: /鉴于|考虑到/g, level: 5, desc_zh: '原因（鉴于/考虑到）', desc_en: 'Reason (鉴于)'},

      // ─── 伴随 / 并存 ───
      {pattern: /与此同时|同时/g, level: 5, desc_zh: '并存（与此同时）', desc_en: 'Co-occurrence (与此同时)'},
      {pattern: /随着[\u4e00-\u9fff，]{1,15}[的增加的变化的发展的提高的进步的深入]/g, level: 5, desc_zh: '伴随（随着）', desc_en: 'Accompanying (随着)'},
      {pattern: /伴随着[\u4e00-\u9fff，]{1,10}/g, level: 5, desc_zh: '伴随（伴随着）', desc_en: 'Accompanying (伴随着)'},

      // ─── 介词结构 / 限定 ───
      {pattern: /以[\u4e00-\u9fff，]{1,10}为/g, level: 5, desc_zh: '介词结构（以…为）', desc_en: 'Prepositional structure (以…为)'},
      {pattern: /以[\u4e00-\u9fff，]{1,10}为基础|以[\u4e00-\u9fff，]{1,10}为中心|以[\u4e00-\u9fff，]{1,10}为代表/g, level: 5, desc_zh: '介词结构（以…为基础）', desc_en: 'Prepositional structure (以…为)'},
      {pattern: /对此|就此|对此而言|就此而言/g, level: 5, desc_zh: '指代（对此）', desc_en: 'Reference (对此)'},
      {pattern: /由[\u4e00-\u9fff，]{1,10}[的负责承担担任主持主导]/g, level: 5, desc_zh: '被动标记（由…的）', desc_en: 'Passive marker (由…)'},

      // ─── 强调断言 ───
      {pattern: /不可否认|毋庸置疑|不言而喻/g, level: 5, desc_zh: '强调断言', desc_en: 'Emphatic assertion'},
      {pattern: /不切实际|不约而同|不言而喻|不可思议|不自量力|不以为然|不知所措|不遗余力|不寒而栗|不以为意|不胫而走|不速之客|不可思议|一尘不染|一举两得|一鸣惊人|一举成名|一帆风顺|一蹴而就|一分为二|一针见血|心不在焉|画蛇添足|守株待兔|亡羊补牢|揠苗助长|刻舟求剑|对牛弹琴|杯弓蛇影|叶公好龙|井底之蛙|自相矛盾|掩耳盗铃|塞翁失马|望梅止渴|纸上谈兵|破釜沉舟|卧薪尝胆|四面楚歌|负荆请罪|完璧归赵|毛遂自荐|三顾茅庐|狐假虎威|画龙点睛|胸有成竹|津津有味|小心翼翼|自言自语|自由自在|各种各样|名副其实|理直气壮|理所当然|有声有色|入乡随俗|见义勇为|取长补短|异口同声|千方百计|深思熟虑|从容不迫|持之以恒|自强不息|兢兢业业|废寝忘食|争先恐后|奋发图强|众志成城|万众一心|齐心协力|和衷共济|同舟共济|相辅相成|相得益彰|相映成趣|举一反三|触类旁通|融会贯通|豁然开朗|恍然大悟|喜出望外|目瞪口呆|哑口无言|啼笑皆非|哭笑不得|忍俊不禁|莞尔一笑|喜忧参半|悲喜交加|乐此不疲|乐在其中|津津乐道|赞不绝口|叹为观止|叹为观止|拍案叫绝|拍手称快|爱不释手|依依不舍|恋恋不舍|念念不忘|朝思暮想|魂牵梦萦|心驰神往|梦寐以求|望眼欲穿|翘首以盼/g, level: 5, desc_zh: '成语/四字格', desc_en: 'Idiom / Four-character expression'},
      {pattern: /所谓/g, level: 5, desc_zh: '话语标记（所谓）', desc_en: 'Discourse marker (所谓)'},

      // ─── 并列关联 ───
      {pattern: /一方面[\u4e00-\u9fff，]{1,12}另一方面/g, level: 5, desc_zh: '并列（一方面…另一方面）', desc_en: 'Coordination (一方面…另一方面)'},
      {pattern: /既[\u4e00-\u9fff，]{0,5}又[\u4e00-\u9fff，]{0,5}|既[\u4e00-\u9fff，]{0,5}也[\u4e00-\u9fff，]{0,5}/g, level: 5, desc_zh: '并列（既…又/也）', desc_en: 'Coordination (既…又)'},

      // ─── 书面否定 ───
      {pattern: /尚未|仍未|并未|无从|未必/g, level: 5, desc_zh: '书面否定（尚未/未必）', desc_en: 'Written negation (尚未)'},

      // ─── 高级时间表达 ───
      {pattern: /在[\u4e00-\u9fff，]{1,12}当天/g, level: 5, desc_zh: '时间表达（在…当天）', desc_en: 'Time expression (在…当天)'},
      {pattern: /在[\u4e00-\u9fff，]{1,12}那[天晚刻候]/g, level: 5, desc_zh: '时间表达（在…那天/晚）', desc_en: 'Time expression (在…那天/晚)'},
      {pattern: /在[\u4e00-\u9fff，]{1,12}此[时刻间天]/g, level: 5, desc_zh: '时间表达（在…此刻）', desc_en: 'Time expression (在…此刻)'},
      {pattern: /在[\u4e00-\u9fff，]{1,12}[之前之后期间]/g, level: 5, desc_zh: '时间表达（在…之前/后）', desc_en: 'Time expression (在…之前/后)'},
      {pattern: /在[\u4e00-\u9fff，]{1,12}时(?!候)/g, level: 5, desc_zh: '时间表达（在…时）', desc_en: 'Time expression (在…时)'},
      {pattern: /自[\u4e00-\u9fff，]{1,8}以来/g, level: 5, desc_zh: '时间结构（自…以来）', desc_en: 'Time structure (自…以来)'},
      {pattern: /迄今为止|时至今日|至今|直到现在/g, level: 5, desc_zh: '时间表达（至今）', desc_en: 'Time expression (迄今)'},

      // ─── 书面程度副词 ───
      {pattern: /极为|极其|格外|分外|颇为|相当|十分|异常|尤为/g, level: 5, desc_zh: '书面程度副词', desc_en: 'Written degree adverb'},

      // ─── 高级介词 ───
      {pattern: /关于[\u4e00-\u9fff]{1,10}/g, level: 4, desc_zh: '介词（关于）', desc_en: 'Preposition (关于)'},
      {pattern: /对于[\u4e00-\u9fff]{1,10}/g, level: 4, desc_zh: '介词（对于）', desc_en: 'Preposition (对于)'},
      {pattern: /正[因由于为][\u4e00-\u9fff]{0,6}如此/g, level: 5, desc_zh: '因果（正因如此）', desc_en: 'Causal (正因为如此)'},

      // ═══════════════════════════════════════════════════════════════
      // Level 6 — 精通 Proficient (HSK 6 / Academic)
      // 文言成分、高级关联、学术书面语、评价表达、复杂句式、引用标记、推论标记
      // ═══════════════════════════════════════════════════════════════

      // ─── 文言否定 ───
      {pattern: /而非|非但/g, level: 6, desc_zh: '文言否定（而非）', desc_en: 'Classical negation (而非)'},
      {pattern: /未[\u4e00-\u9fff]{0,4}[能可曾]|未尝|未曾/g, level: 6, desc_zh: '文言否定（未）', desc_en: 'Classical negation (未)'},

      // ─── 书面语介词/连词 ───
      {pattern: /则[\u4e00-\u9fff]?/g, level: 6, desc_zh: '书面语（则）', desc_en: 'Written (则)'},
      {pattern: /于[\u4e00-\u9fff]{1,6}/g, level: 6, desc_zh: '书面介词（于）', desc_en: 'Written prep (于)'},
      {pattern: /毕业于[\u4e00-\u9fff]{1,10}/g, level: 6, desc_zh: '书面语（毕业于）', desc_en: 'Written (毕业于)'},

      // ─── 文言成分 ───
      {pattern: /亦[\u4e00-\u9fff，]{0,6}[无不未是]/g, level: 6, desc_zh: '文言成分（亦）', desc_en: 'Classical element (亦)'},
      {pattern: /亦[\u4e00-\u9fff，]{0,3}是|亦是/g, level: 6, desc_zh: '文言判断（亦/亦是）', desc_en: 'Classical copula'},
      {pattern: /且[\u4e00-\u9fff，]{0,4}[不未]|且[\u4e00-\u9fff，]{0,8}而言/g, level: 6, desc_zh: '文言递进/限定', desc_en: 'Classical progressive'},
      {pattern: /若[\u4e00-\u9fff，]{0,6}则|若[\u4e00-\u9fff，]{0,6}便/g, level: 6, desc_zh: '文言条件（若…则）', desc_en: 'Classical conditional'},
      {pattern: /在此|于此|至此|届时/g, level: 6, desc_zh: '文言指示代词', desc_en: 'Classical demonstrative'},

      // ─── 高级让步 ───
      {pattern: /任凭|哪怕|纵然/g, level: 6, desc_zh: '高级让步', desc_en: 'Advanced concessive'},
      {pattern: /诚然[\u4e00-\u9fff，]{1,12}但[是]?/g, level: 6, desc_zh: '高级让步（诚然）', desc_en: 'Advanced concessive (诚然)'},
      {pattern: /尽管[\u4e00-\u9fff，；]{1,15}[如此仍然依旧依然还是]/g, level: 6, desc_zh: '高级让步（尽管…仍）', desc_en: 'Advanced concessive (尽管…仍)'},

      // ─── 高级总结 / 承接 ───
      {pattern: /归根结底|总而言之|综上所述|概而言之|总体而言|总的来说/g, level: 6, desc_zh: '总结标记', desc_en: 'Summary marker'},
      {pattern: /进而|从而|继而|随后/g, level: 6, desc_zh: '高级承接', desc_en: 'Advanced sequential'},

      // ─── 高级递进 ───
      {pattern: /乃至|甚至于|以至于/g, level: 6, desc_zh: '递进（乃至）', desc_en: 'Progressive (乃至)'},

      // ─── 评价表达 ───
      {pattern: /毋庸置疑|无可厚非|无可非议|不足为奇|不言而喻/g, level: 6, desc_zh: '评价表达', desc_en: 'Evaluation expression'},
      {pattern: /毋庸[讳言赘述置言质疑]/g, level: 6, desc_zh: '书面语（毋庸）', desc_en: 'Written (毋庸)'},

      // ─── 目的 / 结构 ───
      {pattern: /以期|旨在/g, level: 6, desc_zh: '目的（以期）', desc_en: 'Purpose (以期)'},
      {pattern: /一方面[\u4e00-\u9fff，]{1,15}另一方面/g, level: 6, desc_zh: '高级并列', desc_en: 'Advanced coordination'},
      {pattern: /处于[\u4e00-\u9fff，]{1,10}状态|处于[\u4e00-\u9fff，]{1,10}阶段/g, level: 6, desc_zh: '状态表达', desc_en: 'State expression'},

      // ─── 视角 / 限定表达 ───
      {pattern: /从[\u4e00-\u9fff，]{1,12}来看|从[\u4e00-\u9fff，]{1,12}而言|从[\u4e00-\u9fff，]{1,12}出发/g, level: 6, desc_zh: '视角标记', desc_en: 'Perspective marker'},
      {pattern: /对[\u4e00-\u9fff，]{1,12}而言|就[\u4e00-\u9fff，]{1,12}而言|在[\u4e00-\u9fff，]{1,12}看来/g, level: 6, desc_zh: '限定表达（…而言）', desc_en: 'Limiting expression (…而言)'},

      // ─── 高级介词结构 ───
      {pattern: /作为[\u4e00-\u9fff，]{1,10}[的重要的关键的核心的基础的主要]/g, level: 6, desc_zh: '作为…', desc_en: '作为… (As…)'},
      {pattern: /基于[\u4e00-\u9fff，]{1,10}/g, level: 6, desc_zh: '基于', desc_en: 'Based on (基于)'},

      // ─── 书面语连接 ───
      {pattern: /亦[\u4e00-\u9fff，]{0,6}/g, level: 6, desc_zh: '高级关联（亦）', desc_en: 'Advanced conjunction (亦)'},
      {pattern: /诚如[\u4e00-\u9fff，]{1,10}所言|正如[\u4e00-\u9fff，]{1,10}所说/g, level: 6, desc_zh: '引用标记（诚如/正如）', desc_en: 'Citation marker'},
      {pattern: /由此可见|综上可见|由此可知|由此看来/g, level: 6, desc_zh: '推论标记（由此可见）', desc_en: 'Inference marker'},

      // ─── 书面语副词 ───
      {pattern: /甚[\u4e00-\u9fff，]{0,3}/g, level: 6, desc_zh: '书面程度副词（甚）', desc_en: 'Written degree adverb (甚)'},
      {pattern: /往往|每每|时常/g, level: 6, desc_zh: '书面频率副词', desc_en: 'Written frequency adverb'},
      {pattern: /但凡|凡是/g, level: 6, desc_zh: '条件（但凡/凡是）', desc_en: 'Condition (但凡/凡是)'},
      {pattern: /竟[\u4e00-\u9fff，]{0,4}|竟然[\u4e00-\u9fff，]{0,6}|居然[\u4e00-\u9fff，]{0,6}/g, level: 6, desc_zh: '意外（竟然/居然）', desc_en: 'Unexpected (竟然/居然)'},
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
    return [
      // ═══ 时间表达结构 ═══
      // 在 + [时间短语] + 时间名词
      { head: '在', tail: '当天', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…当天）', desc_en: 'Time expression (在…当天)'},
      { head: '在', tail: '那天', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…那天）', desc_en: 'Time expression (在…那天)'},
      { head: '在', tail: '那晚', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…那晚）', desc_en: 'Time expression (在…那晚)'},
      { head: '在', tail: '那时', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…那时）', desc_en: 'Time expression (在…那时)'},
      { head: '在', tail: '此时', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…此时）', desc_en: 'Time expression (在…此时)'},
      { head: '在', tail: '此刻', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…此刻）', desc_en: 'Time expression (在…此刻)'},
      { head: '在', tail: '那一刻', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…那一刻）', desc_en: 'Time expression (在…那一刻)'},
      { head: '在', tail: '那时候', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…那时候）', desc_en: 'Time expression (在…那时候)'},
      { head: '在', tail: '之前', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…之前）', desc_en: 'Time expression (在…之前)'},
      { head: '在', tail: '之后', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…之后）', desc_en: 'Time expression (在…之后)'},
      { head: '在', tail: '期间', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…期间）', desc_en: 'Time expression (在…期间)'},
      { head: '在', tail: '过程中', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间表达（在…过程中）', desc_en: 'Time expression (在…过程中)'},
      { head: '在', tail: '以后', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 4, desc_zh: '时间表达（在…以后）', desc_en: 'Time expression (在…以后)'},
      { head: '在', tail: '以前', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 4, desc_zh: '时间表达（在…以前）', desc_en: 'Time expression (在…以前)'},

      // 当 + [时间短语] + 时/时候
      { head: '当', tail: '时候', gap: {min: 1, max: 18}, exclude: '，。？！；\n', level: 2, desc_zh: '时间表达（当…时候）', desc_en: 'Time expression (当…时候)'},
      { head: '当', tail: '时', gap: {min: 1, max: 18}, exclude: '，。？！；\n', level: 2, desc_zh: '时间表达（当…时）', desc_en: 'Time expression (当…时)'},

      // 从 + [时间/处所] + 起/开始
      { head: '从', tail: '起', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 2, desc_zh: '时间起点（从…起）', desc_en: 'Time starting point (从…起)'},
      { head: '从', tail: '开始', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 2, desc_zh: '时间起点（从…开始）', desc_en: 'Time starting point (从…开始)'},

      // 到 + [时间/处所] + 为止
      { head: '到', tail: '为止', gap: {min: 1, max: 16}, exclude: '，。？！；\n', level: 2, desc_zh: '时间终点（到…为止）', desc_en: 'Time endpoint (到…为止)'},

      // 自 + [时间] + 以来/以后/起
      { head: '自', tail: '以来', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间结构（自…以来）', desc_en: 'Time structure (自…以来)'},
      { head: '自', tail: '以后', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间结构（自…以后）', desc_en: 'Time structure (自…以后)'},
      { head: '自', tail: '起', gap: {min: 1, max: 14}, exclude: '，。？！；\n', level: 5, desc_zh: '时间结构（自…起）', desc_en: 'Time structure (自…起)'},

      // ═══ 比较结构 ═══
      { head: '跟', tail: '一样', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 2, desc_zh: '比较句（跟…一样）', desc_en: 'Comparative (跟…一样)'},
      { head: '跟', tail: '差不多', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 3, desc_zh: '比较句（跟…差不多）', desc_en: 'Comparative (跟…差不多)'},
      { head: '跟', tail: '不同', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 3, desc_zh: '比较句（跟…不同）', desc_en: 'Comparative (跟…不同)'},
      { head: '与', tail: '不同', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 4, desc_zh: '比较（与…不同）', desc_en: 'Comparative (与…不同)'},
      { head: '与', tail: '相比', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 4, desc_zh: '比较（与…相比）', desc_en: 'Comparative (与…相比)'},

      // ═══ 被动/处置结构 ═══
      { head: '被', tail: '给', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 3, desc_zh: '被字句（被…给…）', desc_en: '被-construction (被…给…)'},
      { head: '被', tail: '了', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 3, desc_zh: '被字句（被…了）', desc_en: '被-construction (被…了)'},
      { head: '叫', tail: '给', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 3, desc_zh: '被动（叫…给…）', desc_en: 'Passive (叫…给…)'},
      { head: '让', tail: '给', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 3, desc_zh: '被动（让…给…）', desc_en: 'Passive (让…给…)'},
      { head: '由', tail: '负责', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 5, desc_zh: '被动标记（由…负责）', desc_en: 'Passive (由…负责)'},
      { head: '由', tail: '担任', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 5, desc_zh: '被动标记（由…担任）', desc_en: 'Passive (由…担任)'},

      // ═══ 强调结构 ═══
      { head: '连', tail: '都', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 3, desc_zh: '连…都', desc_en: '连…都 (Even…)'},
      { head: '连', tail: '也', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 3, desc_zh: '连…也', desc_en: '连…也 (Even…)'},

      // ═══ 介词结构 ═══
      { head: '对', tail: '感兴趣', gap: {min: 0, max: 8}, exclude: '，。？！；\n', level: 3, desc_zh: '对……感兴趣', desc_en: '对…interested in'},
      { head: '对', tail: '满意', gap: {min: 0, max: 8}, exclude: '，。？！；\n', level: 3, desc_zh: '对……满意', desc_en: '对…satisfied with'},
      { head: '为', tail: '而', gap: {min: 1, max: 8}, exclude: '，。？！；\n', level: 5, desc_zh: '目的（为…而…）', desc_en: 'Purpose (为…而…)'},
      { head: '以', tail: '为', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 5, desc_zh: '介词（以…为）', desc_en: 'Preposition (以…为)'},

      // ═══ 补语结构 ═══
      { head: '看得', tail: '见', gap: {min: 0, max: 3}, exclude: '，。？！；\n', level: 2, desc_zh: '可能补语（看得见）', desc_en: 'Potential complement (看得见)'},
      { head: '听', tail: '得懂', gap: {min: 0, max: 3}, exclude: '，。？！；\n', level: 2, desc_zh: '可能补语（听得懂）', desc_en: 'Potential complement (听得懂)'},

      // ═══ 自 + 时间（兜底，补充正则未覆盖的） ═══
      { head: '自', tail: '开始', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 5, desc_zh: '时间结构（自…开始）', desc_en: 'Time structure (自…开始)'},
      { head: '自', tail: '结束', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 5, desc_zh: '时间结构（自…结束）', desc_en: 'Time structure (自…结束)'},
    ];
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
          source: 'database',
          gpId: info.gpId || ''
        });
      }
    }

    // Phase 5: Remove overlapping matches
    // Strategy: Sort by position → length desc → level desc.
    // Overlap resolution:
    //   - If two matches have DIFFERENT levels, BOTH can coexist (they annotate different grammar layers)
    //   - If two matches have the SAME level, keep the longer/more specific one
    //   - Exception: if one is FULLY contained in another at the SAME level, keep the longer
    result.matches.sort((a, b) => a.position - b.position || b.pattern.length - a.pattern.length || b.level - a.level);
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

        // Same level: if one fully contains the other, keep the longer
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

      // Build request body — avoid response_format for compatibility
      const requestBody = {
        model: this.llmConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
      };

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
      const content = data.choices?.[0]?.message?.content || '';

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

      // Re-run Phase 5 overlap resolution on merged results
      localResult.matches.sort((a, b) => a.position - b.position || b.pattern.length - a.pattern.length || b.level - a.level);
      const mergedFiltered = [];
      for (let i = 0; i < localResult.matches.length; i++) {
        const m = localResult.matches[i];
        let dominated = false;
        for (let j = 0; j < mergedFiltered.length; j++) {
          const f = mergedFiltered[j];
          const fStart = f.position, fEnd = f.position + f.pattern.length;
          const mStart = m.position, mEnd = m.position + m.pattern.length;
          const overlap = Math.max(0, Math.min(fEnd, mEnd) - Math.max(fStart, mStart));
          const shorterLen = Math.min(f.pattern.length, m.pattern.length);
          if (overlap === 0) continue;
          if (f.level !== m.level) continue; // Different levels → coexist
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
