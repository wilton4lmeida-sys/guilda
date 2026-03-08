import { sb } from './modules/supabase.js';
import {
  BADGE_IMGS,
  LEVELS,
  demoMeetings,
  demoProfiles,
} from './modules/core-data.js';
// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  const content = document.getElementById(`tab-${tab}`);
  if (btn) btn.classList.add('active');
  if (content) content.classList.add('active');
  if (tab === 'ranking') loadRanking();
  else if (tab === 'arsenal') loadArsenal();
  else if (tab === 'missoes') loadMissoes();
  else if (tab === 'encontros') loadEncontros();
  else if (tab === 'diario') loadDiario();
  else if (tab === 'metricas') loadMetricas();
}

function switchRankTab(sub) {
  document.querySelectorAll('.rank-sub-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.rank-sub-panel').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  const panel = document.getElementById(`rank-panel-${sub}`);
  if (btn) btn.classList.add('active');
  if (panel) panel.classList.add('active');
}

function toggleTopic(id) {
  const el = document.getElementById(`topic-${id}`);
  if (el) el.classList.toggle('open');
}

// ═══════════════════════════════════════
// HERO CARD
// ═══════════════════════════════════════
function renderHero() {
  if (!userProfile) return;
  const xp = userProfile.xp || 0;
  const lvl = getLevelInfo(xp);
  const next = getNextLevel(lvl.level);
  const pct = next ? Math.min(100, Math.round(((xp - lvl.min) / (next.min - lvl.min)) * 100)) : 100;
  const remaining = next ? (next.min - xp).toLocaleString('pt-BR') : '—';

  // Badge
  const badgeImgEl = document.getElementById('heroBadgeImg');
  if (badgeImgEl && lvl.badge) {
    badgeImgEl.src = lvl.badge;
    badgeImgEl.style.display = 'block';
    const svgEl = document.getElementById('heroBadgeSvg');
    if (svgEl) svgEl.style.display = 'none';
  }
  // Remove emoji se existir
  const badgeEmojiEl = document.getElementById('heroBadgeEmoji');
  if (badgeEmojiEl) badgeEmojiEl.remove();

  // Badge level label
  const badgeLvlEl = document.getElementById('heroBadgeLevel');
  if (badgeLvlEl) badgeLvlEl.textContent = `NV ${lvl.level} · ${lvl.name}`;

  // Nome
  const nameEl = document.getElementById('heroName');
  if (nameEl) nameEl.textContent = userProfile.name || 'Membro';

  // Level badge
  const lvlBadgeEl = document.getElementById('heroLevelBadge');
  if (lvlBadgeEl) {
    lvlBadgeEl.textContent = `NÍVEL ${lvl.level}`;
  }

  const lvlNameEl = document.getElementById('heroLevelName');
  if (lvlNameEl) lvlNameEl.textContent = lvl.name || '';

  // XP bar
  const barEl = document.getElementById('xpFill');
  if (barEl) barEl.style.width = pct + '%';

  const xpCurEl = document.getElementById('heroXpCurrent');
  if (xpCurEl) xpCurEl.textContent = xp.toLocaleString('pt-BR') + ' XP';

  const xpRemEl = document.getElementById('heroXpRemaining');
  if (xpRemEl) xpRemEl.textContent = next ? `faltam ${remaining} XP` : 'Nível máximo';

  const nextLvlEl = document.getElementById('heroNextLevel');
  if (nextLvlEl && next) nextLvlEl.textContent = `próximo: ${next.name} N${next.level}`;
}

// ═══ FUNIL DASHBOARD ═══
async function renderFunilDash() {
  const el = document.getElementById('funilVisual');
  if (!el) return;

  const now = new Date();
  const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0');
  const lastDay = new Date(y, now.getMonth()+1, 0).getDate();
  const from = `${y}-${m}-01`;
  const to   = `${y}-${m}-${String(lastDay).padStart(2,'0')}`;

  let totalLig=0, totalConn=0, totalDec=0, totalReun=0;

  try {
    const { data: diary } = await sb.from('diary_entries').select('*')
      .eq('user_id', userSession.user.id)
      .gte('date', from).lte('date', to);
    if (diary && diary.length > 0) {
      diary.forEach(d => {
        totalLig  += d.contatos_tentados   || 0;
        totalConn += d.ligacoes_atendidas  || 0;
        totalDec  += d.conexao_decisor     || 0;
        totalReun += d.reunioes_marcadas   || 0;
      });
    }
  } catch(e) {
    // demo fallback
    totalLig=47; totalConn=23; totalDec=8; totalReun=2;
  }

  const steps = [
    { label: 'Ligações Totais',         vol: totalLig,  base: totalLig,   idx: 0 },
    { label: 'Conexões c/ Atendente',   vol: totalConn, base: totalLig,   idx: 1 },
    { label: 'Conexões c/ Decisor',     vol: totalDec,  base: totalLig,   idx: 2 },
    { label: 'Reuniões Agendadas',      vol: totalReun, base: totalLig,   idx: 3 },
  ];

  const maxVol = totalLig || 1;
  const badges = ['TOPO','ATEND.','DECISOR','REUNIÃO'];
  const icons  = ['📞','🤝','🎯','📅'];

  let html = '';
  steps.forEach((s, i) => {
    const barPct = Math.min(100, s.vol > 0 ? Math.round((s.vol / maxVol) * 100) : 0);
    const convPct = i > 0 && steps[i-1].vol > 0 
      ? ((s.vol / steps[i-1].vol) * 100).toFixed(0) + '%'
      : (i === 0 ? '100%' : '—');

    html += `<div class="funil-step-new step-${i}">`;
    html += `<div style="display:flex;align-items:center;gap:6px;padding-top:${i>0?'4px':'0'}">
      <span class="funil-step-label-badge">${icons[i]} ${badges[i]}</span>
      ${i > 0 ? `<span style="font-size:.94rem;color:rgba(160,150,100,.5);font-weight:600">→ conv. ${convPct}</span>` : ''}
    </div>`;
    html += `<div class="funil-bar-container">`;
    html += `<span class="funil-bar-label">${s.label}</span>`;
    html += `<div class="funil-bar-outer">
      <div class="funil-bar-fill" style="width:${barPct}%">
        ${barPct > 20 ? `<span class="funil-bar-pct">${barPct}%</span>` : ''}
      </div>
    </div>`;
    html += `<span class="funil-bar-vol">${s.vol.toLocaleString('pt-BR')}</span>`;
    html += `</div>`;
    if (i < steps.length - 1) {
      html += `<div class="funil-connector" style="background:rgba(245,197,24,.25)"></div>`;
    }
    html += `</div>`;
  });

  el.innerHTML = html || '<div class="funil-empty-state"><div style="font-size:2rem;margin-bottom:8px">📊</div><div style="font-size:.8rem;color:#5A584E">Preencha o diário para ver seu funil</div></div>';

  // Taxa geral
  const taxaEl = document.getElementById('funilTaxaGeral');
  if (taxaEl) {
    taxaEl.textContent = totalLig > 0 ? ((totalReun/totalLig)*100).toFixed(1)+'%' : '—';
  }
}

// ═══════════════════════════════════════
// RANKING
// ═══════════════════════════════════════
function loadRanking() {
  const list = demoProfiles.slice().sort((a, b) => b.xp - a.xp);
  const myId = userProfile?.id || 'demo-11';
  
  // Sub-aba membros
  const el = document.getElementById('rankMembersList');
  if (!el) return;

  let html = '';
  list.forEach((m, i) => {
    const lvlFull = getLevelInfo(m.xp);
    const isMe = m.id === myId || (m.name === (userProfile?.name));
    const pos = i + 1;
    const xpSz = pos <= 3 ? '.85rem' : '.78rem';
    html += buildRankRow(m, i, lvlFull, isMe, xpSz);
  });
  el.innerHTML = html;

  // Sub-aba insígnias
  const badgesEl = document.getElementById('rankBadgesGrid');
  renderBadgesGridEnhanced();
}

// ═══════════════════════════════════════
// ENCONTROS
// ═══════════════════════════════════════
function loadEncontros() {
  const el = document.getElementById('encontrosLista') || document.getElementById('encontrosList');
  if (!el) return;

  const userLevel = getLevelInfo(userProfile?.xp || 0).level;
  const encColors = [
    {bg:'rgba(18,18,20,1)',    brd:'rgba(255,255,255,.1)',   accent:'rgba(255,255,255,.15)'},
    {bg:'rgba(15,15,17,.98)',  brd:'rgba(255,255,255,.07)',  accent:'rgba(255,255,255,.1)'},
    {bg:'rgba(13,13,15,.96)',  brd:'rgba(255,255,255,.055)', accent:'rgba(255,255,255,.08)'},
    {bg:'rgba(11,11,13,.94)',  brd:'rgba(255,255,255,.04)',  accent:'rgba(255,255,255,.06)'},
  ];
  const platformColors = { 'Discord':'#7289DA', 'YouTube':'#FF4444', 'Google Meet':'#00C853' };
  const platformIcons  = { 'Discord':'🎮', 'YouTube':'▶️', 'Google Meet':'📹' };

  let html = '';
  demoMeetings.forEach((m, i) => {
    const locked = m.minLevel && userLevel < m.minLevel;
    const clr = encColors[i % encColors.length];
    const d = new Date(m.date + 'T12:00:00');
    const day = d.getDate().toString().padStart(2,'0');
    const month = d.toLocaleDateString('pt-BR', {month:'short'}).replace('.','').toUpperCase();
    const pColor = platformColors[m.location] || '#888';
    const pIcon  = platformIcons[m.location] || '📌';

    html += `<div style="
      background:${clr.bg};border:1px solid ${clr.brd};
      border-radius:14px;padding:16px 18px;
      display:flex;align-items:center;gap:16px;
      margin-bottom:10px;position:relative;
      ${locked ? 'filter:blur(1.5px) saturate(.2);pointer-events:none;opacity:.45;' : ''}
    ">`;
    
    // Data box
    html += `<div style="
      min-width:48px;width:48px;height:48px;border-radius:10px;
      background:rgba(245,197,24,.07);border:1px solid rgba(245,197,24,.15);
      display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;
    ">
      <div style="font-family:'JetBrains Mono',monospace;font-size:1.4rem;font-weight:900;color:#F5C518;line-height:1">${day}</div>
      <div style="font-size:.42rem;font-weight:700;letter-spacing:1px;color:#806A30;text-transform:uppercase">${month}</div>
    </div>`;

    // Info
    html += `<div style="flex:1;min-width:0">`;
    html += `<div style="font-size:.96rem;font-weight:700;color:#E8E6D8;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.title}</div>`;
    html += `<div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:.96rem;font-weight:700;color:${pColor}">${pIcon} ${m.location}</span>
      ${m.confirmed ? '<span style="font-size:.92rem;color:#22C55E;font-weight:600">● Confirmado</span>' : ''}
    </div>`;
    html += `</div>`;

    if (locked) {
      html += `<div style="position:absolute;top:8px;right:10px;font-size:.7rem;font-weight:700;color:#F87171">🔒 Nível ${m.minLevel}</div>`;
    }

    html += `</div>`;
  });
  
  el.innerHTML = html;
}



