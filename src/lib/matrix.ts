// Matrix SDK Hack
// @ts-ignore
window.global ||= window;
import * as sdk from "matrix-js-sdk";
import { get } from "svelte/store";
import { credentials_store } from "$lib/storage";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Client {
  client: sdk.MatrixClient;
  rooms: string[] = [];
  c_room: string = "";

  constructor (user_id: string, access_token: string, device_id: string) {
    this.client = sdk.createClient({
      baseUrl: "https://matrix.org",
      accessToken: access_token,
      deviceId: device_id,
      userId: user_id,
      cryptoStore: new sdk.MemoryCryptoStore,
    })
    console.log('creds: ', this.client.credentials);

    this.sync();
  }

  async sync() {
    await this.client.initCrypto()
    await this.client.startClient()
  
    this.client.once(sdk.ClientEvent.Sync, (state: string) => {
      console.log("post-login sync state: ", state);

      if (state !== 'PREPARED') 
        return console.error('sync failed with: ', state);

      this.init();
    });
  }

  /*
  async verify_self() {
    console.log("DEVICES", await this.client.getDevices());
    const client_crypto = this.client.getCrypto()!;

    const verification_request = await client_crypto.requestOwnUserVerification();

    const verifier = await verification_request.startVerification("m.sas.v1");

    let a = await verifier.verify();

    console.log("AAA", a)

    console.log(verification_request);

    setInterval(() => {
      console.log(verification_request.phase)
    }, 1000);

    //

    verifier.once(sdk.Crypto.VerifierEvent.ShowSas, (sas) => {
      console.log("SAS", sas)
      sas.confirm() //sas.mismatch
      //
    });

    //
  }*/

  async init() {
    const rooms = this.client.getRooms();

    console.log("ROOMS", rooms);

    //FIX LATER TODO
    this.c_room = rooms[0].roomId;

    await this.join_room(this.c_room)
      .then(room => {
        console.log('joined room: ', this.c_room, room);
        const rooms = this.client.getRooms();

        console.log('rooms: ', rooms);
      })
    //await sleep(5000);
    
    console.log('room keys: ', await this.client.exportRoomKeys());

    this.client.on(sdk.CryptoEvent.VerificationRequestReceived, async (verification_request: sdk.Crypto.VerificationRequest) => {
      await verification_request.accept();
      
      //const verifier = await verification_request.startVerification("m.sas.v1");
      
      console.log(verification_request.methods)

      const verifier = await verification_request.beginKeyVerification(
        verification_request.methods[0],
        {
          deviceId: verification_request.otherDeviceId,
          userId: verification_request.otherUserId,
        }
      );

      console.log('ACCEPTED VERIFY REQUEST')

      verifier.verify();
    
      /*verifier.once(sdk.Crypto.VerifierEvent.ShowSas, async (sas) => {
        console.log("SAS", sas.sas)
        sas.confirm();
        //
      });*/

      //simulate a thingy
      setTimeout(() => {
        let ec = verifier.getShowSasCallbacks()
        let emoji = ec?.sas.emoji?.map((e) => e[0]).join("");
        let resp = prompt(`Do you see this on your other session (Y/N)? ${emoji}`);
        if (resp?.toLowerCase() === "y") {
          ec?.confirm();
        } else {
          ec?.mismatch();
        }
      }, 5000);

      //await verifier.verify();
    });

    // Ignore device verification
    this.client.setGlobalErrorOnUnknownDevices(false);
    //console.log('crypto: ', this.client.crypto);

    this.client.on(sdk.RoomEvent.Timeline, async (event, room, toStartOfTimeline) => {

      console.log('event.getType(): ', event.getType());
      if (event.getType() !== "m.room.encrypted") 
        return;

      const dec = await this.client.decryptEventIfNeeded(event, { emit: true });
      const message = event.event.content;
      console.log('message: ', message,  dec);
    });

    this.client.on(sdk.MatrixEventEvent.Decrypted, async function (event){
      console.log('MatrixEventEvent.Decrypted: ', event, event.getContent());
    });

    //
  }

  /*
  async autoVerify (room_id: string) {
    let room = this.client.getRoom(room_id);
    if (!room) return;

    let members = (await room.getEncryptionTargetMembers()).map(
      (x) => x['userId']
    );
    let memberkeys = await this.client.downloadKeys(members);
    await this.client.claimOneTimeKeys({
      one_time_keys: memberkeys,
    });
    const e2eMembers = await room.getEncryptionTargetMembers();
    for (const member of e2eMembers) {
      const devices = this.client.getStoredDevicesForUser(member.userId);
      for (const device of devices) {
        if (device.isUnverified()) {
          await this.client.setDeviceKnown(member.userId, member.deviceId, true);
          await this.client.setDeviceVerified(member.userId, member.deviceId, true);
        }
      }
    }
  };
  */

  static from_local_storage(): Client | undefined {
    const { user_id, access_token, device_id} = get(credentials_store);

    if (user_id && access_token && device_id) {
      return new Client(user_id, access_token, device_id);
    } else {
      return undefined;
    }
  }

  static async get_creds(user_id: string, password: string): Promise<string | undefined> {
    const body = {
      type: "m.login.password",
      identifier: {
        type: "m.id.user",
        user: user_id,
      },
      password: password,
      initial_device_display_name: "Starkchat Client",
    }
    const resp = await fetch("https://matrix.org/_matrix/client/v3/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (resp.status !== 200)
      return undefined;

    const creds = await resp.json();
    console.log('login resp, creds: ', creds);
    return creds;
  }

  bind_message_stream(roomId: string, stream: string[]) {
    //
  }

  async join_room(roomId: string) {
    await this.client.joinRoom(roomId)
      .then (res => console.log('joined room: ', res))
      .catch(err => console.log('error on join room: ', err));
  }

  async send_message(body: string) {
    return await this.client.sendTextMessage(this.c_room, body)
      //.then (res => console.log('sent message: ', res))
      .catch(err => console.log('error on send message: ', err));
  }
}
