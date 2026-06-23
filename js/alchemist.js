/* ============================================
   alchemist.js — 小矮人药剂师动画控制器
   ============================================ */

const Alchemist = {
  state: 'idle',
  canvas: null,
  ctx: null,
  particles: [],
  animFrame: null,
  width: 0,
  height: 0,

  // --- 初始化 ---
  init() {
    this.canvas = document.getElementById('particleCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop();
  },

  resize() {
    const scene = document.getElementById('alchemyScene');
    if (!scene) return;
    this.width = scene.clientWidth;
    this.height = scene.clientHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  },

  // --- 状态切换 ---
  setState(newState) {
    this.state = newState;
    const dwarf = document.getElementById('dwarf');
    const potion = document.getElementById('potionLiquid');

    // 移除所有状态类
    dwarf.classList.remove('state-receiving', 'state-decomposing', 'state-reviewing', 'state-extracting', 'state-complete');
    potion.classList.remove('active', 'reviewing', 'extracting');

    switch (newState) {
      case 'idle':
        this.setPhaseIndicator(null);
        break;
      case 'receiving':
        dwarf.classList.add('state-receiving');
        this.setPhaseIndicator(null);
        break;
      case 'decomposing':
        dwarf.classList.add('state-decomposing');
        potion.classList.add('active');
        this.setPhaseIndicator('decompose');
        break;
      case 'reviewing':
        dwarf.classList.add('state-reviewing');
        potion.classList.add('active', 'reviewing');
        this.setPhaseIndicator('review');
        break;
      case 'extracting':
        dwarf.classList.add('state-extracting');
        potion.classList.add('active', 'extracting');
        this.setPhaseIndicator('extract');
        break;
      case 'complete':
        dwarf.classList.add('state-complete');
        potion.classList.remove('active', 'reviewing', 'extracting');
        this.setPhaseIndicator(null);
        // 完成粒子爆发
        this.burstParticles('gold');
        break;
    }
  },

  setPhaseIndicator(phase) {
    const dots = document.querySelectorAll('.phase-dot');
    const steps = document.querySelectorAll('.phase-step');
    dots.forEach(d => d.classList.remove('active', 'done'));
    steps.forEach(s => s.classList.remove('current', 'done'));

    if (!phase) return;

    const order = ['decompose', 'review', 'extract'];
    const idx = order.indexOf(phase);

    order.forEach((p, i) => {
      const dot = document.querySelector(`.phase-step[data-phase="${p}"] .phase-dot`);
      const step = document.querySelector(`.phase-step[data-phase="${p}"]`);
      if (i < idx) { dot.classList.add('done'); step.classList.add('done'); }
      if (i === idx) { dot.classList.add('active'); step.classList.add('current'); }
    });
  },

  // --- 粒子爆发 ---
  burstParticles(color) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push({
        x: this.width / 2,
        y: this.height * 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 60 + Math.random() * 40,
        maxLife: 100,
        color: color === 'gold'
          ? `hsl(${40 + Math.random() * 20}, 80%, ${50 + Math.random() * 30}%)`
          : `hsl(${100 + Math.random() * 30}, 60%, ${50 + Math.random() * 20}%)`,
        type: Math.random() > 0.3 ? 'spark' : 'leaf',
        size: 2 + Math.random() * 5
      });
    }
  },

  // --- 粒子循环 ---
  loop() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 绘制环境粒子（根据状态）
    const activeStates = ['decomposing', 'reviewing', 'extracting'];
    if (activeStates.includes(this.state)) {
      if (Math.random() < 0.3) {
        this.spawnAmbientParticle();
      }
    } else if (this.state === 'idle') {
      if (Math.random() < 0.05) {
        this.spawnAmbientParticle();
      }
    }

    // 更新并绘制所有粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.01; // 微浮力
      p.life--;

      const alpha = Math.max(0, p.life / p.maxLife);
      this.ctx.save();
      this.ctx.globalAlpha = alpha;

      if (p.type === 'leaf') {
        this.drawLeaf(p.x, p.y, p.size, p.color);
      } else if (p.type === 'petal') {
        this.drawPetal(p.x, p.y, p.size, p.color);
      } else {
        this.drawSpark(p.x, p.y, p.size, p.color);
      }

      this.ctx.restore();

      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.animFrame = requestAnimationFrame(() => this.loop());
  },

  spawnAmbientParticle() {
    const colors = {
      'idle': ['#f4a460', '#7ec8a0', '#d4a574'],
      'decomposing': ['#7ec8a0', '#5a9e78', '#a0d4b0'],
      'reviewing': ['#c0b0d0', '#a090c0', '#d4c4e0'],
      'extracting': ['#ffd740', '#ffc400', '#ffe080']
    };
    const palette = colors[this.state] || colors['idle'];

    this.particles.push({
      x: this.width / 2 + (Math.random() - 0.5) * 120,
      y: this.height * 0.5 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.8,
      life: 80 + Math.random() * 100,
      maxLife: 180,
      color: palette[Math.floor(Math.random() * palette.length)],
      type: Math.random() > 0.6 ? 'leaf' : (Math.random() > 0.5 ? 'petal' : 'spark'),
      size: 2 + Math.random() * 4
    });
  },

  // --- 绘制函数 ---
  drawLeaf(x, y, size, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.4, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // 叶脉
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.6, y);
    ctx.lineTo(x + size * 0.6, y);
    ctx.stroke();
  },

  drawPetal(x, y, size, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.5, size, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  drawSpark(x, y, size, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 2;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  },

  // --- 停止 ---
  stop() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.particles = [];
    this.setState('idle');
  }
};