function getLevelInfo(xp) {
  return LEVELS.find(l => xp >= l.min && xp <= l.max) || LEVELS[0];
}
function getNextLevel(currentLevel) {
  return LEVELS.find(l => l.level === currentLevel + 1);
}

let userProfile = null;
let userSession = null;
let currentMaterial = null;
let materialProgress = {};

async function checkSession() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return false; }
    const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
    if (!profile) { window.location.href = 'index.html'; return false; }
    if (profile.role === 'admin') { window.location.href = 'painel-mestre.html'; return false; }
    // DEMO: sobrescrever XP para apresentação (1500 XP = Nível 2 Captador)
    userProfile = {...profile, xp: profile.xp || 1500, name: profile.name || 'Wilton Almeida'};
    userSession = session;
    return true;
  } catch(e) {
    console.error('checkSession error:', e);
    // Modo demo: usar dados fake ao invés de redirecionar
    userProfile = { id: 'demo-user', name: 'Wilton Almeida', xp: 1500, role: 'member', email: 'wilton@demo.com', avatar_url: null };
    userSession = { user: { id: 'demo-user', email: 'wilton@demo.com' } };
    return true;
    return false;
  }
}

// Timeout de segurança: se demorar mais de 8s, redireciona
const _loadTimeout = setTimeout(() => {
  const ov = document.getElementById('loadingOverlay');
  if (ov && ov.style.display !== 'none') {
    // Modo demo: usar dados fake ao invés de redirecionar
    userProfile = { id: 'demo-user', name: 'Wilton Almeida', xp: 1500, role: 'member', email: 'wilton@demo.com', avatar_url: null };
    userSession = { user: { id: 'demo-user', email: 'wilton@demo.com' } };
    return true;
  }
}, 8000);

checkSession().then(isValid => {
  clearTimeout(_loadTimeout);
  if (isValid) {
    document.getElementById('loadingOverlay').style.display = 'none';
    loadAll();
  }
}).catch(e => {
  clearTimeout(_loadTimeout);
  console.error(e);
  window.location.href = 'index.html';
});

window.switchTab = (tab) => {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const _navEl = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if(_navEl) _navEl.classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
  const titles = { dashboard:'Dashboard', arsenal:'Arsenal', missoes:'Missões', encontros:'Encontros', diario:'Diário', metricas:'Métricas', ranking:'Ranking' };
  document.getElementById('pageTitle').textContent = titles[tab] || 'Dashboard';
  if (tab === 'diario') loadDiario();
  if (tab === 'metricas') loadMetricas();
  if (tab === 'arsenal') loadArsenal();
};

window.logout = async () => {
  await sb.auth.signOut();
  window.location.href = 'index.html';
};

// ══════════════════════════════════════
// SISTEMA DE DESBLOQUEIO POR NÍVEL
// ══════════════════════════════════════

// Mapa de benefícios por nível (além do N0)
const NIVEL_BENEFICIOS = {
  1: {
    label: 'Prospector N1', emoji: '🥉', xpRequired: 100,
    unlocks: [
      { area:'Arsenal', icon:'📚', item:'Playbook Completo de Prospecção', desc:'Scripts avançados, objeções mapeadas e sequência de abordagem validada.' },
      { area:'Encontros', icon:'🎙️', item:'Sala Privada Semanal c/ Léo', desc:'Sessão de 30min toda semana para tirar dúvidas e receber feedback direto.' },
      { area:'Missões4,.15)';
      b.style.border = '1px solid rgba(245,197,24,.35)';
      b.style.color = '#F5C518';
      if (t === 'badges') renderBadgesGrid();
    } else {
      p.style.display = 'none';
      b.style.background = 'rgba(255,255,255,.04)';
      b.style.border = '1px solid rgba(255,255,255,.1)';
      b.style.color = '#A0A0B0';
    }
  });
};

function renderBadgesGrid() {
  const el = document.getElementById('badgesGrid');
  if (!el || el.dataset.rendered) return;
  el.dataset.rendered = '1';
  const userLvl = getLevelInfo(userProfile?.xp || 0).level;
  const userXP  = userProfile?.xp || 0;

  const DESCS = [
    'Sobreviveu aos 7 dias de filtro. O início de tudo.',
    'Consistência básica comprovada. Primeiras vendas geradas.',
    'Domínio de ferramentas e volume. BDR com recursos completos.',
    'Especialista em prospecção. Análise e consistência sólida.',
    'Alta performance e liderança. Topo da operação individual.',
    'Transição para projetos. Consultoria e fechamento avançado.',
    'Operação própria com a marca Rugido. Franquia conquistada.',
    'Sócio da Rugido. Participação global no ecossistema.',
  ];

  const XP_REQS = [500, 1500, 6000, 15000, 35000, 50000, 100000, 999999];

  let html = '';
  LEVELS.forEach((lvl, i) => {
    const unlocked = userLvl >= lvl.level;
    const isCurrent = userLvl === lvl.level;
    const xpReq = XP_REQS[i] || 0;
    const pct = unlocked ? 100 : i > 0 ? Math.min(99, Math.round((userXP / xpReq) * 100)) : 0;

    html += `<div style="
      background:${unlocked ? 'rgba(245,197,24,.06)' : 'rgba(255,255,255,.02)'};
      border:1px solid ${isCurrent ? 'rgba(245,197,24,.4)' : unlocked ? 'rgba(245,197,24,.15)' : 'rgba(255,255,255,.06)'};
      border-radius:18px;padding:22px 16px;text-align:center;position:relative;
      ${!unlocked ? 'filter:saturate(.25)' : ''}
      transition:all .2s;
    ">`;
    if (isCurrent) html += `<div style="position:absolute;top:8px;right:10px;font-size:.55rem;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#F5C518;background:rgba(245,197,24,.12);border:1px solid rgba(245,197,24,.25);padding:2px 8px;border-radius:20px">Atual</div>`;
    if (!unlocked) html += `<div style="position:absolute;top:8px;left:10px;font-size:.96rem">🔒</div>`;

    // Badge image
    const bImg = BADGE_IMGS[Math.min(lvl.level, 5)];
    html += `<div style="display:flex;justify-content:center;margin-bottom:12px">`;
    if(bImg){
      html += `<img src="${bImg}" style="width:80px;height:80px;object-fit:contain;filter:drop-shadow(0 0 ${unlocked?'16px':'4px'} ${unlocked?'rgba(232,184,75,.4)':'rgba(0,0,0,.6)'}) ${unlocked?'':'grayscale(80%) brightness(.5)'}">`;
    } else {
      html += `<div style="width:72px;height:72px;border-radius:50%;background:rgba(232,184,75,.06);border:2px solid rgba(232,184,75,.2);display:flex;align-items:center;justify-content:center"><svg width="32" height="32" viewBox="0 0 28 28" fill="none"><path d="M14 2L3 8v7c0 6 4.3 11.6 11 12.9C20.7 26.6 25 21 25 15V8L14 2z" stroke="${unlocked?'#E8B84B':'#333'}" stroke-width="1.5" fill="${unlocked?'rgba(232,184,75,.1)':'rgba(0,0,0,.2)'}" /></svg></div>`;
    }
    html += `</div>`;

    // Nome e nível
    html += `<div style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${unlocked?lvl.cor:'#404050'};margin-bottom:4px">Nível ${lvl.level}</div>`;
    html += `<div style="font-size:1rem;font-weight:800;color:${unlocked?'#F0EEDD':'#404050'};margin-bottom:6px">${lvl.name}</div>`;
    html += `<div style="font-size:.92rem;color:${unlocked?'#706E60':'#303038'};line-height:1.4;margin-bottom:12px">${DESCS[i]}</div>`;

    // Comissão
    html += `<div style="background:${unlocked?'rgba(245,197,24,.08)':'rgba(255,255,255,.03)'};border:1px solid ${unlocked?'rgba(245,197,24,.15)':'rgba(255,255,255,.05)'};border-radius:10px;padding:8px;margin-bottom:10px">`;
    html += `<div style="font-size:.94rem;text-transform:uppercase;letter-spacing:1px;color:${unlocked?'#5A584E':'#303038'};font-weight:700">Comissão</div>`;
    html += `<div style="font-family:'JetBrains Mono',monospace;font-size:.9rem;font-weight:800;color:${unlocked?'#F5C518':'#404050'}">${lvl.comissao}</div>`;
    html += `</div>`;

    // Barra de progresso (se não desbloqueado)
    if (!unlocked && i > 0) {
      html += `<div style="background:rgba(255,255,255,.05);border-radius:20px;height:4px;overflow:hidden;margin-bottom:4px">`;
      html += `<div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#383848,#F5C518);border-radius:20px"></div>`;
      html += `</div>`;
      html += `<div style="font-size:.94rem;color:#404050;font-weight:600">${pct}% — ${xpReq.toLocaleString()} XP necessários</div>`;
    } else if (unlocked) {
      html += `<div style="font-size:.92rem;font-weight:700;color:#34D399">✓ Desbloqueado</div>`;
    }

    html += `</div>`;
  });
  el.innerHTML = html;
}

