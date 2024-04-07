<script lang="ts">
  import { goto } from "$app/navigation";
  import { Client } from "$lib/matrix";

  const client: Client | undefined = Client.from_local_storage();

  let input: string = "";
  let messages = [];

  if (typeof client === "undefined") {
    goto("/login");
  } else {
    console.log('hello: ', client);

    // Bind
    client.bind_message_stream('#lah24:matrix.org', messages);
  }

  const send = async () => { 
    console.log('sending: ', input);
    if (client) {
      let resp = await client.send_message(input);
      if (resp) {
        input = "";
      }
    }
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
