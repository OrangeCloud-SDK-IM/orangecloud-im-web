import {
  HubConnection, HubConnectionBuilder, HubConnectionState,
  HttpTransportType, LogLevel,
} from "@microsoft/signalr";

export enum ConnectionState {
  Connecting = "connecting",
  Connected = "connected",
  Disconnected = "disconnected",
  Reconnecting = "reconnecting",
}

export interface OrangeCloudIMClientOptions {
  onMessageReceived?: (messageJson: string) => void;
  onUserJoined?: (userInfoJson: string) => void;
  onUserLeft?: (userKey: string) => void;
  onOnlineCountChanged?: (count: number) => void;
  onMuted?: (muteInfoJson: string) => void;
  onUnmuted?: (userKey: string) => void;
  onRoomClosed?: () => void;
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onError?: (message: string) => void;
}

export class OrangeCloudIMClient {
  private connection: HubConnection | null = null;
  private _connectionState: ConnectionState = ConnectionState.Disconnected;
  private options: OrangeCloudIMClientOptions;

  constructor(options: OrangeCloudIMClientOptions = {}) {
    this.options = options;
  }

  get connectionState(): ConnectionState { return this._connectionState; }

  async login(hubUrl: string, appId: string, userId: string, userSig: string): Promise<void> {
    const params = `appId=${encodeURIComponent(appId)}&userId=${encodeURIComponent(userId)}&userSig=${encodeURIComponent(userSig)}`;
    const url = hubUrl.includes("?") ? `${hubUrl}&${params}` : `${hubUrl}?${params}`;

    this.connection = new HubConnectionBuilder()
      .withUrl(url, { transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    this.registerCallbacks();
    this.registerConnectionEvents();
    this.setConnectionState(ConnectionState.Connecting);

    try {
      await this.connection.start();
      this.setConnectionState(ConnectionState.Connected);
    } catch (err) {
      this.setConnectionState(ConnectionState.Disconnected);
      throw err;
    }
  }

  async logout(): Promise<void> {
    if (this.connection) { await this.connection.stop(); this.connection = null; }
    this.setConnectionState(ConnectionState.Disconnected);
  }

  async joinGroup(groupId: string): Promise<void> { await this.connection?.invoke("JoinGroup", groupId); }
  async quitGroup(groupId: string): Promise<void> { await this.connection?.invoke("QuitGroup", groupId); }
  async sendGroupMsg(groupId: string, messageJson: string): Promise<void> { await this.connection?.invoke("SendGroupMsg", groupId, messageJson); }
  async getGroupMemberList(groupId: string): Promise<void> { await this.connection?.invoke("GetGroupMemberList", groupId); }

  dispose(): void {
    this.connection?.stop(); this.connection = null;
    this.setConnectionState(ConnectionState.Disconnected);
  }

  private setConnectionState(state: ConnectionState): void {
    if (this._connectionState !== state) { this._connectionState = state; this.options.onConnectionStateChanged?.(state); }
  }

  private registerCallbacks(): void {
    if (!this.connection) return;
    this.connection.on("ReceiveMessage", (msg: string) => this.options.onMessageReceived?.(msg));
    this.connection.on("UserJoined", (info: string) => this.options.onUserJoined?.(info));
    this.connection.on("UserLeft", (key: string) => this.options.onUserLeft?.(key));
    this.connection.on("OnlineCountChanged", (count: number) => this.options.onOnlineCountChanged?.(count));
    this.connection.on("OnMuted", (info: string) => this.options.onMuted?.(info));
    this.connection.on("OnUnmuted", (key: string) => this.options.onUnmuted?.(key));
    this.connection.on("RoomClosed", () => this.options.onRoomClosed?.());
    this.connection.on("Error", (msg: string) => this.options.onError?.(msg));
  }

  private registerConnectionEvents(): void {
    if (!this.connection) return;
    this.connection.onclose(() => this.setConnectionState(ConnectionState.Disconnected));
    this.connection.onreconnecting(() => this.setConnectionState(ConnectionState.Reconnecting));
    this.connection.onreconnected(() => this.setConnectionState(ConnectionState.Connected));
  }
}