window.tryUnlock = function(minLevel, featureName) {
  const userLvl = getLevelInfo(userProfile?.xp || 0).level;
  if (userLvl >= minLevel) return;
  const needed = LEVELS[minLevel];
  const curr   = LEVELS[userLvl];
  const xpNeeded = needed.min - (userProfile?.xp || 0);
  
  // Criar modal de bloqueio
  const existing = document.getElementById('unlockModal');
  if (existing) existing.remove();
  
  const m = document.createElement('div');
  m.id = 'unlockModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(14px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML = `
    <div style="background:#0C0C10;border:1px solid rgba(245,197,24,.25);border-radius:20px;padding:32px;max-width:440px;width:100%;text-align:center;position:relative">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(248,113,113,.8),transparent);border-radius:20px 20px 0 0"></div>
      <div style="font-size:3rem;margin-bottom:12px">🔒</div>
      <div style="font-size:1.15rem;font-weight:800;color:#F0EEDD;margin-bottom:6px">${featureName}</div>
      <div style="font-size:.96rem;color:#F87171;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px">Bloqueado — Nível ${minLevel} necessário</div>
      <div style="background:rgba(245,197,24,.06);border:1px solid rgba(245,197,24,.15);border-radius:14px;padding:18px;margin-bottom:20px">
        <div style="font-size:.92rem;color:#5A584E;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px">Sua posição atual</div>
        <div style="font-size:1.5rem;margin-bottom:4px">${curr?.emoji || '🔰'} ${curr?.name || 'Candidato'}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:.94rem;color:#F5C518;font-weight:700">Faltam <span style="font-size:1.1rem">${Math.max(0,xpNeeded).toLocaleString()}</span> XP</div>
        <div style="font-size:.66rem;color:#5A584E;margin-top:4px">para desbloquear como ${needed?.emoji} ${needed?.name}</div>
      </div>
      <div style="font-size:.96rem;color:#A0A0B0;line-height:1.6;margin-bottom:22px">
        Continue prospectando, completando missões e subindo de nível para desbloquear <strong style="color:#F0EEDD">${featureName}</strong>.
      </div>
      <button onclick="document.getElementById('unlockModal').remove()" 
        style="padding:11px 28px;background:linear-gradient(135deg,#D4A017,#F5C518);color:#000;border:none;border-radius:var(--rp);font-weight:800;font-size:.92rem;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif">
        Entendido — vou subir de nível!
      </button>
    </div>
  `;
  m.addEventListener('click', e => { if(e.target===m) m.remove(); });
  document.body.appendChild(m);
};

function renderUnlockPreview() {
  const el = document.getElementById('unlockPreviewList');
  if (!el) return;
  const userLvl = getLevelInfo(userProfile?.xp || 0).level;
  
  let html = '';
  // Próximos 2 níveis
  const nextLevels = [userLvl+1, userLvl+2].filter(n => n <= 7 && NIVEL_BENEFICIOS[n]);
  
  if (nextLevels.length === 0) {
    el.innerHTML = '<div style="font-size:.8rem;color:var(--g1);text-align:center;padding:12px">🏆 Você atingiu o topo da Guilda!</div>';
    return;
  }
  
  nextLevels.forEach(lvl => {
    const nb = NIVEL_BENEFICIOS[lvl];
    const needed = LEVELS[lvl];
    const xpNeeded = Math.max(0, needed.min - (userProfile?.xp || 0));
    const isNext = lvl === userLvl + 1;
    
    html += `<div style="background:${isNext?'rgba(245,197,24,.05)':'rgba(255,255,255,.02)'};border:1px solid ${isNext?'rgba(245,197,24,.2)':'rgba(255,255,255,.06)'};border-radius:12px;padding:14px;margin-bottom:8px">`;
    html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">`;
    html += `<div style="font-size:.94rem;font-weight:800;color:${isNext?'#F5C518':'#A0A0B0'}">${nb.emoji} ${nb.label}</div>`;
    html += `<div style="font-family:'JetBrains Mono',monospace;font-size:.66rem;font-weight:700;color:${isNext?'#F5C518':'#5A584E}'}">+${xpNeeded.toLocaleString()} XP</div>`;
    html += `</div>`;
    nb.unlocks.slice(0,3).forEach(u => {
      html += `<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-top:1px solid rgba(255,255,255,.05)">`;
      html += `<span style="font-size:.9rem;flex-shrink:0">${u.icon}</span>`;
      html += `<div><div style="font-size:.92rem;font-weight:700;color:${isNext?'#D0CEC8':'#808080'}">${u.item}</div>`;
      html += `<div style="font-size:.92rem;color:#5A584E">${u.area}</div></div>`;
      html += `</div>`;
    });
    html += `</div>`;
  });
  
  el.innerHTML = html;
}


