// Matrix SDK Hack
// @ts-ignore
window.global ||= window;
import * as sdk from "matrix-js-sdk";
import { get } from "svelte/store";
import { credentials_store } from "$lib/storage";


export class Client {
  client: sdk.MatrixClient;
  rooms: string[] = [];
  c_room: string = '!fwFslMSZEAahxTqOXJ:matrix.org';

  constructor (user_id: string, access_token: string) {
    this.client = sdk.createClient({
      baseUrl: "https://matrix.org",
      deviceId: '1234',
      accessToken: access_token,
      userId: user_id,
      cryptoStore: new sdk.MemoryCryptoStore,
    });

    this.init();
  }

  async init () {
    await this.client.initCrypto()
    await this.client.startClient()
  
    this.client.once(sdk.ClientEvent.Sync, (state: string) => {
      console.log("post-login sync state: ", state);

      // Ignore device verification
      this.client.setGlobalErrorOnUnknownDevices(false);

      this.client.on(sdk.RoomEvent.Timeline, function (event, room, toStartOfTimeline) {

        if (event.getType() !== "m.room.message") 
          return;

        const message = event.event.content;
        console.log('message: ', message);
      });

      this.join_room(this.c_room)
        .then(room => {
          console.log('joined room: ', this.c_room, room);
          const rooms = this.client.getRooms();

          console.log('rooms: ', rooms);
        })
    });
  }

  static from_local_storage(): Client | undefined {
    const { user_id, access_token } = get(credentials_store);

    if (user_id && access_token) {
      return new Client(user_id, access_token);
    } else {
      return undefined;
    }
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

  bind_message_stream (roomId: string, stream: string[]) {
    
  }

  async join_room (roomId: string) {
    await this.client.joinRoom(roomId)
      .then (res => console.log('joined room: ', res))
      .catch(err => console.log('error on join room: ', err));
  }

  async send_message (body: string) {
    await this.client.sendTextMessage(this.c_room, body)
      .then (res => console.log('sent message: ', res))
      .catch(err => console.log('error on send message: ', err));
  }
}
