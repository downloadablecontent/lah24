import * as sdk from "matrix-js-sdk";
import { get } from "svelte/store";

import { credentials_store } from "$lib/storage";

export class MatrixClient {
  client: sdk.MatrixClient;

  constructor(user_id: string, access_token: string) {
    this.client = sdk.createClient({
      baseUrl: "https://matrix.org",
      accessToken: access_token,
      userId: user_id,
    });
  }

  static from_local_storage(): MatrixClient | undefined {
    //todo, encrypt
    const credentials = get(credentials_store);
    if (credentials.user_id && credentials.access_token) {
      return new MatrixClient(credentials.user_id, credentials.access_token);
    }
    return undefined;
  }

  static async get_access_token(user_id: string, password: string): Promise<string | undefined> {
    const resp = await fetch("https://matrix.org/_matrix/client/v3/login", {
      method: "POST",
      body: JSON.stringify({
        type: "m.login.password",
        identifier: {
          type: "m.id.user",
          user: user_id,
        },
        password: password,
        initial_device_display_name: "Starkchat Client",
      }),
    });
    if (resp.status === 200) {
      const resp_json = await resp.json();
      return resp_json.access_token;
    } else {
      return undefined;
    }
  }

  //
}