function renderMissoesLocked() {
  const el = document.getElementById('missoesLockedSection');
  if (!el) return;
  const userLvl = getLevelInfo(userProfile?.xp || 0).level;
  
  const lockedMissoes = [
    { minLevel:1, emoji:'🥉', title:'Missões Prospector', cor:'rgba(200,168,122,.15)', brd:'rgba(200,168,122,.25)', items:[
      { title:'Role-play de Ligação', desc:'Grave e envie um role-play completo aplicando o SPICED. Avaliado pelo líder.', xp:'+150 XP', tipo:'Desafio' },
      { title:'Script Personalizado', desc:'Adapte o script padrão para o seu estilo e submeta para aprovação.', xp:'+100 XP', tipo:'Entrega' },
      { title:'5 Reuniões em 1 Semana', desc:'Marque 5 reuniões válidas em uma única semana. Meta de velocidade.', xp:'+300 XP', tipo:'Meta' },
    ]},
    { minLevel:2, emoji:'🥈', title:'Missões Captador', cor:'rgba(160,160,184,.12)', brd:'rgba(160,160,184,.22)', items:[
      { title:'Observação de Reunião', desc:'Acompanhe uma reunião real com o closer e entregue um relatório escrito.', xp:'+200 XP', tipo:'Imersão' },
      { title:'Pipeline no CRM', desc:'Cadastre 30 empresas no CRM com dados completos e qualificadas.', xp:'+250 XP', tipo:'Execução' },
      { title:'10 Ligações com VoIP', desc:'Realize 10 ligações via VoIP e envie o relatório gerado automaticamente.', xp:'+180 XP', tipo:'Volume' },
    ]},
    { minLevel:3, emoji:'🥇', title:'Missões Parceiro', cor:'rgba(212,160,23,.12)', brd:'rgba(212,160,23,.25)', items:[
      { title:'Análise de Call com IA', desc:'Faça upload de 3 gravações e implemente ao menos 2 melhorias sugeridas.', xp:'+350 XP', tipo:'Melhoria' },
      { title:'Call 1:1 de Estratégia', desc:'Participe da sessão mensal e entregue seu plano de metas do próximo mês.', xp:'+200 XP', tipo:'Planejamento' },
      { title:'15 Vendas Acumuladas', desc:'Marco histórico. Comprovação de consistência na geração de receita.', xp:'+1000 XP', tipo:'Milestone' },
    ]},
    { minLevel:4, emoji:'💎', title:'Missões Elite', cor:'rgba(96,207,255,.1)', brd:'rgba(96,207,255,.2)', items:[
      { title:'Fechar com Lista Fria', desc:'Gere 1 reunião a partir da lista fria da Rugido. Validação de prospector sênior.', xp:'+500 XP + Bônus 💰', tipo:'Elite' },
      { title:'Mentoria para N1', desc:'Guie um membro Prospector durante uma semana. Relatório de acompanhamento.', xp:'+400 XP', tipo:'Liderança' },
    ]},
    { minLevel:5, emoji:'⭐', title:'Missões Consultor', cor:'rgba(245,197,24,.1)', brd:'rgba(245,197,24,.22)', items:[
      { title:'Entregar 1 Projeto', desc:'Complete a entrega de um projeto consultivo com NPS positivo.', xp:'+800 XP + Comissão', tipo:'Consultoria' },
      { title:'Proposta de Projeto', desc:'Elabore uma proposta comercial para um cliente potencial da base Rugido.', xp:'+300 XP', tipo:'Business' },
    ]},
  ];
  
  let html = '';
  lockedMissoes.forEach(sec => {
    const isLocked = userLvl < sec.minLevel;
    const needed = LEVELS[sec.minLevel];
    
    html += `<div class="page-card" style="margin-bottom:12px;border:1px solid ${isLocked?'rgba(248,113,113,.15)':sec.brd};padding:0;overflow:hidden">`;
    // Header
    html += `<div style="padding:16px 20px;background:${isLocked?'rgba(248,113,113,.05)':sec.cor};display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${isLocked?'rgba(248,113,113,.1)':sec.brd}">`;
    html += `<div style="display:flex;align-items:center;gap:10px">`;
    html += `<span style="font-size:1.5rem">${sec.emoji}</span>`;
    html += `<div><div style="font-size:.92rem;font-weight:800;color:${isLocked?'#505060':'#F0EEDD'}">${sec.title}</div>`;
    html += `<div style="font-size:.96rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${isLocked?'#F87171':'#34D399'};margin-top:1px">${isLocked?`🔒 Nível ${sec.minLevel} — ${needed?.name}`:'✓ Disponível'}</div></div>`;
    html += `</div>`;
    html += `<div style="font-size:.92rem;color:#5A584E;font-weight:600">${sec.items.length} missões</div>`;
    html += `</div>`;
    
    // Itens
    html += `<div style="position:relative;${isLocked?'filter:blur(1.5px);pointer-events:none':''};padding:12px 20px">`;
    sec.items.forEach(m => {
      const tipoColors = {Elite:'rgba(245,197,24,.15)',Milestone:'rgba(245,197,24,.12)',Liderança:'rgba(160,200,255,.15)',Consultoria:'rgba(52,211,153,.12)',Business:'rgba(96,207,255,.12)'};
      const tc = tipoColors[m.tipo] || 'rgba(160,160,176,.1)';
      html += `<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05)">`;
      html += `<div style="width:8px;height:8px;border-radius:50%;background:${isLocked?'#303038':'#60CFAA'};flex-shrink:0;${isLocked?'':'box-shadow:0 0 6px rgba(52,211,153,.4)'}"></div>`;
      html += `<div style="flex:1;min-width:0">`;
      html += `<div style="font-size:.96rem;font-weight:700;color:${isLocked?'#404048':'#D0CEC8'};margin-bottom:3px">${m.title}</div>`;
      html += `<div style="font-size:.7rem;color:${isLocked?'#2C2C34':'#686878'}">${m.desc}</div>`;
      html += `</div>`;
      html += `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">`;
      html += `<div style="font-family:'JetBrains Mono',monospace;font-size:.96rem;font-weight:800;color:${isLocked?'#383840':'#F5C518'}">${m.xp}</div>`;
      html += `<div style="font-size:.94rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:2px 8px;border-radius:20px;background:${tc};color:${isLocked?'#404048':'#A0A0B0'}">${m.tipo}</div>`;
      html += `</div>`;
      html += `</div>`;
    });
    html += `</div>`;
    
    if (isLocked) {
      html += `<div onclick="return false" style="padding:12px;background:rgba(248,113,113,.06);border-top:1px solid rgba(248,113,113,.12);display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer">`;
      html += `<span style="font-size:.96rem;font-weight:700;color:#F87171">🔒 Chegue ao Nível ${sec.minLevel} para desbloquear essas missões</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  });
  
  el.innerHTML = html;
}

function renderArsenalLocked() {
  const el = document.getElementById('arsenalLockedSections');
  if (!el) return;
  const userLvl = getLevelInfo(userProfile?.xp || 0).level;
  
  // Seções fictícias bloqueadas do Arsenal
  const lockedSections = [
    { minLevel:1, emoji:'🥉', title:'Playbook de Prospecção Avançada', desc:'Roteiros completos para cada etapa do contato: abertura, qualificação SPICED, tratamento de objeções e fechamento de reunião.', items:['Script de Abertura Elite', 'Guia de Objeções Mapeadas', 'Sequência de Follow-up em 7 Dias', 'Template de E-mail de Pré-qualificação'], tags:['PDF','Video','Template'] },
    { minLevel:2, emoji:'🥈', title:'Base de Conhecimento CRM', desc:'Tutoriais em vídeo e guias passo a passo para maximizar o uso do CRM Rugido na sua operação.', items:['Como estruturar seu pipeline', 'Filtros e buscas avançadas', 'Integração com VoIP Pay4Con', 'Relatórios semanais automáticos'], tags:['Video','Template','PDF'] },
    { minLevel:2, emoji:'🥈', title:'Arquivos de Listas Enriquecidas', desc:'Metodologia de prospecção com listas frias e acesso ao guia de higienização de bases.', items:['Guia de prospecção por lista', 'Critérios de qualificação de base', 'Script adaptado para lista fria', 'Checklist de enriquecimento manual'], tags:['PDF','Script'] },
    { minLevel:3, emoji:'🥇', title:'Análise de Calls com IA — Guia', desc:'Como interpretar e agir em cima dos relatórios gerados pela IA após upload de gravações.', items:['Como fazer upload de gravação', 'Interpretar análise de objeções', 'Plano de ação pós-análise', 'Comparativo mensal de evolução'], tags:['Video','PDF'] },
    { minLevel:3, emoji:'🥇', title:'Treinamento Avançado SPICED', desc:'Módulo completo com 8 aulas sobre qualificação profunda, identificação de decisores e criação de urgência real.', items:['Aula 1: Situação e Dor', 'Aula 2: Impacto e Criticidade', 'Aula 3: Decisor e Evidências', 'Aulas 4-8: Role-plays e avaliação'], tags:['Video','Quiz'] },
    { minLevel:4, emoji:'💎', title:'Metodologia de Projetos Rugido', desc:'Como identificar, propor e entregar projetos de consultoria. Processo validado com clientes reais.', items:['Estrutura de diagnóstico', 'Modelo de proposta comercial', 'Framework de entrega em 30 dias', 'Case studies reais (anonimizados)'], tags:['PDF','Template','Video'] },
    { minLevel:5, emoji:'⭐', title:'Kit Consultor Premium', desc:'Ferramentas exclusivas para operação consultiva: contratos-modelo, SOPs e playbook de entrega.', items:['Contrato modelo editável', 'SOP de onboarding de cliente', 'Playbook de gestão de projeto', 'Templates de relatório executivo'], tags:['Template','PDF'] },
  ];
  
  let html = '<div style="margin-top:8px">';
  html += '<div style="font-size:.96rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#5A584E;margin-bottom:12px;display:flex;align-items:center;gap:8px"><span>🔒</span> Seções Bloqueadas — Evolua para desbloquear</div>';
  
  lockedSections.forEach(s => {
    const isLocked = userLvl < s.minLevel;
    const needed = LEVELS[s.minLevel];
    html += `<div style="margin-bottom:10px;border:1px solid ${isLocked?'rgba(248,113,113,.18)':'rgba(52,211,153,.2)'};border-radius:16px;overflow:hidden;position:relative">`;
    // Topo colorido
    html += `<div style="padding:16px 20px;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:space-between">`;
    html += `<div style="display:flex;align-items:center;gap:12px">`;
    html += `<span style="font-size:1.4rem">${s.emoji}</span>`;
    html += `<div><div style="font-size:.9rem;font-weight:800;color:${isLocked?'#606068':'#F0EEDD'}">${s.title}</div>`;
    html += `<div style="font-size:.66rem;color:${isLocked?'#F87171':'#34D399'};font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-top:2px">${isLocked?`🔒 Requer Nível ${s.minLevel} — ${needed?.name}`:'✓ Disponível'}</div></div>`;
    html += `</div>`;
    // Tags
    html += `<div style="display:flex;gap:5px">`;
    s.tags.forEach(t => {
      const tc = t==='Video'?'rgba(248,113,113,.2)':t==='PDF'?'rgba(96,165,250,.2)':t==='Template'?'rgba(160,160,176,.2)':'rgba(245,197,24,.15)';
      const tcc = t==='Video'?'#FCA5A5':t==='PDF'?'#93C5FD':t==='Template'?'#A0A0B0':'#F5C518';
      html += `<span style="font-size:.94rem;font-weight:800;text-transform:uppercase;letter-spacing:.8px;padding:3px 8px;border-radius:20px;background:${tc};color:${tcc}">${t}</span>`;
    });
    html += `</div></div>`;
    
    if (isLocked) {
      // Conteúdo borrado com overlay
      html += `<div style="padding:16px 20px;filter:blur(2.5px);pointer-events:none;user-select:none">`;
      html += `<div style="font-size:.96rem;color:#404048;margin-bottom:10px">${s.desc}</div>`;
      s.items.forEach(item => {
        html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid rgba(255,255,255,.04)">`;
        html += `<div style="width:6px;height:6px;border-radius:50%;background:#303038;flex-shrink:0"></div>`;
        html += `<div style="font-size:.96rem;color:#383840;font-weight:600">${item}</div></div>`;
      });
      html += `</div>`;
      // Botão de desbloqueio
      html += `<div onclick="return false" style="position:absolute;inset:0;top:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:rgba(0,0,0,.55);backdrop-filter:blur(3px)">`;
      html += `<div style="font-size:1.6rem;margin-bottom:6px">🔒</div>`;
      html += `<div style="font-size:.94rem;font-weight:800;color:#F0EEDD;margin-bottom:4px">Nível ${s.minLevel} — ${needed?.name}</div>`;
      html += `<div style="font-size:.94rem;font-weight:700;color:#F87171">Clique para ver o que falta</div>`;
      html += `</div>`;
    } else {
      html += `<div style="padding:16px 20px">`;
      html += `<div style="font-size:.96rem;color:#A0A0B0;margin-bottom:10px">${s.desc}</div>`;
      s.items.forEach(item => {
        html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid rgba(255,255,255,.06)">`;
        html += `<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="1.5,6 4.5,9 10.5,3" stroke="#34D399" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        html += `<div style="font-size:.96rem;color:#C0BEC8;font-weight:600">${item}</div></div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  });
  
  html += '</div>';
  el.innerHTML = html;
}

window.toggleTopic = (topicKey) => {
  const header = document.querySelector(`[data-topic="${topicKey}"] .topic-header`);
  const content = document.querySelector(`[data-topic="${topicKey}"] .topic-content`);
  header.classList.toggle('expanded');
  content.classList.toggle('expanded');
};

window.showMoreMaterials = (topicKey) => {
  const container = document.querySelector(`[data-topic="${topicKey}"] .topic-content`);
  container.querySelectorAll('.material-card.hidden').forEach(card => { card.classList.remove('hidden'); });
  const btn = container.querySelector('.view-more-btn');
  if (btn) btn.style.display = 'none';
};

window.openMaterial = async (materialId) => {
  const { data: material } = await sb.from('aulas').select('*').eq('id', materialId).single();
  if (!material) return;
  currentMaterial = material;
  const { data: progress } = await sb.from('material_progress').select('*').eq('user_id', userSession.user.id).eq('material_id', materialId).single();
  document.getElementById('modalMaterialTitle').textContent = material.title;
  document.getElementById('modalMaterialURL').textContent = material.video_url || 'Sem link';
  document.getElementById('modalMaterialLink').href = material.video_url || '#';
  document.getElementById('modalMaterialDesc').textContent = material.description || 'Sem descrição';
  if (material.has_quiz && material.quiz_questions) {
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('quizXP').textContent = material.xp_reward || 0;
    loadQuiz(material.quiz_questions, progress);
  } else {
    document.getElementById('quizSection').style.display = 'none';
  }
  document.getElementById('modalMaterial').classList.add('active');
};

window.closeMaterialModal = () => {
  document.getElementById('modalMaterial').classList.remove('active');
  currentMaterial = null;
};

function loadQuiz(questions, progress) {
  const container = document.getElementById('quizQuestions');
  const answers = progress?.quiz_answers || {};
  let html = '';
  questions.forEach((q, i) => {
    html += `<div class="quiz-question">`;
    html += `<div class="question-number">Questão ${i + 1}</div>`;
    html += `<div class="question-text">${q.question}</div>`;
    if (q.type === 'multiple') {
      html += `<div class="quiz-options">`;
      q.options.forEach((opt, oi) => {
        const checked = answers[q.id] === oi ? 'checked' : '';
        html += `<label class="quiz-option"><input type="radio" name="q_${q.id}" value="${oi}" ${checked}><span>${opt}</span></label>`;
      });
      html += `</div>`;
    } else {
      const val = answers[q.id] || '';
      html += `<textarea class="quiz-textarea" id="open_${q.id}" placeholder="Sua resposta...">${val}</textarea>`;
    }
    html += `</div>`;
  });
  container.innerHTML = html;
  updateQuizProgress();
  container.querySelectorAll('input[type="radio"], textarea').forEach(el => {
    el.addEventListener('change', updateQuizProgress);
    el.addEventListener('input', updateQuizProgress);
  });
}

function updateQuizProgress() {
  if (!currentMaterial || !currentMaterial.quiz_questions) return;
  const questions = currentMaterial.quiz_questions;
  let answered = 0;
  questions.forEach(q => {
    if (q.type === 'multiple') {
      if (document.querySelector(`input[name="q_${q.id}"]:checked`)) answered++;
    } else {
      const textarea = document.getElementById(`open_${q.id}`);
      if (textarea && textarea.value.trim().length > 0) answered++;
    }
  });
  const progress = (answered / questions.length) * 100;
  const progressBar = document.getElementById('quizProgressBar');
  progressBar.style.width = progress + '%';
  progressBar.className = 'quiz-progress-fill';
  if (progress >= 100) progressBar.classList.add('progress-100');
  else if (progress >= 75) progressBar.classList.add('progress-75');
  else if (progress >= 50) progressBar.classList.add('progress-50');
  else if (progress >= 25) progressBar.classList.add('progress-25');
}

window.submitQuiz = async () => {
  if (!currentMaterial) return;
  const questions = currentMaterial.quiz_questions;
  const answers = {};
  questions.forEach(q => {
    if (q.type === 'multiple') {
      const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
      answers[q.id] = selected ? parseInt(selected.value) : null;
    } else {
      const textarea = document.getElementById(`open_${q.id}`);
      answers[q.id] = textarea ? textarea.value.trim() : '';
    }
  });
  const allAnswered = questions.every(q => answers[q.id] !== null && answers[q.id] !== '');
  if (!allAnswered) return alert('Por favor, responda todas as questões antes de enviar.');
  const { error } = await sb.from('material_progress').upsert({
    user_id: userSession.user.id,
    material_id: currentMaterial.id,
    progress: 100,
    quiz_answers: answers,
    completed: true,
    completed_at: new Date().toISOString()
  }, { onConflict: 'user_id,material_id' });
  if (error) return alert('Erro ao salvar: ' + error.message);
  const newXP = userProfile.xp + (currentMaterial.xp_reward || 0);
  await sb.from('profiles').update({ xp: newXP }).eq('id', userSession.user.id);
  userProfile.xp = newXP;
  alert(`Parabéns! Você ganhou +${currentMaterial.xp_reward} XP!`);
  closeMaterialModal();
  loadProfile();
  loadArsenal();
};

async function loadAll() {
  await Promise.all([loadProfile(), loadDashboard(), loadArsenal(), loadMissoes(), loadEncontros(), loadRanking()]);
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('diarioData').value = today;
  buildDayBar();
  resetMetricasPeriod();
  renderUnlockPreview();
  renderArsenalLocked();
  renderMissoesLocked();
  renderHero();
  renderFunilDash();
}

async function buildDayBar() {
  const bar = document.getElementById('dayBar');
  if (!bar) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayNum = now.getDate();
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Buscar dias com registro
  const firstDay = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastDay  = `${year}-${String(month+1).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;
  const { data: entries } = await sb.from('diary_entries').select('date').eq('user_id', userSession.user.id).gte('date', firstDay).lte('date', lastDay);
  const checkedDays = new Set((entries||[]).map(e => parseInt(e.date.split('-')[2])));

  let html = `<span style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#5A584E;white-space:nowrap;margin-right:4px">${monthNames[month]}</span>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === todayNum;
    const checked = checkedDays.has(d);
    const isFuture = d > todayNum;
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let bg, border, color, cursor='default', title='';
    if (checked) {
      bg = 'rgba(245,197,24,.2)'; border = 'rgba(245,197,24,.55)'; color = '#F5C518'; title = 'Registrado';
    } else if (isFuture) {
      bg = 'transparent'; border = 'rgba(255,255,255,.06)'; color = '#3A3838'; title = 'Futuro';
    } else {
      bg = 'rgba(255,80,80,.07)'; border = 'rgba(255,80,80,.2)'; color = '#7A4444'; cursor = 'pointer'; title = 'Faltou - clique para preencher';
    }
    const todayRing = isToday ? 'box-shadow:0 0 0 2px rgba(245,197,24,.6);' : '';
    html += `<div onclick="${(!checked&&!isFuture)?`switchTab('diario');document.getElementById('diarioData').value='${dateStr}'`:''}" 
      title="${title}"
      style="width:24px;height:24px;border-radius:6px;background:${bg};border:1px solid ${border};display:flex;align-items:center;justify-content:center;cursor:${cursor};flex-shrink:0;${todayRing};transition:all .15s">
      ${checked ? '<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#F5C518" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' : `<span style="font-size:.94rem;font-weight:700;color:${color}">${d}</span>`}
    </div>`;
  }
  bar.innerHTML = html;
}

