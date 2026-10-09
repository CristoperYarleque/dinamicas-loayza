<script>
  import Acceso from '#lib/Acceso.svelte';
  import SorteoPanel from '#lib/SorteoPanel.svelte';
</script>

<svelte:head>
  <title>Dinámica en vivo</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<Acceso titulo="🎰 Dinámicas en vivo" menu={false}>
  <SorteoPanel />
</Acceso>