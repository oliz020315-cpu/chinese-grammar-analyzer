// Quick test for GrammarAnalyzer v5.1 changes
// Run: node test-v51.js

const fs = require('fs');
const path = require('path');

// Load scripts in correct order
const grammarDataCode = fs.readFileSync(path.join(__dirname, 'js/grammar-data.js'), 'utf-8');
const patternsConfigCode = fs.readFileSync(path.join(__dirname, 'js/patterns-config.js'), 'utf-8');
const hskVocabCode = fs.readFileSync(path.join(__dirname, 'js/hsk-vocab-dict.js'), 'utf-8');
const analyzerCode = fs.readFileSync(path.join(__dirname, 'js/analyzer.js'), 'utf-8');

// Create a mock window object
const mockWindow = {};

// Execute in context
const vm = require('vm');
const context = { 
  window: mockWindow, 
  console, 
  setTimeout, 
  clearTimeout, 
  fetch: () => { throw new Error('no fetch in test'); },
  AbortController: class { abort() {} },
  HSK_VOCAB: undefined
};
vm.createContext(context);

try {
  vm.runInContext(grammarDataCode.replace(/^const /gm, 'var '), context);
  console.log('[OK] grammar-data.js loaded');
} catch (e) {
  console.error('[FAIL] grammar-data.js:', e.message);
  process.exit(1);
}

try {
  vm.runInContext(patternsConfigCode.replace(/^const /gm, 'var '), context);
  console.log('[OK] patterns-config.js loaded');
  console.log('  Built-in patterns:', context.window.MoxiPatternsConfig.builtinPatterns.length);
  console.log('  Structural patterns:', context.window.MoxiPatternsConfig.structuralPatterns.length);
} catch (e) {
  console.error('[FAIL] patterns-config.js:', e.message);
  process.exit(1);
}

try {
  const hskCode = hskVocabCode.replace(/^const /gm, 'var ');
  vm.runInContext(hskCode, context);
  console.log('[OK] hsk-vocab-dict.js loaded');
  console.log('  HSK words:', context.HSK_VOCAB.n);
} catch (e) {
  console.error('[FAIL] hsk-vocab-dict.js:', e.message);
  process.exit(1);
}

try {
  vm.runInContext(analyzerCode, context);
  console.log('[OK] analyzer.js loaded');
} catch (e) {
  console.error('[FAIL] analyzer.js:', e.message);
  process.exit(1);
}

// Create analyzer
const analyzer = new context.GrammarAnalyzer(context.GRAMMAR_DATA);

// Test sentences
const testCases = [
  {
    text: '我觉得这道菜还挺好吃的',
    expected: [
      '程度副词', '形容词', '疑问', '人称代词',
      '副词', '助词', '指示代词', '结构助词'
    ],
    description: '基础句：程度副词+形容词+语气词'
  },
  {
    text: '叫上其他同学一起来吃吧！',
    expected: ['祈使句', '连词', '副词', '名词', '人称代词'],
    description: '祈使句'
  },
  {
    text: '你觉得呢？',
    expected: ['疑问语气', '人称代词'],
    description: '句末疑问语气词'
  },
  {
    text: '他们明天去北京，我们后天去上海。',
    expected: ['时间词', '名词', '代词', '介词'],
    description: '时间表达+代词'
  },
  {
    text: '这个菜比那个菜好吃多了。',
    expected: ['比较句', '比较', '程度副词'],
    description: '比较句'
  },
  {
    text: '他不但会说中文，而且说得很好。',
    expected: ['不但', '而且', '程度副词', '副词'],
    description: '递进复句'
  },
  {
    text: '高高兴兴地去上学了。',
    expected: ['形容词重叠', '助词', '副词'],
    description: '形容词重叠AABB'
  },
  {
    text: '我们研究研究再说吧。',
    expected: ['动词重叠', '副词', '祈使句'],
    description: '动词重叠ABAB'
  }
];

console.log('\n' + '='.repeat(60));
console.log('GRAMMAR ANALYZER v5.1 TEST');
console.log('='.repeat(60));

let totalTests = 0;
let passCount = 0;
let failCount = 0;

for (const tc of testCases) {
  console.log(`\n📝 ${tc.description}`);
  console.log(`   Input: "${tc.text}"`);
  
  const result = analyzer.analyze(tc.text, 'zh');
  totalTests++;
  
  const matchDescs = result.matches.map(m => m.grammarPoint);
  const matchPatterns = result.matches.map(m => m.pattern);
  const sources = [...new Set(result.matches.map(m => m.source))];
  
  console.log(`   Found ${result.matches.length} matches (sources: ${sources.join(', ')})`);
  
  let allFound = true;
  for (const exp of tc.expected) {
    const found = matchDescs.some(d => d.includes(exp)) || matchPatterns.some(p => p.includes(exp));
    if (found) {
      console.log(`   ✅ ${exp}`);
      passCount++;
    } else {
      console.log(`   ❌ ${exp} (not found)`);
      allFound = false;
      failCount++;
    }
  }
  
  if (!allFound) {
    console.log('   Matched details:');
    for (const m of result.matches) {
      console.log(`     [L${m.level}] ${m.grammarPoint} ← "${m.pattern}" (${m.source})`);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passCount}/${totalTests + (totalTests - testCases.length)} checks passed, ${failCount} failed`);
console.log('='.repeat(60));

// Segmentation test
console.log('\n📊 SEGMENTATION TEST');
const segText = '我觉得这道菜还挺好吃的';
const tokens = analyzer._segment(segText);
console.log(`   Input: "${segText}"`);
console.log(`   Tokens (${tokens.length}):`);
for (const t of tokens) {
  console.log(`     "${t.w}" [L${t.level}] (${t.pos_tag}) @${t.pos}`);
}
