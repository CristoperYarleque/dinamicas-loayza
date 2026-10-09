// Sonidos sintetizados con Web Audio (sin archivos de audio)
let ctx = null;
let master = null;
let activo = true;
const VOLUMEN = 0.6; // volumen general (0 a 1)

try {
  activo = localStorage.getItem('bn_sonido') !== 'off';
} catch {}

export const sonidoActivo = () => activo;

export function setSonido(valor) {
  activo = valor;
  try {
    localStorage.setItem('bn_sonido', valor ? 'on' : 'off');
  } catch {}
}

// Debe llamarse dentro de un clic: los navegadores no dejan sonar antes
export function activar() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = VOLUMEN;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
}

const ok = () => activo && ctx && master;

function nota(freq, inicio, dur, { tipo = 'sine', vol = 0.3, hasta = null, filtro = null } = {}) {
  const t = ctx.currentTime + inicio;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  if (filtro) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filtro;
    g.connect(f);
    f.connect(master);
  } else {
    g.connect(master);
  }
  o.start(t);
  o.stop(t + dur + 0.05);
}

function ruido(inicio, dur, { vol = 0.2, tipo = 'lowpass', desde = 4000, hasta = 400 } = {}) {
  const t = ctx.currentTime + inicio;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = tipo;
  f.frequency.setValueAtTime(desde, t);
  f.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t);
}

// "tac" cada vez que una fila cruza el centro
export function tick(fuerza = 1) {
  if (!ok()) return;
  const f = 900 + Math.random() * 120;
  nota(f, 0, 0.045, { tipo: 'square', vol: 0.12 * fuerza, hasta: f * 0.5, filtro: 3000 });
}

// Arranque del giro
export function arranque() {
  if (!ok()) return;
  nota(180, 0, 0.5, { tipo: 'sawtooth', vol: 0.1, hasta: 700, filtro: 1500 });
}

// El carrete se clava en el resultado
export function golpe() {
  if (!ok()) return;
  nota(160, 0, 0.35, { tipo: 'sine', vol: 0.5, hasta: 50 });
  ruido(0, 0.12, { vol: 0.25, desde: 1500, hasta: 200 });
}

// Al agua: chapoteo + gota + trombón triste
export function agua() {
  if (!ok()) return;
  ruido(0, 0.5, { vol: 0.35, tipo: 'lowpass', desde: 5000, hasta: 300 });
  nota(700, 0.02, 0.25, { tipo: 'sine', vol: 0.2, hasta: 250 });
  [[392, 0.35, 0.28], [370, 0.65, 0.28], [349, 0.95, 0.28], [330, 1.25, 0.8]].forEach(
    ([f, t, d]) => nota(f, t, d, { tipo: 'sawtooth', vol: 0.18, hasta: f * 0.96, filtro: 900 })
  );
}

// Ganador: fanfarria + acorde + ovación
export function ganador() {
  if (!ok()) return;
  const acorde = [523.25, 659.25, 783.99, 1046.5];
  acorde.forEach((f, i) => nota(f, i * 0.13, 0.3, { tipo: 'triangle', vol: 0.3 }));
  acorde.forEach((f) => nota(f, 0.55, 1.6, { tipo: 'triangle', vol: 0.22 }));
  [1046.5, 1318.5, 1568].forEach((f, i) =>
    nota(f, 0.55 + i * 0.05, 1.2, { tipo: 'sine', vol: 0.1 })
  );
  ruido(0.5, 0.2, { vol: 0.4, tipo: 'highpass', desde: 800, hasta: 3000 });
  for (let i = 0; i < 24; i++) {
    ruido(0.6 + i * 0.1, 0.12, {
      vol: 0.1 * (1 - i / 30),
      tipo: 'bandpass',
      desde: 2500 + Math.random() * 2000,
      hasta: 1500
    });
  }
}