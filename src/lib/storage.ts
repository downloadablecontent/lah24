import { browser } from "$app/environment";
import { writable } from "svelte/store";

/*
{
  access_token: string,
  user_id: string,
}
*/
const credentials = browser ? JSON.parse(window.localStorage.getItem("credentials") ?? "{}") : {};
export const credentials_store = writable(credentials);

credentials_store.subscribe(value => {
  if (browser) {
    window.localStorage.setItem("credentials", JSON.stringify(value));
  }
});
