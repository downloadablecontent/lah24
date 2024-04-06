<script lang="ts">
  import { goto } from "$app/navigation";

  import { credentials_store } from "$lib/storage";
  import { Client } from "$lib/matrix";

  let user_id: string, password: string;

  async function login() {
    const access_token = await Client.get_access_token(user_id, password);
    //console.log(access_token)
    if (access_token) {
      credentials_store.set({
        access_token,
        user_id,
      });
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
