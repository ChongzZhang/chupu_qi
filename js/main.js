// 《樗蒲宫棋》入口

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  Game.init(canvas);

  function loop(ts) {
    try {
      Game.update(ts);
      Game.render();
    } catch (err) {
      console.error('游戏主循环异常：', err);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  const detailTitle = document.getElementById('detail-title');
  const detailDesc = document.getElementById('detail-desc');
  let setupFocus = 'mode';

  function updateSetupDetail(focus) {
    if (focus) setupFocus = focus;
    if (!detailTitle || !detailDesc) return;

    const modeBtn = document.querySelector('.mode-btn.active');
    const mode = modeBtn ? modeBtn.dataset.mode : '2P';
    const aiBtn = document.querySelector('.ai-btn.active');
    const densityBtn = document.querySelector('.density-btn.active');

    if (setupFocus === 'density' && densityBtn) {
      const d = DATA.mazeDensities.find(m => m.id === String(Math.round(parseFloat(densityBtn.dataset.density) * 100)));
      if (d) {
        detailTitle.textContent = `迷宫 · ${d.label}`;
        detailDesc.textContent = d.desc;
        return;
      }
    }

    if (mode === '1P' && setupFocus === 'ai' && aiBtn) {
      const ai = DATA.aiLevels[parseInt(aiBtn.dataset.level, 10) - 1];
      if (ai) {
        detailTitle.textContent = `${ai.name} · ${ai.title}`;
        detailDesc.textContent = ai.desc;
        return;
      }
    }

    const md = DATA.modeDesc[mode] || DATA.modeDesc['2P'];
    detailTitle.textContent = md.title;
    detailDesc.textContent = md.desc;
  }

  document.getElementById('btn-start').addEventListener('click', () => {
    Audio.resume();
    Audio.uiClick();
    Game.showScreen('mode-select');
    updateSetupDetail('mode');
  });

  document.getElementById('btn-culture').addEventListener('click', () => {
    Audio.uiClick();
    Game.showScreen('culture-screen');
    buildCultureContent();
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    Audio.uiClick();
    Game.showScreen('settings-screen');
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const row = document.getElementById('ai-level-row');
      if (row) row.classList.toggle('hidden-col', btn.dataset.mode !== '1P');
      updateSetupDetail('mode');
      Audio.uiClick();
    });
  });

  document.querySelectorAll('.ai-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateSetupDetail('ai');
      Audio.uiClick();
    });
  });

  document.querySelectorAll('.density-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.density-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateSetupDetail('density');
      Audio.uiClick();
    });
  });

  document.getElementById('btn-go').addEventListener('click', () => {
    Audio.uiClick();
    Audio.resume();
    const modeBtn = document.querySelector('.mode-btn.active');
    const mode = modeBtn ? modeBtn.dataset.mode : '2P';
    const aiBtn = document.querySelector('.ai-btn.active');
    const aiLevel = aiBtn ? parseInt(aiBtn.dataset.level, 10) : 1;
    const densityBtn = document.querySelector('.density-btn.active');
    const density = densityBtn ? parseFloat(densityBtn.dataset.density) : 0.6;
    Game.showScreen('game-screen');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        Game.startGame(mode, aiLevel, density);
      });
    });
  });

  document.getElementById('btn-mode-back').addEventListener('click', () => {
    Audio.uiClick();
    Game.showScreen('main-menu');
  });

  document.getElementById('btn-settings-back').addEventListener('click', () => {
    Audio.uiClick();
    Game.showScreen('main-menu');
  });

  document.getElementById('btn-culture-back').addEventListener('click', () => {
    Audio.uiClick();
    Game.showScreen('main-menu');
  });

  const volSfx = document.getElementById('vol-sfx');
  const volAmb = document.getElementById('vol-amb');
  if (volSfx) volSfx.addEventListener('input', e => Audio.setSfxVolume(+e.target.value));
  if (volAmb) volAmb.addEventListener('input', e => Audio.setAmbVolume(+e.target.value));

  const DIR_MAP = {
    up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
  };
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      Audio.uiClick();
      const d = DIR_MAP[btn.dataset.dir];
      if (d) Game.tryMoveDirection(d[0], d[1]);
    });
  });

  function buildCultureContent() {
    const container = document.getElementById('culture-content');
    if (!container || container.dataset.built) return;
    container.dataset.built = '1';

    let html = '<section><h2>樗蒲历史沿革</h2><div class="timeline">';
    DATA.history.forEach(h => {
      html += `<div class="timeline-item"><span class="era">${h.era}</span><p>${h.desc}</p></div>`;
    });
    html += '</div></section>';

    html += '<section><h2>十采名堂</h2><table class="cai-table"><thead><tr><th>采名</th><th>筴数</th><th>类别</th><th>说明</th></tr></thead><tbody>';
    DATA.chupuTable.forEach(c => {
      html += `<tr><td>${c.name}</td><td>${c.points}</td><td>${c.royal ? '王采' : '甿采'}</td><td>${c.desc}</td></tr>`;
    });
    html += '</tbody></table></section>';

    html += '<section><h2>古籍引语</h2>';
    DATA.quotes.forEach(q => {
      html += `<blockquote><p>「${q.text}」</p><cite>— ${q.source}</cite></blockquote>`;
    });
    html += '</section>';

    html += '<section><h2>AI 对手简介</h2>';
    DATA.aiLevels.forEach(a => {
      html += `<div class="story"><h3>${a.name}（${a.title}）</h3><p>${a.desc}</p></div>`;
    });
    html += '</section>';

    html += '<section><h2>本局规则</h2><div class="story"><p>双方主棋自对角大本营出发，投五木决定步数，在迷宫中逐格择路。经过玉豆得分，先至十五分者胜。掷出王采（卢、白、雉、犊）可启用障碍技能：途中投放路障，己方通行，敌方踩之停一回合。</p></div></section>';

    container.innerHTML = html;
  }

  Game.showScreen('main-menu');
});
