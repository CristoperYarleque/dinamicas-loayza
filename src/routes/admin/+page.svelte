<script>
  import Acceso from '#lib/Acceso.svelte';
  import AdminPanel from '#lib/AdminPanel.svelte';
</script>

<svelte:head>
  <title>Administración</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<Acceso titulo="🔧 Administración" actual="/admin">
  <AdminPanel />
</Acceso>