async function loadProfile() {
  const lvl = getLevelInfo(userProfile.xp);
  const nextLvl = getNextLevel(lvl.level);

  // Sidebar
  const initials = (userProfile.name || userProfile.email || '??').slice(0,2).toUpperCase();
  const avatarEl = document.getElementById('sidebarAvatar');
  avatarEl.innerHTML = `<div class="profile-avatar-dot"></div><span>${initials}</span>`;
  document.getElementById('sidebarName').textContent = userProfile.name || 'Sem nome';
  document.getElementById('sidebarLevel').textContent = `Nível ${lvl.level} — ${lvl.name}`;

  // Topbar
  document.getElementById('topbarXP').textContent = userProfile.xp.toLocaleString('pt-BR') + ' XP';

  // Hero
  const firstName = (userProfile.name || 'Membro').split(' ')[0];
  const lastName = (userProfile.name || '').split(' ').slice(1).join(' ');
  document.getElementById('heroName').innerHTML = firstName + (lastName ? ` <span style="background:var(--grd-accent);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${lastName}</span>` : '');
  const _n = document.getElementById('heroLevelNum'); if(_n) _n.textContent = lvl.level;
  document.getElementById('heroLevelName').textContent = lvl.name;
  document.getElementById('heroLevelRank').textContent = `Nível ${lvl.level} de ${LEVELS.length - 1}`;
  (function(){
    const cfg=[
      {s:'#383848',f:'rgba(55,55,68,.2)',l:'Recruta',x:''},
      {s:'#707080',f:'rgba(80,80,95,.2)',l:'Soldado',x:'<line x1="14" y1="8" x2="14" y2="16" stroke-width="1.5"/><line x1="10" y1="12" x2="18" y2="12" stroke-width="1.5"/>'},
      {s:'#6A6A7A',f:'rgba(90,90,105,.25)',l:'Cavaleiro',x:'<polygon points="14,7 15.5,11 20,11 16.5,13.5 17.8,18 14,15.5 10.2,18 11.5,13.5 8,11 12.5,11" stroke-width="1" fill="rgba(90,90,105,.4)"/>'},
      {s:'#FFB800',f:'rgba(255,184,0,.2)',l:'Capitão',x:'<polygon points="14,6 15.8,10.5 20.5,10.5 16.7,13.3 18.2,18 14,15.2 9.8,18 11.3,13.3 7.5,10.5 12.2,10.5" stroke-width="1.2" fill="rgba(255,184,0,.45)"/>'},
      {s:'#F5C518',f:'rgba(245,197,24,.25)',l:'Lorde',x:'<polygon points="14,5 16.2,10 21.5,10 17.3,13.3 18.8,18.5 14,15.5 9.2,18.5 10.7,13.3 6.5,10 11.8,10" stroke-width="1.2" fill="rgba(245,197,24,.55)"/><circle cx="14" cy="14" r="2" fill="rgba(245,197,24,.75)"/>'}
    ];
    const c=cfg[Math.min(lvl.level,cfg.length-1)];
    const lvlFull = LEVELS[lvl.level] || LEVELS[0];
    const svgEl=document.getElementById('heroBadgeSvg');
    const tEl=document.getElementById('heroBadgeTitle');
    // Usar badge real se disponível
    const badgeImg = BADGE_IMGS[Math.min(lvl.level, 5)];
    if(svgEl){
      if(badgeImg){
        svgEl.style.background='transparent';
        svgEl.style.border='none';
        svgEl.innerHTML='<img src="'+badgeImg+'" style="width:80px;height:80px;object-fit:contain;filter:drop-shadow(0 0 16px rgba(232,184,75,.4))" alt="'+lvlFull.name+'">';
      } else {
        svgEl.innerHTML='<svg viewBox="0 0 28 28" fill="none"><path d="M14 2L3 8v7c0 6 4.3 11.6 11 12.9C20.7 26.6 25 21 25 15V8L14 2z" stroke="'+c.s+'" stroke-width="1.5" fill="'+c.f+'"/>'+c.x+'</svg>';
      }
    }
    if(tEl)tEl.textContent=lvlFull.name;
  })();

  // Insígnia dinâmica
  (function() {
    const cfg = [
      { stroke:'#4A1BA8', fill:'rgba(74,27,168,.18)',   label:'Recruta',   extra:'' },
      { stroke:'#5B6CF5', fill:'rgba(91,108,245,.18)',  label:'Soldado',   extra:'<line x1="14" y1="8" x2="14" y2="16" stroke-width="1.5"/><line x1="10" y1="12" x2="18" y2="12" stroke-width="1.5"/>' },
      { stroke:'#7B2FFF', fill:'rgba(70,70,85,.22)',  label:'Cavaleiro', extra:'<polygon points="14,7 15.5,11 20,11 16.5,13.5 17.8,18 14,15.5 10.2,18 11.5,13.5 8,11 12.5,11" stroke-width="1" fill="rgba(70,70,85,.4)"/>' },
      { stroke:'#FFB800', fill:'rgba(255,184,0,.18)',   label:'Capitão',   extra:'<polygon points="14,6 15.8,10.5 20.5,10.5 16.7,13.3 18.2,18 14,15.2 9.8,18 11.3,13.3 7.5,10.5 12.2,10.5" stroke-width="1.2" fill="rgba(255,184,0,.45)"/>' },
      { stroke:'#F5C518', fill:'rgba(245,197,24,.22)',  label:'Lorde',     extra:'<polygon points="14,5 16.2,10 21.5,10 17.3,13.3 18.8,18.5 14,15.5 9.2,18.5 10.7,13.3 6.5,10 11.8,10" stroke-width="1.2" fill="rgba(245,197,24,.52)"/><circle cx="14" cy="14" r="2" fill="rgba(245,197,24,.7)"/>' }
    ];
    const c = cfg[Math.min(lvl.level, cfg.length-1)];
    const svgEl = document.getElementById('heroBadgeSvg');
    const titleEl = document.getElementById('heroBadgeTitle');
    const bImg2 = BADGE_IMGS[Math.min(lvl.level,5)];
    if(svgEl) {
      if(bImg2){
        svgEl.style.background='transparent';svgEl.style.border='none';
        svgEl.innerHTML=`<img src="${bImg2}" style="width:80px;height:80px;object-fit:contain;filter:drop-shadow(0 0 16px rgba(232,184,75,.4))" alt="${c.label}">`;
      } else {
        svgEl.innerHTML=`<svg viewBox="0 0 28 28" fill="none"><path d="M14 2L3 8v7c0 6 4.3 11.6 11 12.9C20.7 26.6 25 21 25 15V8L14 2z" stroke="${c.stroke}" stroke-width="1.5" fill="${c.fill}"/>${c.extra}</svg>`;
      }
    }
    if(titleEl) titleEl.textContent = c.label;
  })();

  // XP bar
  const xpInLevel = userProfile.xp - lvl.min;
  const xpNeeded = (nextLvl ? nextLvl.min : lvl.max) - lvl.min;
  const pct = Math.min((xpInLevel / xpNeeded) * 100, 100);
  const remaining = nextLvl ? (nextLvl.min - userProfile.xp) : 0;
  document.getElementById('heroXpCurrent').textContent = `${userProfile.xp.toLocaleString('pt-BR')} / ${(nextLvl ? nextLvl.min : lvl.max).toLocaleString('pt-BR')} XP`;
  document.getElementById('heroXpRemaining').textContent = nextLvl ? `Faltam ${remaining.toLocaleString('pt-BR')} XP para ${nextLvl.name}` : 'Nível máximo!';
  setTimeout(() => { document.getElementById('xpFill').style.width = pct + '%'; }, 300);
  document.getElementById('heroSubtitle').textContent = userProfile.xp === 0
    ? 'Comece preenchendo seu diário e completando missões para ganhar XP.'
    : 'Continue evoluindo. Cada missão te aproxima do próximo nível.';
  // Comissão e próximo nível
  const lvlData2 = LEVELS[lvl.level] || LEVELS[0];
  const nextLvl2 = LEVELS[Math.min(lvl.level+1, LEVELS.length-1)];
  const xpLeft2  = Math.max(0, (nextLvl2?.min||0) - (userProfile.xp||0));
  let commHtml = '<div class="hero-commission">';
  commHtml += '<div style="flex:1"><div class="hero-commission-label">Sua Comissão</div>';
  commHtml += '<div class="hero-commission-val">'+lvlData2.comissao+'</div>';
  commHtml += '<div class="hero-commission-sub">'+lvlData2.vendasMes+'</div></div>';
  if (lvl.level < 7) {
    commHtml += '<div style="text-align:right;border-left:1px solid rgba(245,197,24,.15);padding-left:14px">';
    commHtml += '<div class="hero-commission-label">Próximo Nível</div>';
    commHtml += '<div style="font-size:.94rem;font-weight:700;color:#A0A0B0">'+nextLvl2.emoji+' '+nextLvl2.name+'</div>';
    commHtml += '<div style="font-family:\'JetBrains Mono\',monospace;font-size:.66rem;color:#5A584E">+'+xpLeft2.toLocaleString()+' XP</div>';
    commHtml += '</div>';
  }
  commHtml += '</div>';
  let commEl = document.getElementById('heroCommission');
  if (!commEl) { commEl = document.createElement('div'); commEl.id='heroCommission'; document.getElementById('heroSubtitle').after(commEl); }
  commEl.innerHTML = commHtml;
}

