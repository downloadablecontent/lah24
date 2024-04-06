<script lang="ts">
  import { goto } from "$app/navigation";
  import { Client } from "$lib/matrix";

  const client: Client | undefined = Client.from_local_storage();

  if (client) {
    console.log('hello: ', client);
  } else {
    goto("/login");
  }

  let input = "";
  let messages = [];

  // Bind
  client.bind_message_stream('#lah24:matrix.org', messages);

  const send = () => { 
    console.log('sending: ', input);
    client.send_message(input);
  }

</script>

<div>Texts: </div>
<div>
  {#each messages as message}
    <div>{message}</div>
  {/each}
</div>

<form on:submit={send}>
  <input type="text" placeholder="orthogonal diagnolizer" bind:value={input}/>
  <input value="send" type="submit"/>
</form>
