<script>
  import { admin } from '#lib/api.js';

  let { combos, alCambiar } = $props();

  let nombre = $state('');
  let pagados = $state(3);
  let total = $state(5);
  let msg = $state('');
  let enviando = $state(false);

  async function crear(e) {
    e.preventDefault();
    if (enviando) return;
    enviando = true;
    msg = '';
    try {
      const r = await admin('crearCombo', { nombre, pagados, total });
      msg = r.error ?? '';
      if (!r.error) {
        nombre = '';
        await alCambiar();
      }
    } catch {
      msg = 'Sin conexión. Revisa la lista antes de repetir.';
    } finally {
      enviando = false;
    }
  }
</script>

<form class="caja" onsubmit={crear}>
  <label class="campo" for="c-nombre">Nombre del combo</label>
  <input id="c-nombre" bind:value={nombre} placeholder="Ej: Diamante" autocomplete="off" />
  <label class="campo" for="c-pag">Cuántos números paga</label>
  <input id="c-pag" type="number" min="1" bind:value={pagados} />
  <label class="campo" for="c-tot">Cuántos números recibe en total</label>
  <input id="c-tot" type="number" min="1" bind:value={total} />
  <button class="btn" disabled={enviando || nombre.trim().length < 2}>Agregar combo</button>
  {#if msg}<div class="msg err">{msg}</div>{/if}
</form>

<section class="caja">
  <strong>🧩 Combos actuales</strong>
  {#each combos as k}
    <div class="item">
      <strong>{k.nombre}</strong>
      <span>paga {k.pagados} → recibe {k.total}</span>
    </div>
  {/each}
</section>