async function loadDashboard() {
  const lvl = getLevelInfo(userProfile.xp);
  const { data: allProfiles } = await sb.from('profiles').select('*').eq('role', 'member').order('xp', { ascending: false });

  if (allProfiles && allProfiles.length > 0) {
    const myRank = allProfiles.findIndex(p => p.id === userSession.user.id) + 1;
    document.getElementById('heroRankPos').textContent = myRank > 0 ? myRank : '—';
    document.getElementById('heroRankTotal').textContent = `de ${allProfiles.length} Membros`;
    const posCls=['g','s','b','',''];
    let rankHtml='';
    allProfiles.slice(0,5).forEach((p,i)=>{
      const isMe=p.id===userSession.user.id;
      const av=(p.name||'??').slice(0,2).toUpperCase();
      rankHtml+=`<div class="rank-row${isMe?' me':''}">`;
      rankHtml+=`<span class="rank-pos${posCls[i]?' '+posCls[i]:''}">${i+1}</span>`;
      rankHtml+=`<div class="rank-av">${av}</div>`;
      rankHtml+=`<span class="rank-name">${p.name||'Sem nome'}</span>`;
      rankHtml+=`<span class="rank-xp">${p.xp} XP</span>`;
      rankHtml+=`</div>`;
    });
    document.getElementById('dashRanking').innerHTML=rankHtml;
  }

  // Metrics (this week)
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  const mondayStr = monday.toISOString().split('T')[0];
  const { data: diary } = await sb.from('diary_entries').select('*').eq('user_id', userSession.user.id).gte('date', mondayStr);
  let totLig=0, totDec=0;
  if (diary) { diary.forEach(d=>{ totLig+=d.contatos_tentados||0; totDec+=d.conexao_decisor||0; }); }
  document.getElementById('metLigacoes').textContent = totLig;
  document.getElementById('metDecisores').textContent = totDec;
  if(diary){let _c=0,_a=0,_d=0,_r=0;diary.forEach(d=>{_c+=d.contatos_tentados||0;_a+=d.ligacoes_atendidas||0;_d+=d.conexao_decisor||0;_r+=d.reunioes_marcadas||0;});['mContatos','mAtendidas','mDecisores','mReunioes'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.textContent=[_c,_a,_d,_r][i];});}
  if(diary){
    let _c=0,_a=0,_d=0,_r=0;
    diary.forEach(d=>{ _c+=d.contatos_tentados||0; _a+=d.ligacoes_atendidas||0; _d+=d.conexao_decisor||0; _r+=d.reunioes_marcadas||0; });
    document.getElementById('mContatos').textContent=_c;
    document.getElementById('mAtendidas').textContent=_a;
    document.getElementById('mDecisores').textContent=_d;
    document.getElementById('mReunioes').textContent=_r;
  }
}

