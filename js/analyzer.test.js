/**
 * @file analyzer.test.js
 * @description 墨析 GrammarAnalyzer 回归测试套件
 *
 * 运行方式（Node.js，需将 GRAMMAR_DATA / HSK_VOCAB / MoxiPatternsConfig 先 require）：
 *   node analyzer.test.js
 *
 * 或通过浏览器：在 HTML 中先加载 grammar-data.js、hsk-vocab-dict.js、
 * patterns-config.js、analyzer.js，再加载此文件，控制台查看结果。
 *
 * 测试分类：
 *   Unit      - 对单一 pattern / 方法的精确断言
 *   Smoke     - 对 analyze() 输出的快速健全性检查
 *   Regression- 修复 bug 后防止回归的断言
 */

(function runTests() {
  'use strict';

  // ─────────────────────────────────────────────
  // 最简测试框架
  // ─────────────────────────────────────────────
  let passed = 0, failed = 0;

  function assert(condition, label) {
    if (condition) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${label}`);
      failed++;
    }
  }

  function assertMatch(text, grammarPointSubstr, label) {
    const result = analyzer.analyze(text, 'zh');
    const found = result.matches.some(m =>
      m.grammarPoint.includes(grammarPointSubstr) ||
      m.pattern.includes(grammarPointSubstr)
    );
    assert(found, label || `"${text}" 应识别 "${grammarPointSubstr}"`);
  }

  function assertNoMatch(text, patternSubstr, label) {
    const result = analyzer.analyze(text, 'zh');
    const found = result.matches.some(m => m.pattern.includes(patternSubstr));
    assert(!found, label || `"${text}" 不应包含 pattern "${patternSubstr}"`);
  }

  function assertLevel(text, expectedLevel, label) {
    const result = analyzer.analyze(text, 'zh');
    assert(
      result.suggestedLevel === expectedLevel,
      label || `"${text}" 推荐等级应为 HSK${expectedLevel}，实际 HSK${result.suggestedLevel}`
    );
  }

  function group(name, fn) {
    console.group(`\n📦 ${name}`);
    fn();
    console.groupEnd();
  }

  // ─────────────────────────────────────────────
  // 测试开始
  // ─────────────────────────────────────────────
  if (typeof GrammarAnalyzer === 'undefined' || typeof GRAMMAR_DATA === 'undefined') {
    console.error('[analyzer.test.js] 未检测到 GrammarAnalyzer 或 GRAMMAR_DATA，请先加载依赖文件。');
    return;
  }

  const analyzer = new GrammarAnalyzer(GRAMMAR_DATA);

  // ──────────────────────────────────────────────────────────────
  // UNIT: _suggestLevel — 不应因 lvl 为字符串而出现 NaN
  // ──────────────────────────────────────────────────────────────
  group('Unit: _suggestLevel', () => {
    const fakeDist = { '2': 3, '4': 1 };
    const fakeResult = { matches: [1, 2, 3, 4], levelDistribution: fakeDist };
    const level = analyzer._suggestLevel(fakeResult);
    assert(typeof level === 'number' && !isNaN(level), '_suggestLevel 返回有效数字（无 NaN）');
    assert(level >= 1 && level <= 6, `_suggestLevel 结果在 1-6 范围内（实际 ${level}）`);
  });

  // ──────────────────────────────────────────────────────────────
  // UNIT: _posLabelZh / _posLabelEn
  // ──────────────────────────────────────────────────────────────
  group('Unit: _posLabelZh / _posLabelEn', () => {
    assert(analyzer._posLabelZh('副') === '副词', '_posLabelZh("副") → 副词');
    assert(analyzer._posLabelZh('时间') === '时间词', '_posLabelZh("时间") → 时间词（多字 key）');
    assert(analyzer._posLabelZh('xyz') === '词', '_posLabelZh 未知标签 → 词');
    assert(analyzer._posLabelEn('连') === 'Conjunction', '_posLabelEn("连") → Conjunction');
    assert(analyzer._posLabelEn('方位') === 'Locative', '_posLabelEn("方位") → Locative');
  });

  // ──────────────────────────────────────────────────────────────
  // UNIT: _resolveOverlaps — 同等级重叠保留优先级更高的
  // ──────────────────────────────────────────────────────────────
  group('Unit: _resolveOverlaps', () => {
    const m1 = { pattern: '因为', grammarPoint: 'A', level: 3, position: 0, source: 'database' };
    const m2 = { pattern: '因为所以', grammarPoint: 'B', level: 3, position: 0, source: 'builtin' };
    const result = analyzer._resolveOverlaps([m1, m2]);
    // builtin(2) > database(1)，且 builtin 更长 → 保留 m2
    assert(result.length === 1, '_resolveOverlaps 同等级重叠后只剩 1 个');
    assert(result[0].grammarPoint === 'B', '_resolveOverlaps 保留 builtin（高优先级）');

    // 不同等级应共存
    const m3 = { pattern: '所以', grammarPoint: 'C', level: 2, position: 2, source: 'builtin' };
    const m4 = { pattern: '所以去', grammarPoint: 'D', level: 4, position: 2, source: 'builtin' };
    const result2 = analyzer._resolveOverlaps([m3, m4]);
    assert(result2.length === 2, '_resolveOverlaps 不同等级重叠时共存（2 个）');
  });

  // ──────────────────────────────────────────────────────────────
  // UNIT: _splitSentences
  // ──────────────────────────────────────────────────────────────
  group('Unit: _splitSentences', () => {
    const sents = analyzer._splitSentences('你好。我叫玛丽！');
    assert(sents.length === 2, '_splitSentences 正确拆分两句');
    assert(sents[0].text === '你好。', '_splitSentences 第一句含标点');
  });

  // ──────────────────────────────────────────────────────────────
  // REGRESSION: NON_COMPLEMENT 白名单
  // ──────────────────────────────────────────────────────────────
  group('Regression: NON_COMPLEMENT 白名单', () => {
    // "觉得" 不应被误识别为程度补语
    assertNoMatch('我觉得你说得对。', '觉得', '"觉得" 不应被识别为补语 pattern');
    assertNoMatch('值得一试。', '值得', '"值得" 不应被识别为补语 pattern');
  });

  // ──────────────────────────────────────────────────────────────
  // REGRESSION: 别+VP 宽泛匹配
  // ──────────────────────────────────────────────────────────────
  group('Regression: 别+VP 模式', () => {
    assertMatch('别担心，没事的。', '否定祈使', '"别担心" 应匹配否定祈使');
    assertMatch('别客气，请坐。', '否定祈使', '"别客气" 应匹配否定祈使');
    assertMatch('你别乱动！', '否定祈使', '"别乱动" 应匹配否定祈使（通用模式）');
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: HSK1 例句
  // ──────────────────────────────────────────────────────────────
  group('Smoke: HSK1 例句', () => {
    const text = '你好，我叫玛丽。我是学生，我在北京大学学习中文。';
    const result = analyzer.analyze(text, 'zh');
    assert(result.matches.length > 0, 'HSK1 例句有匹配结果');
    assert(result.suggestedLevel >= 1 && result.suggestedLevel <= 3, `HSK1 例句推荐等级合理（${result.suggestedLevel}）`);
    assert(result.charCount === text.length, 'charCount 与文本长度一致');
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: HSK3 例句（把字句/虽然…但是）
  // ──────────────────────────────────────────────────────────────
  group('Smoke: HSK3 例句', () => {
    const text = '虽然学习中文很难，但是我觉得很有意思。他把作业放在桌子上。';
    assertMatch(text, '虽然', '"虽然…但是" 应被识别');
    assertMatch(text, '把', '"把字句" 应被识别');
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: 一边…一边… (v5.3 新增)
  // ──────────────────────────────────────────────────────────────
  group('Smoke: 一边…一边…', () => {
    assertMatch('他一边听音乐一边做作业。', '一边', '"一边…一边…" 应被识别');
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: 越来越… / 越…越…
  // ──────────────────────────────────────────────────────────────
  group('Smoke: 越来越 / 越…越', () => {
    assertMatch('天气越来越冷了。', '越来越', '"越来越" 应被识别');
    assertMatch('他越跑越快。', '越…越', '"越…越" 应被识别');
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: 结构化模式（连…都 / 是…的）
  // ──────────────────────────────────────────────────────────────
  group('Smoke: 结构化模式', () => {
    assertMatch('连他都来了。', '连…都', '"连…都" 结构化模式应被识别');
    assertMatch('我是昨天来的。', '是…的', '"是…的" 强调句应被识别');
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: 不管…都 / 无论…都（v5.3 新增）
  // ──────────────────────────────────────────────────────────────
  group('Smoke: 条件句 不管/无论', () => {
    assertMatch('不管天气怎样，他都去跑步。', '不管…都', '"不管…都" 应被识别');
    assertMatch('无论遇到什么困难，都不应该放弃。', '无论…都', '"无论…都" 应被识别');
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: 双重否定（v5.3 新增）
  // ──────────────────────────────────────────────────────────────
  group('Smoke: 双重否定', () => {
    assertMatch('他不得不接受这个结果。', '双重否定', '"不得不" 应被识别为双重否定');
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: 是非疑问句 / 正反疑问
  // ──────────────────────────────────────────────────────────────
  group('Smoke: 疑问句式', () => {
    assertMatch('你吃过北京烤鸭吗？', '疑问', '"吗" 疑问应被识别');
    assertMatch('你去不去？', '正反疑问', '"V不V" 正反疑问应被识别');
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: analyze 双语输出
  // ──────────────────────────────────────────────────────────────
  group('Smoke: 双语输出', () => {
    const zhResult = analyzer.analyze('他把书放好了。', 'zh');
    const enResult = analyzer.analyze('他把书放好了。', 'en');
    assert(zhResult.matches.length > 0, 'ZH 模式有匹配');
    assert(enResult.matches.length > 0, 'EN 模式有匹配');
    const zhGP = zhResult.matches.find(m => m.pattern.includes('把'));
    const enGP = enResult.matches.find(m => m.pattern.includes('把'));
    if (zhGP && enGP) {
      assert(zhGP.grammarPoint !== enGP.grammarPoint, '同一 pattern 中英文描述不同');
    }
  });

  // ──────────────────────────────────────────────────────────────
  // SMOKE: 空文本 / 极短文本 不崩溃
  // ──────────────────────────────────────────────────────────────
  group('Smoke: 边界情况', () => {
    let errEmpty = null;
    try { analyzer.analyze('', 'zh'); } catch (e) { errEmpty = e; }
    assert(errEmpty === null, '空文本不抛出异常');

    let errShort = null;
    let shortResult;
    try { shortResult = analyzer.analyze('好', 'zh'); } catch (e) { errShort = e; }
    assert(errShort === null, '单字文本不抛出异常');
    assert(shortResult && typeof shortResult.suggestedLevel === 'number', '单字文本返回合法结果');

    let errLong = null;
    try { analyzer.analyze('测'.repeat(15000), 'zh'); } catch (e) { errLong = e; }
    assert(errLong === null, '超长文本不抛出异常');
  });

  // ──────────────────────────────────────────────────────────────
  // 汇总
  // ──────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 测试结果：${passed}/${total} 通过${failed > 0 ? `，${failed} 失败` : ' ✅'}`);
  if (failed > 0) {
    console.warn('⚠️  存在失败用例，请检查上方标红的输出。');
  }
})();
