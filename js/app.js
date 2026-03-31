/**
 * 墨析 · App Module
 * Connects grammar-data.js & analyzer.js with the ink-wash themed UI.
 */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────
  const analyzer = new GrammarAnalyzer(GRAMMAR_DATA);
  let currentLang = 'zh';
  let currentLevelFilter = 'all';
  let pieChart = null;
  let barChart = null;
  let statsBarChart = null;

  // ── i18n ──────────────────────────────────────────────
  const I18N = {
    zh: {
      brand: '墨析',
      brand_sub: '语法等级分析',
      nav_analyze: '析文',
      nav_browse: '览纲',
      nav_stats: '观象',
      analyze_title: '落笔成文，探其法度',
      analyze_subtitle: '输入中文文本，识别语法特征，判定等级难度',
      input_placeholder: '在此输入或粘贴中文文本…',
      examples: '范本：',
      analyze_btn: '开始分析',
      stat_chars: '字数',
      stat_sentences: '句数',
      stat_suggested: '推荐等级',
      stat_max: '最高等级',
      chart_distribution: '语法等级分布',
      chart_bar: '等级柱状图',
      highlight_title: '语法标注文本',
      matches_title: '匹配详情',
      suggestions_title: '分析建议',
      browse_title: '览纲 · 语法等级大纲',
      browse_subtitle: '按等级浏览《国际中文教育中文水平等级标准》语法点',
      search_placeholder: '搜索语法点…',
      stats_title: '观象 · 数据统计',
      stats_subtitle: '各等级语法点数量概览',
      stats_chart_title: '各等级语法点数量',
      footer: '基于《国际中文教育中文水平等级标准》(GF 0025-2021) · 仅供学术研究',
      no_results: '暂无匹配的语法点',
      total_points: '语法点总数',
      avg_per_level: '平均每级',
      most_points: '语法点最多等级',
      match_count: '语法点数量',
      points_unit: '个语法点',
    },
    en: {
      brand: 'MoXi',
      brand_sub: 'Grammar Analyzer',
      nav_analyze: 'Analyze',
      nav_browse: 'Browse',
      nav_stats: 'Statistics',
      analyze_title: 'Analyze the ink, reveal the structure',
      analyze_subtitle: 'Enter Chinese text to identify grammar features and determine difficulty level',
      input_placeholder: 'Paste or type Chinese text here…',
      examples: 'Samples:',
      analyze_btn: 'Analyze',
      stat_chars: 'Characters',
      stat_sentences: 'Sentences',
      stat_suggested: 'Suggested Level',
      stat_max: 'Max Level',
      chart_distribution: 'Grammar Level Distribution',
      chart_bar: 'Level Bar Chart',
      highlight_title: 'Annotated Text',
      matches_title: 'Match Details',
      suggestions_title: 'Suggestions',
      browse_title: 'Grammar Standards',
      browse_subtitle: 'Browse grammar points from GF 0025-2021 by level',
      search_placeholder: 'Search grammar points…',
      stats_title: 'Grammar Statistics',
      stats_subtitle: 'Overview of grammar points by level',
      stats_chart_title: 'Grammar Points by Level',
      footer: 'Based on GF 0025-2021 · For academic research only',
      no_results: 'No matching grammar points',
      total_points: 'Total Points',
      avg_per_level: 'Avg per Level',
      most_points: 'Most Points',
      match_count: 'Grammar Points',
      points_unit: 'points',
    }
  };

  // ── Example texts ────────────────────────────────────
  const EXAMPLES = {
    l1: '你好，我叫玛丽。我是学生，我在北京大学学习中文。我有一个哥哥和一个妹妹。',
    l2: '我正在学习中文，已经学了半年了。他比我高，跑得也比谁都快。你吃过北京烤鸭吗？',
    l3: '虽然学习中文很难，但是我觉得很有意思。因为明天要考试，所以我现在正在复习。他一边听音乐一边做作业。',
    l4: '即使天气再冷，他也要去跑步。无论遇到什么困难，都不应该放弃。与其在家看电视，不如出去走走。',
    l5: '恰恰相反，这种观点缺乏数据支撑。鉴于目前的形势，我们旨在寻找更有效的解决方案，以致于最终达成共识。',
    l6: '综上所述，归根结底，任凭环境如何变化，我们亦毋庸讳言：纵使前路坎坷，但此方案旨在从根本上解决长期积累的结构性问题。',
  };

  // ── Init ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initInkCanvas();
    bindNav();
    bindAnalyzePage();
    bindBrowsePage();
    bindLangToggle();
    bindMobileMenu();
    bindKeyboard();
  });

  // ── Ink Canvas Background ─────────────────────────────
  function initInkCanvas() {
    const canvas = document.getElementById('inkCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    const blobs = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Create ink blobs
    for (let i = 0; i < 6; i++) {
      blobs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 200 + 100,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.06 + 0.02,
      });
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (const b of blobs) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const b of blobs) {
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < -b.r || b.x > w + b.r) b.dx *= -1;
        if (b.y < -b.r || b.y > h + b.r) b.dy *= -1;
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, `rgba(0,0,0,${b.opacity})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ── Navigation ────────────────────────────────────────
  function bindNav() {
    document.querySelectorAll('.nav-tab').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage(link.dataset.page);
      });
    });
    document.querySelectorAll('.mobile-tab').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage(link.dataset.page);
        closeMobileMenu();
      });
    });
  }

  function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
    document.querySelectorAll('.mobile-tab').forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
    if (pageId === 'stats') renderStatsPage();
    if (pageId === 'browse') renderBrowsePage();
  }

  // ── Language toggle ───────────────────────────────────
  function bindLangToggle() {
    document.getElementById('langToggle').addEventListener('click', () => {
      currentLang = currentLang === 'zh' ? 'en' : 'zh';
      applyI18n();
      const activePage = document.querySelector('.page.active');
      if (activePage) {
        if (activePage.id === 'page-stats') renderStatsPage();
        if (activePage.id === 'page-browse') renderBrowsePage();
      }
    });
  }

  function applyI18n() {
    const dict = I18N[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) el.placeholder = dict[key];
    });
  }

  // ── Mobile menu ───────────────────────────────────────
  function bindMobileMenu() {
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
      document.getElementById('mobileMenu').classList.toggle('hidden');
    });
  }
  function closeMobileMenu() {
    document.getElementById('mobileMenu').classList.add('hidden');
  }

  // ── Keyboard shortcut ─────────────────────────────────
  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('analyzeBtn').click();
      }
    });
  }

  // ── Analyze Page ──────────────────────────────────────
  function bindAnalyzePage() {
    document.querySelectorAll('[data-example]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.example;
        if (EXAMPLES[key]) document.getElementById('textInput').value = EXAMPLES[key];
      });
    });
    document.getElementById('analyzeBtn').addEventListener('click', runAnalysis);
  }

  function runAnalysis() {
    const text = document.getElementById('textInput').value.trim();
    if (!text) return;
    const result = analyzer.analyze(text, currentLang);
    renderResults(result);
  }

  function renderResults(result) {
    const container = document.getElementById('results');
    container.classList.remove('hidden');

    document.getElementById('statChars').textContent = result.charCount;
    document.getElementById('statSentences').textContent = result.sentenceCount;
    document.getElementById('statSuggested').textContent = LEVEL_NAMES[result.suggestedLevel] || result.suggestedLevel;
    document.getElementById('statMax').textContent = LEVEL_NAMES[result.maxLevel] || result.maxLevel;

    // Level description
    const descEl = document.getElementById('levelDesc');
    const langDesc = currentLang === 'zh' ? LEVEL_DESCRIPTIONS_ZH : LEVEL_DESCRIPTIONS_EN;
    const prefix = currentLang === 'zh'
      ? `推荐等级 ${result.suggestedLevel} 级：`
      : `Suggested Level ${result.suggestedLevel}: `;
    descEl.textContent = prefix + (langDesc[result.suggestedLevel] || '');

    renderCharts(result);
    renderHighlight(result);
    renderLegend(result);
    renderMatches(result);
    renderSuggestions(result);

    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Charts ────────────────────────────────────────────
  function renderCharts(result) {
    const levels = [1, 2, 3, 4, 5, 6];
    const labels = levels.map(l => LEVEL_NAMES[l] || ('L' + l));
    const data = levels.map(l => result.levelDistribution[l] || 0);
    const colors = levels.map(l => LEVEL_COLORS[l] || '#ccc');
    const hasData = data.some(d => d > 0);

    Chart.defaults.font.family = "'Noto Serif SC', 'Songti SC', serif";
    Chart.defaults.color = '#4a4a4a';

    if (pieChart) { pieChart.destroy(); pieChart = null; }
    if (barChart) { barChart.destroy(); barChart = null; }

    // Doughnut
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: hasData ? data : [1],
          backgroundColor: hasData ? colors : ['#e8dfd0'],
          borderWidth: 1,
          borderColor: '#f5f0e8',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, padding: 14, usePointStyle: true, pointStyleWidth: 10 }
          },
          tooltip: {
            backgroundColor: '#2c2c2c',
            titleFont: { family: "'Noto Serif SC', serif" },
            bodyFont: { family: "'Noto Serif SC', serif" },
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed;
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round(val / total * 100) : 0;
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    // Bar
    const barCtx = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: I18N[currentLang].match_count,
          data,
          backgroundColor: colors.map(c => c + 'AA'),
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#e8dfd0' } },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2c2c2c',
            titleFont: { family: "'Noto Serif SC', serif" },
            bodyFont: { family: "'Noto Serif SC', serif" },
          }
        }
      }
    });
  }

  // ── Highlight text ────────────────────────────────────
  function renderHighlight(result) {
    const el = document.getElementById('highlightedText');
    if (!result.matches.length) {
      el.textContent = result.text;
      return;
    }
    const text = result.text;
    let html = '';
    let lastIdx = 0;
    const sorted = [...result.matches].sort((a, b) => a.position - b.position);

    for (const m of sorted) {
      const start = m.position;
      const end = start + m.pattern.length;
      if (start < lastIdx) continue;
      html += escapeHtml(text.slice(lastIdx, start));
      html += `<span class="gm gm-${m.level}" title="${escapeHtml(m.grammarPoint)}">${escapeHtml(m.pattern)}</span>`;
      lastIdx = end;
    }
    html += escapeHtml(text.slice(lastIdx));
    el.innerHTML = html;
  }

  // ── Legend ─────────────────────────────────────────────
  function renderLegend(result) {
    const el = document.getElementById('legend');
    const levels = [...new Set(result.matches.map(m => m.level))].sort();
    el.innerHTML = levels.map(l =>
      `<span class="legend-badge" style="background:${LEVEL_COLORS[l]}">${LEVEL_NAMES[l] || 'L' + l}</span>`
    ).join('');
  }

  // ── Match list ────────────────────────────────────────
  function renderMatches(result) {
    const el = document.getElementById('matchesList');
    if (!result.matches.length) {
      el.innerHTML = `<div class="no-data">${I18N[currentLang].no_results}</div>`;
      return;
    }
    el.innerHTML = result.matches.map(m => `
      <div class="match-item">
        <span class="match-level" style="background:${LEVEL_COLORS[m.level]}">${LEVEL_NAMES[m.level] || 'L' + m.level}</span>
        <span class="match-pattern">${escapeHtml(m.pattern)}</span>
        <span>${escapeHtml(m.grammarPoint)}</span>
        <span class="match-source">[${m.source}]</span>
      </div>
    `).join('');
  }

  // ── Suggestions ───────────────────────────────────────
  function renderSuggestions(result) {
    const el = document.getElementById('suggestionsList');
    el.innerHTML = result.suggestions.map(s =>
      `<div class="suggestion-item">${s}</div>`
    ).join('');
  }

  // ── Browse Page ───────────────────────────────────────
  function bindBrowsePage() {
    document.getElementById('grammarSearch').addEventListener('input', () => renderBrowsePage());
  }

  function renderBrowsePage() {
    renderLevelTabs();
    renderGrammarList();
  }

  function renderLevelTabs() {
    const el = document.getElementById('levelTabs');
    const labels = { all: 'All', 1: '壹', 2: '贰', 3: '叁', 4: '肆', 5: '伍', 6: '陆' };
    let html = `<button class="lv-tab all ${currentLevelFilter === 'all' ? 'active' : ''}" data-level="all">${labels.all}</button>`;
    for (let l = 1; l <= 6; l++) {
      html += `<button class="lv-tab ${currentLevelFilter == l ? 'active' : ''}" data-level="${l}" style="background:${LEVEL_COLORS[l]}">${labels[l]}</button>`;
    }
    el.innerHTML = html;

    el.querySelectorAll('.lv-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentLevelFilter = tab.dataset.level;
        renderBrowsePage();
      });
    });
  }

  function renderGrammarList() {
    const el = document.getElementById('grammarList');
    const query = (document.getElementById('grammarSearch').value || '').trim().toLowerCase();

    let filtered = GRAMMAR_DATA;
    if (currentLevelFilter !== 'all') {
      const lvl = parseInt(currentLevelFilter);
      filtered = filtered.filter(gp => gp.level === lvl);
    }
    if (query) {
      filtered = filtered.filter(gp =>
        gp.name.toLowerCase().includes(query) ||
        gp.section.toLowerCase().includes(query) ||
        gp.id.toLowerCase().includes(query) ||
        (gp.examples || []).some(ex => ex.toLowerCase().includes(query))
      );
    }

    if (!filtered.length) {
      el.innerHTML = `<div class="no-data">${I18N[currentLang].no_results}</div>`;
      return;
    }

    el.innerHTML = filtered.map(gp => {
      const examplesHtml = (gp.examples || []).map(ex =>
        `<div>· ${escapeHtml(ex)}</div>`
      ).join('');

      return `
        <div class="grammar-item" data-gp-id="${escapeHtml(gp.id)}">
          <div class="grammar-item-header">
            <span class="gp-id" style="background:${LEVEL_COLORS[gp.level]}">${escapeHtml(gp.id)}</span>
            <span class="gp-name">${escapeHtml(gp.name)}</span>
            <span class="gp-section">${escapeHtml(gp.section)}</span>
          </div>
          <div class="gp-examples hidden">${examplesHtml}</div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.grammar-item').forEach(item => {
      item.addEventListener('click', () => {
        const exDiv = item.querySelector('.gp-examples');
        exDiv.classList.toggle('hidden');
      });
    });
  }

  // ── Stats Page ────────────────────────────────────────
  function renderStatsPage() {
    const dict = I18N[currentLang];
    const overviewEl = document.getElementById('statsOverview');
    const total = GRAMMAR_DATA.length;
    const avgPerLevel = (total / 6).toFixed(1);
    const levelCounts = {};
    for (let l = 1; l <= 6; l++) levelCounts[l] = 0;
    GRAMMAR_DATA.forEach(gp => { if (levelCounts[gp.level] !== undefined) levelCounts[gp.level]++; });
    const maxEntry = Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0];
    const maxLvl = maxEntry ? maxEntry[0] : '-';

    overviewEl.innerHTML = `
      <div class="r-stat">
        <div class="r-stat-val">${total}</div>
        <div class="r-stat-label">${dict.total_points}</div>
      </div>
      <div class="r-stat">
        <div class="r-stat-val">${avgPerLevel}</div>
        <div class="r-stat-label">${dict.avg_per_level}</div>
      </div>
      <div class="r-stat featured">
        <div class="r-stat-val" style="color:var(--accent-gold)">${maxLvl}级</div>
        <div class="r-stat-label">${dict.most_points}</div>
      </div>
    `;

    Chart.defaults.font.family = "'Noto Serif SC', 'Songti SC', serif";
    Chart.defaults.color = '#4a4a4a';

    if (statsBarChart) { statsBarChart.destroy(); statsBarChart = null; }
    const ctx = document.getElementById('statsBarChart').getContext('2d');
    const levels = [1, 2, 3, 4, 5, 6];
    statsBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: levels.map(l => LEVEL_NAMES[l] || ('L' + l)),
        datasets: [{
          label: dict.match_count,
          data: levels.map(l => levelCounts[l]),
          backgroundColor: levels.map(l => LEVEL_COLORS[l] + 'CC'),
          borderColor: levels.map(l => LEVEL_COLORS[l]),
          borderWidth: 1.5,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 10 }, grid: { color: '#e8dfd0' } },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2c2c2c',
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} ${dict.points_unit}`
            }
          }
        }
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