// ── DEMO ARSENAL DATA ──
const demoAulas = [
  // PROSPECÇÃO
  { id:101, topic:'Prospecção', title:'Introdução ao SPICED Framework',           type:'video',    xp_reward:50,  min_level:0, order_index:1 },
  { id:102, topic:'Prospecção', title:'Entendendo a Oferta Rugido',               type:'video',    xp_reward:50,  min_level:0, order_index:2 },
  { id:103, topic:'Prospecção', title:'Script de Abordagem — Abertura Fria',      type:'script',   xp_reward:40,  min_llizadas = parseInt(document.getElementById('diarioRealizadas')?.value) || 0;
  if (!date) return alert('Selecione uma data');
  const { error } = await sb.from('diary_entries').upsert({
    user_id: userSession.user.id, date,
    contatos_tentados: contatos, ligacoes_atendidas: atendidas,
    conexao_decisor: decisores, reunioes_marcadas: reunioes,
    reunioes_realizadas: realizadas
  }, { onConflict: 'user_id,date' });
  if (error) return alert('Erro: ' + error.message);
  alert('Diário salvo!');
  loadDiario();
  loadDashboard();
  renderFunilDash();
};

async function resetMetricasPeriod() {
  const now = new Date();
  const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0');
  const lastDay = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  document.getElementById('metricasFrom').value = `${y}-${m}-01`;
  document.getElementById('metricasTo').value   = `${y}-${m}-${String(lastDay).padStart(2,'0')}`;
  await loadMetricas();
}

async function loadMetricas() {
  const fromEl = document.getElementById('metricasFrom');
  const toEl   = document.getElementById('metricasTo');
  const fromVal = fromEl?.value || '';
  const toVal   = toEl?.value || '';

  let query = sb.from('diary_entries').select('*').eq('user_id', userSession.user.id);
  if (fromVal) query = query.gte('date', fromVal);
  if (toVal)   query = query.lte('date', toVal);

  const periodLabel = document.getElementById('metricasPeriodLabel');
  if (periodLabel) {
    periodLabel.textContent = fromVal && toVal ? `${fromVal} → ${toVal}` : fromVal ? `A partir de ${fromVal}` : toVal ? `Até ${toVal}` : 'Todos os registros';
  }

  const { data: diary } = await query;
  if (!diary || diary.length === 0) {
    ['metricasTotalContatos','metricasTotalAtendidas','metricasTotalDecisores','metricasTotalReunioes'].forEach(id => { document.getElementById(id).textContent='0'; });
    document.getElementById('metricasTaxaConversao').textContent='0%';
    document.getElementById('metricasTotalXP').textContent=userProfile.xp;
    return;
  }
  let totalContatos=0, totalAtendidas=0, totalDecisores=0, totalReunioes=0;
  diary.forEach(d=>{ totalContatos+=d.contatos_tentados||0; totalAtendidas+=d.ligacoes_atendidas||0; totalDecisores+=d.conexao_decisor||0; totalReunioes+=d.reunioes_marcadas||0; });
  const pct = (a,b) => b>0 ? ((a/b)*100).toFixed(1)+'%' : '—';
  const taxaAB = pct(totalAtendidas, totalContatos);
  const taxaBD = pct(totalDecisores, totalAtendidas);
  const taxaDR = pct(totalReunioes, totalDecisores);
  const taxaGeral = pct(totalReunioes, totalContatos);
  const _taxa = taxaGeral;
  document.getElementById('metricasTotalContatos').textContent=totalContatos;
  document.getElementById('metricasTotalAtendidas').textContent=totalAtendidas;
  document.getElementById('metricasTotalDecisores').textContent=totalDecisores;
  document.getElementById('metricasTotalReunioes').textContent=totalReunioes;
  document.getElementById('metricasTaxaConversao').textContent=taxaGeral;
  const funnelEl = document.getElementById('metricasFunil');
  if(funnelEl) {
    const steps = [
      {label:'Contatos → Atendidas', pct:taxaAB, clr:'linear-gradient(90deg,#FFB800,#F5C518)'},
      {label:'Atendidas → Decisores', pct:taxaBD, clr:'linear-gradient(90deg,#6A6A7A,#A0A0B0)'},
      {label:'Decisores → Reuniões', pct:taxaDR, clr:'linear-gradient(90deg,#4A4A5A,#383848)'},
      {label:'Taxa Geral (Contatos→Reuniões)', pct:taxaGeral, clr:'linear-gradient(90deg,#383848,#F5C518)', bold:true},
    ];
        funnelEl.innerHTML = steps.map(function(s) {
      const pv = s.pct==='—' ? 0 : parseFloat(s.pct);
      const cls = s.bold ? 'funil-step funil-geral' : 'funil-step';
      const pctCls = s.bold ? 'funil-pct funil-pct-geral' : 'funil-pct';
      return '<div class="'+cls+'">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><div class="funil-label">'+s.label+'</div>'+(s.vol?'<span style="font-family:\'JetBrains Mono\',monospace;font-size:.92rem;color:#5A584E;font-weight:600">'+s.vol+'</span>':'')+' </div>'
        +'<div class="funil-bar-wrap"><div class="funil-bar" style="width:'+Math.min(pv,100)+'%;background:'+s.clr+'"></div></div>'
        +'<div class="'+pctCls+'">'+s.pct+'</div>'
        +'</div>';
    }).join('');
  }
  document.getElementById('metricasTotalXP').textContent=userProfile.xp;
}

// ══ FUNIL DASHBOARD ══
function renderDashFunil(contatos, atendente, decisor, reunioes) {
  const container = document.getElementById('dashFunil');
  if (!container) return;

  const taxaEl = document.getElementById('funilTaxaGeral');
  if (taxaEl) taxaEl.textContent = contatos > 0 ? Math.round((reunioes/contatos)*100)+'%' : '—';

  const steps = [
    { label:'Ligações Totais',     sub:'chamadas discadas',         value:contatos,  pct:100,                                          grad:'linear-gradient(135deg,#E8B84B 0%,#C99A2E 100%)' },
    { label:'Conexão Atendente',   sub:'atendimento confirmado',    value:atendente, pct: contatos>0?Math.round(atendente/contatos*100):0, grad:'linear-gradient(135deg,#D4A832 0%,#8B6A10 100%)' },
    { label:'Conexão Decisor',     sub:'tomador de decisão',        value:decisor,   pct: contatos>0?Math.round(decisor/contatos*100):0,   grad:'linear-gradient(135deg,#8B7BAE 0%,#3D3258 100%)' },
    { label:'Reuniões Marcadas',   sub:'objetivo conquistado',      value:reunioes,  pct: contatos>0?Math.round(reunioes/contatos*100):0,  grad:'linear-gradient(135deg,#34D399 0%,#059669 100%)' },
  ];

  const maxVal = contatos || 1;
  let html = '';
  steps.forEach((s, i) => {
    const widthPct = Math.max(35, 100 - (i * 16));
    const barW = contatos > 0 ? Math.round((s.value / maxVal) * 100) : 0;
    const isLast = i === steps.length - 1;
    const borderCol = isLast ? 'rgba(52,211,153,.25)' : 'rgba(232,184,75,.15)';
    html += `
    <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:${i<3?'0':'0'}px">
      <!-- funnel block -->
      <div style="
        width:${widthPct}%;
        background:${s.grad};
        border-radius:${i===0?'12px 12px 0 0': i===3?'0 0 12px 12px':'0'};
        padding:${i===0?'14px 16px 10px': i===3?'10px 16px 14px':'10px 16px'};
        position:relative;overflow:hidden;
        transition:filter .2s;
      " onmouseover="this.style.filter='brightness(1.12)'" onmouseout="this.style.filter=''">
        <!-- shimmer -->
        <div style="position:absolute;top:0;left:0;right:0;height:1px;background:rgba(255,255,255,.25);border-radius:1px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:.96rem;font-weight:800;color:rgba(255,255,255,.9);letter-spacing:.3px">${s.label}</div>
            <div style="font-size:.94rem;color:rgba(255,255,255,.55);margin-top:1px">${s.sub}</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:'JetBrains Mono',monospace;font-size:1.1rem;font-weight:900;color:#fff;line-height:1">${s.value.toLocaleString('pt-BR')}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:.94rem;color:rgba(255,255,255,.65)">${s.pct}%</div>
          </div>
        </div>
      </div>
      ${i < 3 ? `<div style="width:${widthPct-10}%;height:8px;clip-path:polygon(0 0,100% 0,90% 100%,10% 100%);background:${s.grad};opacity:.35"></div>` : ''}
    </div>`;
  });
  container.innerHTML = html;
}


// ══ ARSENAL: toggle section ══
function toggleSection(headerEl) {
  const body = headerEl.nextElementSibling;
  if (!body) return;
  const arrow = headerEl.querySelector('svg');
  if (body.style.display === 'none' || body.style.display === '') {
    body.style.display = 'block';
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    body.style.display = 'none';
    if (arrow) arrow.style.transform = '';
  }
}

function openDoc(el) {
  if (el.classList.contains('locked')) return;
  // placeholder
  console.log('Abrindo documento...');
}

// ══ MISSÕES: filter ══
function filterMissoes(cat, btn) {
  document.querySelectorAll('[data-cat]').forEach(el => {
    el.style.display = cat==='all' || el.dataset.cat===cat ? '' : 'none';
  });
  document.querySelectorAll('[onclick^="filterMissoes"]').forEach(b => {
    b.style.background='transparent';b.style.color='var(--t3)';b.style.borderColor='rgba(255,255,255,.1)';
  });
  if (btn) { btn.style.background='rgba(232,184,75,.12)';btn.style.color='var(--g1)';btn.style.borderColor='rgba(232,184,75,.4)'; }
}

// ══ Render demo funil on load ══
document.addEventListener('DOMContentLoaded', () => {
  renderDashFunil(47, 23, 8, 2);
});



// ══ MISSION LEVEL DROPDOWN ══
window.toggleMissionLevelDropdown = function() {
  const menu = document.getElementById('missionLevelMenu');
  menu.classList.toggle('active');
  if (menu.classList.contains('active')) {
    const userLvl = getLevelInfo(userProfile?.xp || 0).level;
    let html = '';
    LEVELS.forEach(l => {
      const isLocked = l.level > userLvl;
      const isCurrent = l.level === userLvl;
      html += `<div class="level-dropdown-item ${isCurrent?'active':''} ${isLocked?'locked':''}" 
        onclick="${isLocked ? 'return false' : `selectMissionLevel(${l.level})`}">
        ${l.emoji || ''} Nível ${l.level} — ${l.name} ${isLocked ? '🔒' : ''}
      </div>`;
    });
    menu.innerHTML = html;
  }
};

window.selectMissionLevel = function(level) {
  const info = LEVELS.find(l => l.level === level);
  if (info) {
    document.getElementById('missionLevelLabel').textContent = `Nível ${level} — ${info.name}`;
    document.getElementById('missionLevelMenu').classList.remove('active');
    loadMissoes(level);
  }
};

// Close dropdown on outside click
document.addEventListener('click', function(e) {
  const dd = document.getElementById('missionLevelDropdown');
  if (dd && !dd.contains(e.target)) {
    document.getElementById('missionLevelMenu').classList.remove('active');
  }
});

// ══ MISSION STATUS FILTERS ══
window.filterMissoesByStatus = function(status, btn) {
  document.querySelectorAll('.mission-card-new, .mission-card').forEach(el => {
    const elStatus = el.dataset.status || 'pending';
    el.style.display = status === 'all' || elStatus === status ? '' : 'none';
  });
  // Update button styles
  document.querySelectorAll('[onclick^="filterMissoesByStatus"]').forEach(b => {
    b.style.background = 'transparent';
    b.style.color = 'var(--t3)';
    b.style.borderColor = 'rgba(255,255,255,.1)';
  });
  if (btn) {
    btn.style.background = 'rgba(232,184,75,.12)';
    btn.style.color = 'var(--g1)';
    btn.style.borderColor = 'rgba(232,184,75,.4)';
  }
};

// ══ MISSION DETAIL MODAL ══
window.openMissionDetail = function(mission) {
  document.getElementById('missionModalTitle').textContent = mission.title || 'Missão';
  document.getElementById('missionModalDesc').textContent = mission.description || 'Sem descrição disponível.';
  
  const xpEl = document.getElementById('missionModalXP');
  xpEl.textContent = `+${mission.xp_reward || 0} XP`;
  
  const deadlineEl = document.getElementById('missionModalDeadline');
  deadlineEl.textContent = mission.deadline ? `Prazo: ${mission.deadline}` : 'Sem prazo definido';
  
  let statusHtml = '';
  const cat = mission.category || '';
  const tipo = mission.tipo || '';
  if (cat) statusHtml += `<span style="font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.8px;padding:3px 10px;border-radius:20px;background:rgba(245,197,24,.1);color:var(--g1);border:1px solid rgba(245,197,24,.2)">${cat}</span>`;
  if (tipo) statusHtml += `<span style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,.06);color:var(--t2)">${tipo}</span>`;
  document.getElementById('missionModalStatus').innerHTML = statusHtml;
  
  const briefingEl = document.getElementById('missionModalBriefing');
  const briefingTextEl = document.getElementById('missionModalBriefingText');
  if (mission.briefing) {
    briefingEl.style.display = 'block';
    briefingTextEl.textContent = mission.briefing;
  } else {
    briefingEl.style.display = 'none';
  }
  
  document.getElementById('modalMission').classList.add('active');
};

window.closeMissionModal = function() {
  document.getElementById('modalMission').classList.remove('active');
};

// ══ ENCONTRO EXPAND ══
window.toggleEncontro = function(el) {
  el.closest('.encontro-card').classList.toggle('expanded');
};

// ══ ENHANCED BADGES GRID WITH LEVEL INFO ══
const LEVEL_INFO = {
  1: { name:'Prospector', emoji:'🥉', comissao:'7% (R$ 3.150/venda)', meta:'~1 venda (~R$ 3.150/mês)' },
  2: { name:'Captador', emoji:'🥈', comissao:'9% (R$ 4.050/venda)', meta:'~1,6 vendas (~R$ 6.480/mês)' },
  3: { name:'Parceiro', emoji:'🥇', comissao:'9% + Bônus', meta:'~2,4 vendas (~R$ 9.720/mês + bônus)' },
  4: { name:'Elite', emoji:'💎', comissao:'12% (R$ 5.400/venda)', meta:'~3,6 vendas (~R$ 19.440/mês)' },
 userLvl;
    const isMystery = lvl >= 6;
    
    let cardClass = 'insignia-card';
    if (isCurrent) cardClass += ' current';
    else if (!isUnlocked) cardClass += ' locked';
    if (isMystery && !isUnlocked) cardClass += ' mystery';
    
    html += `<div class="${cardClass}" style="padding:${isMystery && !isUnlocked ? '24px 16px' : '20px 16px'}">`;
    
    if (isMystery && !isUnlocked) {
      // Mystery levels - no badge, just mystery
      html += `<div style="font-size:2.8rem;margin-bottom:10px;filter:blur(0.5px)">?</div>`;
      html += `<div style="font-size:.82rem;font-weight:800;color:rgba(245,197,24,.5);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">NÍVEL ${lvl}</div>`;
      html += `<div style="font-size:.78rem;font-weight:700;color:rgba(255,255,255,.2)">${info.name}</div>`;
      html += `<div style="margin-top:12px;padding:10px;border-radius:8px;background:rgba(245,197,24,.03);border:1px solid rgba(245,197,24,.06)">`;
      html += `<div style="font-size:.68rem;color:rgba(245,197,24,.3);font-weight:600;font-style:italic">Desbloqueie os níveis anteriores para descobrir...</div>`;
      html += `</div>`;
    } else {
      // Normal levels
      const badgeImg = BADGE_IMGS[lvl] || '';
      if (badgeImg) {
        html += `<img src="${badgeImg}" style="width:72px;height:72px;object-fit:contain;mix-blend-mode:lighten;margin-bottom:10px;${!isUnlocked?'filter:grayscale(.7) brightness(.6);':'filter:drop-shadow(0 0 8px rgba(245,197,24,.2));'}" alt="N${lvl}">`;
      } else {
        html += `<div style="font-size:2.4rem;margin-bottom:10px">${info.emoji}</div>`;
      }
      
      html += `<div style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:2px;color:${isCurrent?'var(--g1)':isUnlocked?'var(--t1)':'var(--t3)'}">Nível ${lvl}</div>`;
      html += `<div style="font-size:.85rem;font-weight:700;color:${isCurrent?'#EDD97A':isUnlocked?'var(--t1)':'var(--t3)'};margin-bottom:10px">${info.name}</div>`;
      
      // Level details
      html += `<div style="text-align:left;padding:10px;border-radius:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04)">`;
      html += `<div style="font-size:.62rem;color:var(--t3);font-weight:600;margin-bottom:4px">COMISSÃO</div>`;
      html += `<div style="font-size:.72rem;color:${isUnlocked?'var(--g1)':'var(--t3)'};font-weight:700;font-family:'JetBrains Mono',monospace;margin-bottom:8px">${info.comissao}</div>`;
      html += `<div style="font-size:.62rem;color:var(--t3);font-weight:600;margin-bottom:4px">META</div>`;
      html += `<div style="font-size:.72rem;color:${isUnlocked?'var(--t1)':'var(--t3)'};font-weight:600">${info.meta}</div>`;
      html += `</div>`;
      
      if (!isUnlocked) {
        html += `<div style="margin-top:8px;font-size:.62rem;color:#F87171;font-weight:700">🔒 Desbloqueie evoluindo</div>`;
      }
    }
    
    html += `</div>`;
  }
  
  el.innerHTML = html;
}

