<script lang="ts">
  import { goto } from "$app/navigation";

  import { MatrixClient } from "$lib/matrix";

  const client: MatrixClient | undefined = MatrixClient.from_local_storage();

  if (client) {
    //
  } else {
    goto("/login");
  }
</script>
