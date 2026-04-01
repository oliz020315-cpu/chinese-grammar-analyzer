/**
 * MoxiAnalyzer Patterns Configuration
 * 
 * Extracted from analyzer.js for easier maintenance and testing.
 * All regex patterns are defined here; structural patterns below.
 * 
 * Usage: This file sets window.MoxiPatternsConfig which is read by GrammarAnalyzer.
 */

// ═══════════════════════════════════════════════════════════════
// BUILT-IN REGEX PATTERNS
// Each: { pattern: /regex/g, level: 1-6, desc_zh, desc_en }
// ═══════════════════════════════════════════════════════════════

const BUILTIN_PATTERNS = [

  // ═══════════════════════════════════════════════════════════════
  // Level 1 — 基础 Basic (HSK 1)
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
  {pattern: /太[\u4e00-\u9fff]{1,6}了/g, level: 1, desc_zh: '程度副词（太…了）', desc_en: 'Degree adverb (太…了)'},
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
  {pattern: /(认真|仔细|小心|快速|大声|小声|安静|轻松|高兴|生气|伤心|难过|着急|悄悄|默默|狠狠|使劲|拼命|努力|积极|热情|冷淡|粗暴|温柔|勇敢|大胆|坚决|果断|犹豫|缓慢|轻轻|慢慢|快快|渐渐|逐步|逐一|偷偷|公然|明确|始终|不断|不停|一再|再三|反复|来回)地[\u4e00-\u9fff]{1,8}/g, level: 2, desc_zh: '结构助词（…地…）', desc_en: 'Structural particle (…地…)'},
  {pattern: /[\u4e00-\u9fff]{1,10}得(?!并不)[\u4e00-\u9fff]{1,10}/g, level: 3, desc_zh: '程度/状态补语（…得…）', desc_en: 'Degree/state complement (…得…)'},

  // ─── 简单并列结构 ───
  {pattern: /[\u4e00-\u9fff]{2,6}并[\u4e00-\u9fff]{2,6}/g, level: 3, desc_zh: '并列结构（A并B）', desc_en: 'Coordinating structure (A and B)'},
  {pattern: /了(?=[。！？\u4e00])/g, level: 1, desc_zh: '动态助词（了₁）', desc_en: 'Aspect particle (了₁)'},
  {pattern: /[\u4e00-\u9fff]{1,6}着[\u4e00-\u9fff]{0,4}/g, level: 3, desc_zh: '持续体（V着…）', desc_en: 'Durative aspect (V着…)'},
  {pattern: /[\u4e00-\u9fff]{1,6}过[\u4e00-\u9fff]{0,4}/g, level: 2, desc_zh: '经历体（V过…）', desc_en: 'Experiential aspect (V过…)'},

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
  {pattern: /[\u4e00-\u9fff]{1,6}得(?!并不)[\u4e00-\u9fff]{1,4}/g, level: 2, desc_zh: '程度补语初步', desc_en: 'Degree complement (basic)'},

  // ═══════════════════════════════════════════════════════════════
  // Level 3 — 中级 Intermediate (HSK 3-4)
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
  {pattern: /不但[\u4e00-\u9fff，]{1,15}而且|不但[\u4e00-\u9fff，]{1,15}还|不但[\u4e00-\u9fff，]{1,15}也/g, level: 3, desc_zh: '不但……而且/还/也', desc_en: '不但……而且 (Not only…)'},
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
  {pattern: /[\u4e00-\u9fff]{1,4}出来|[\u4e00-\u9fff]{1,4}进去|[\u4e00-\u9fff]{1,4}上去|[\u4e00-\u9fff]{1,4}下来|[\u4e00-\u9fff]{1,4}过来|[\u4e00-\u9fff]{1,4}过去|[\u4e00-\u9fff]{1,4}起来|[\u4e00-\u9fff]{1,4}回来|[\u4e00-\u9fff]{1,4}回去/g, level: 3, desc_zh: '趋向补语', desc_en: 'Directional complement'},

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
  {pattern: /在[\u4e00-\u9fff，]{1,12}以前/g, level: 4, desc_zh: '时间表达（在…以前）', desc_en: 'Time expression (在…以前)'},
  {pattern: /当[\u4e00-\u9fff，]{1,18}时候/g, level: 2, desc_zh: '时间表达（当…时候）', desc_en: 'Time expression (当…时候)'},
  {pattern: /当[\u4e00-\u9fff，]{1,18}时(?!候)/g, level: 2, desc_zh: '时间表达（当…时）', desc_en: 'Time expression (当…时)'},
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


// ═══════════════════════════════════════════════════════════════
// STRUCTURAL PATTERNS (head-tail gap matching, for complex structures)
// Each: { head, tail, gap: {min, max}, exclude, level, desc_zh, desc_en }
// ═══════════════════════════════════════════════════════════════

const STRUCTURAL_PATTERNS = [
  // ── 比较/对比（多词尾） ──
  { head: '跟', tail: '差不多', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 3, desc_zh: '比较句（跟…差不多）', desc_en: 'Comparative (跟…差不多)'},
  { head: '跟', tail: '不同', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 3, desc_zh: '比较句（跟…不同）', desc_en: 'Comparative (跟…不同)'},
  { head: '与', tail: '不同', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 4, desc_zh: '比较（与…不同）', desc_en: 'Comparative (与…不同)'},
  { head: '与', tail: '相比', gap: {min: 1, max: 10}, exclude: '，。？！；\n', level: 4, desc_zh: '比较（与…相比）', desc_en: 'Comparative (与…相比)'},

  // ── 强调结构 ──
  { head: '连', tail: '都', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 3, desc_zh: '连…都', desc_en: '连…都 (Even…)'},
  { head: '连', tail: '也', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 3, desc_zh: '连…也', desc_en: '连…也 (Even…)'},

  // ── 补语兜底 ──
  { head: '看得', tail: '见', gap: {min: 0, max: 3}, exclude: '，。？！；\n', level: 2, desc_zh: '可能补语（看得见）', desc_en: 'Potential complement (看得见)'},
  { head: '听', tail: '得懂', gap: {min: 0, max: 3}, exclude: '，。？！；\n', level: 2, desc_zh: '可能补语（听得懂）', desc_en: 'Potential complement (听得懂)'},

  // ── 自+时间兜底 ──
  { head: '自', tail: '开始', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 5, desc_zh: '时间结构（自…开始）', desc_en: 'Time structure (自…开始)'},
  { head: '自', tail: '结束', gap: {min: 1, max: 12}, exclude: '，。？！；\n', level: 5, desc_zh: '时间结构（自…结束）', desc_en: 'Time structure (自…结束)'},
];


// ═══════════════════════════════════════════════════════════════
// NON-COMPLEMENT WORDS (含"得"但不是补语结构的词)
// ═══════════════════════════════════════════════════════════════

const NON_COMPLEMENT_WORDS = ['觉得', '懂得', '晓得', '获得', '取得', '赢得', '记得', '值得', '懒得', '免得', '博得'];


// ═══════════════════════════════════════════════════════════════
// EXPORT — attach to window for traditional <script> loading
// ═══════════════════════════════════════════════════════════════

window.MoxiPatternsConfig = {
  builtinPatterns: BUILTIN_PATTERNS,
  structuralPatterns: STRUCTURAL_PATTERNS,
  nonComplementWords: NON_COMPLEMENT_WORDS
};