// Override the original loadRanking to use enhanced badges
const _originalLoadRanking = typeof loadRanking !== 'undefined' ? loadRanking : null;

// ══ ENHANCED: Fix toggleSection for Arsenal ══
window.toggleSection = function(headerEl) {
  const body = headerEl.nextElementSibling;
  if (!body) return;
  const isHidden = body.style.display === 'none' || getComputedStyle(body).display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  // Toggle arrow
  const svg = headerEl.querySelector('svg');
  if (svg) {
    svg.style.transform = isHidden ? 'rotate(180deg)' : '';
    svg.style.transition = 'transform .25s';
  }
};



// ══ DIÁRIO: Filtered history load ══
window.loadDiarioFiltered = async function() {
  const fromVal = document.getElementById('diarioFrom')?.value || '';
  const toVal = document.getElementById('diarioTo')?.value || '';
  
  let query = sb.from('diary_entries').select('*').eq('user_id', userSession.user.id).order('date', { ascending: false });
  if (fromVal) query = query.gte('date', fromVal);
  if (toVal) query = query.lte('date', toVal);
  
  const { data: diary } = await query;
  const container = document.getElementById('diarioHistorico');
  if (!diary || diary.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Nenhum registro no período</div></div>';
    return;
  }
  let html = '<table class="table"><thead><tr><th>Data</th><th>Lig. Totais</th><th>Cx. Atendente</th><th>Cx. Decisor</th><th>Marcadas</th><th>Realizadas</th></tr></thead><tbody>';
  diary.forEach(d => {
    html += `<tr><td>${new Date(d.date+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>${d.contatos_tentados}</td><td>${d.ligacoes_atendidas}</td><td>${d.conexao_decisor}</td><td>${d.reunioes_marcadas}</td><td>${d.reunioes_realizadas||0}</td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
};



