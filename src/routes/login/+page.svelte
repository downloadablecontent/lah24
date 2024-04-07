<script lang="ts">
  import { goto } from "$app/navigation";

  import { credentials_store } from "$lib/storage";
  import { Client } from "$lib/matrix";

  let user_id: string, password: string;

  async function login() {
    const creds = await Client.get_creds(user_id, password);

    if (creds) {
      credentials_store.set(creds);
      goto("/");
    } else {
      //error message
      //
    }
  }
</script>

<form on:submit={login}>
  <label for="user_id">User ID:</label>
  <input type="text" id="user_id" placeholder="@shine:example.org" bind:value={user_id}/>
  <br>
  <label for="password">Password:</label>
  <input type="password" id="password" placeholder="correct horse battery staple" bind:value={password}/>
  <input value="Login" type="submit"/>
</form>
