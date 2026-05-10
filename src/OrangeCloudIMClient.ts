import {
  HubConnection, HubConnectionBuilder,
  HttpTransportType, LogLevel,
} from "@microsoft/signalr";
import {
  IMMessage, TextMessage, GiftMessage, SystemNotice, CustomMessage,
  StateRestoredInfo, ReconnectAttemptInfo, IMMessageType,
  isTextMessage, isGiftMessage, isSystemNotice, isCustomMessage,
  parseIMMessage,
} from "./models/IMMessage";

/**
 * 连接状态枚举（扩展，添加 restoring 状态）
 * Task 11.2
 */
export enum ConnectionState {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
  Reconnecting = "reconnecting",
  Restoring = "restoring",
}

export interface OrangeCloudIMClientOptions {
  /** 原有回调 - 保持向后兼容 */
  onMessageReceived?: (messageJson: string) => void;
  onUserJoined?: (userInfoJson: string) => void;
  onUserLeft?: (userKey: string) => void;
  onOnlineCountChanged?: (count: number) => void;
  onMuted?: (muteInfoJson: string) => void;
  onUnmuted?: (userKey: string) => void;
  onRoomClosed?: () => void;
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onError?: (message: string) => void;

  /** Task 11.4: 类型安全的事件回调 */
  onTextMessage?: (msg: TextMessage) => void;
  onGiftMessage?: (msg: GiftMessage) => void;
  onSystemNotice?: (msg: SystemNotice) => void;
  onCustomMessage?: (msg: CustomMessage) => void;

  /** Task 11.5: 广播、批量消息、状态恢复事件 */
  onBroadcastReceived?: (msg: IMMessage) => void;
  onBatchMessageReceived?: (msgs: IMMessage[]) => void;
  onStateRestored?: (info: StateRestoredInfo) => void;

  /** Task 11.6: 重连事件 */
  onReconnectAttempt?: (info: ReconnectAttemptInfo) => void;
  onReconnectFailed?: () => void;

  /** Task 11.6: 最大重连次数，-1 表示无限重连 */
  maxReconnectAttempts?: number;

  /** Task 11.9: 心跳间隔（毫秒），默认 30000 */
  heartbeatIntervalMs?: number;
}

export class OrangeCloudIMClient {
  private connection: HubConnection | null = null;
  private _connectionState: ConnectionState = ConnectionState.Disconnected;
  private options: OrangeCloudIMClientOptions;

  /** Task 11.3: 每个群组的最后序列号跟踪 */
  private lastSequenceNumbers: Map<string, number> = new Map();

  /** Task 11.7: 重连相关状态 */
  private reconnectAttemptCount: number = 0;
  private isManualDisconnect: boolean = false;
  private hubUrl: string = "";
  private appId: string = "";
  private userId: string = "";
  private userSig: string = "";
  private onlineEventHandler: (() => void) | null = null;

  /** Task 11.9: 心跳定时器 */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: OrangeCloudIMClientOptions = {}) {
    this.options = options;
  }

  get connectionState(): ConnectionState { return this._connectionState; }

  async login(hubUrl: string, appId: string, userId: string, userSig: string): Promise<void> {
    this.hubUrl = hubUrl;
    this.appId = appId;
    this.userId = userId;
    this.userSig = userSig;
    this.isManualDisconnect = false;
    this.reconnectAttemptCount = 0;

    const connection = this.buildConnection(hubUrl, appId, userId, userSig);
    this.connection = connection;

    this.registerCallbacks();
    this.registerConnectionEvents();
    this.setupNetworkListener();
    this.setConnectionState(ConnectionState.Connecting);

    try {
      await this.connection.start();
      this.setConnectionState(ConnectionState.Connected);
      this.startHeartbeat();
    } catch (err) {
      this.setConnectionState(ConnectionState.Disconnected);
      throw err;
    }
  }

  async logout(): Promise<void> {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.removeNetworkListener();
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
    this.lastSequenceNumbers.clear();
    this.setConnectionState(ConnectionState.Disconnected);
  }

  async joinGroup(groupId: string, lastSequenceNumber?: number): Promise<void> {
    if (lastSequenceNumber !== undefined) {
      await this.connection?.invoke("JoinGroup", groupId, lastSequenceNumber);
    } else {
      const lastSeq = this.lastSequenceNumbers.get(groupId);
      if (lastSeq !== undefined && lastSeq > 0) {
        await this.connection?.invoke("JoinGroup", groupId, lastSeq);
      } else {
        await this.connection?.invoke("JoinGroup", groupId);
      }
    }
  }

  async quitGroup(groupId: string): Promise<void> {
    await this.connection?.invoke("QuitGroup", groupId);
    this.lastSequenceNumbers.delete(groupId);
  }

  async sendGroupMsg(groupId: string, messageJson: string): Promise<void> {
    await this.connection?.invoke("SendGroupMsg", groupId, messageJson);
  }

  async getGroupMemberList(groupId: string): Promise<void> {
    await this.connection?.invoke("GetGroupMemberList", groupId);
  }

  /** Task 11.8: 类型安全的发送方法 - 发送文本消息 */
  async sendTextMessage(groupId: string, content: string): Promise<void> {
    const msg = JSON.stringify({
      messageType: 'text' as IMMessageType,
      data: { content },
    });
    await this.sendGroupMsg(groupId, msg);
  }

  /** Task 11.8: 类型安全的发送方法 - 发送礼物消息 */
  async sendGiftMessage(groupId: string, giftInfo: {
    giftId: string;
    giftName: string;
    giftCount: number;
    giftPrice: number;
    animationUrl: string;
  }): Promise<void> {
    const msg = JSON.stringify({
      messageType: 'gift' as IMMessageType,
      data: giftInfo,
    });
    await this.sendGroupMsg(groupId, msg);
  }

  /** Task 11.8: 类型安全的发送方法 - 发送自定义消息 */
  async sendCustomMessage(groupId: string, customType: string, payload: Record<string, any>): Promise<void> {
    const msg = JSON.stringify({
      messageType: 'custom' as IMMessageType,
      data: { customType, payload },
    });
    await this.sendGroupMsg(groupId, msg);
  }

  /** Task 11.8: 获取指定群组的最后序列号 */
  getLastSequenceNumber(groupId: string): number {
    return this.lastSequenceNumbers.get(groupId) ?? 0;
  }

  dispose(): void {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.removeNetworkListener();
    this.connection?.stop();
    this.connection = null;
    this.lastSequenceNumbers.clear();
    this.setConnectionState(ConnectionState.Disconnected);
  }

  // ─── Private Methods ───────────────────────────────────────────────

  private buildConnection(hubUrl: string, appId: string, userId: string, userSig: string): HubConnection {
    const params = `appId=${encodeURIComponent(appId)}&userId=${encodeURIComponent(userId)}&userSig=${encodeURIComponent(userSig)}`;
    const url = hubUrl.includes("?") ? `${hubUrl}&${params}` : `${hubUrl}?${params}`;

    return new HubConnectionBuilder()
      .withUrl(url, { transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();
  }

  private setConnectionState(state: ConnectionState): void {
    if (this._connectionState !== state) {
      this._connectionState = state;
      this.options.onConnectionStateChanged?.(state);
    }
  }

  private registerCallbacks(): void {
    if (!this.connection) return;

    // 原有回调 - 保持向后兼容
    this.connection.on("ReceiveMessage", (msg: string) => {
      // 向后兼容：始终触发 onMessageReceived
      this.options.onMessageReceived?.(msg);
      // 结构化消息处理
      this.handleStructuredMessage(msg);
    });

    this.connection.on("UserJoined", (info: string) => this.options.onUserJoined?.(info));
    this.connection.on("UserLeft", (key: string) => this.options.onUserLeft?.(key));
    this.connection.on("OnlineCountChanged", (count: number) => this.options.onOnlineCountChanged?.(count));
    this.connection.on("OnMuted", (info: string) => this.options.onMuted?.(info));
    this.connection.on("OnUnmuted", (key: string) => this.options.onUnmuted?.(key));
    this.connection.on("RoomClosed", () => this.options.onRoomClosed?.());
    this.connection.on("Error", (msg: string) => this.options.onError?.(msg));

    // Task 11.5: 全局广播事件
    this.connection.on("ReceiveBroadcast", (msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        const imMsg = parseIMMessage(parsed);
        if (imMsg) {
          this.options.onBroadcastReceived?.(imMsg);
        }
      } catch { /* 静默处理解析错误 */ }
    });

    // Task 11.5: 批量消息事件
    this.connection.on("ReceiveBatchMessage", (batchJson: string) => {
      try {
        const parsed = JSON.parse(batchJson);
        const messages: IMMessage[] = [];
        const msgArray = Array.isArray(parsed) ? parsed : (parsed.messages || []);
        for (const item of msgArray) {
          const imMsg = parseIMMessage(item);
          if (imMsg) {
            // 对批量消息中的每条也做去重和间隙检测
            if (this.processSequenceNumber(imMsg)) {
              messages.push(imMsg);
              this.routeMessageByType(imMsg);
            }
          }
        }
        if (messages.length > 0) {
          this.options.onBatchMessageReceived?.(messages);
        }
      } catch { /* 静默处理解析错误 */ }
    });

    // Task 11.5: 状态恢复事件
    this.connection.on("StateRestored", (infoJson: string) => {
      try {
        const info: StateRestoredInfo = JSON.parse(infoJson);
        this.setConnectionState(ConnectionState.Connected);
        this.options.onStateRestored?.(info);
      } catch { /* 静默处理解析错误 */ }
    });
  }

  private registerConnectionEvents(): void {
    if (!this.connection) return;

    this.connection.onclose(() => {
      this.stopHeartbeat();
      if (!this.isManualDisconnect) {
        this.setConnectionState(ConnectionState.Disconnected);
        this.attemptReconnect();
      } else {
        this.setConnectionState(ConnectionState.Disconnected);
      }
    });

    this.connection.onreconnecting(() => {
      this.stopHeartbeat();
      this.setConnectionState(ConnectionState.Reconnecting);
    });

    this.connection.onreconnected(() => {
      this.reconnectAttemptCount = 0;
      this.setConnectionState(ConnectionState.Restoring);
      this.rejoinGroupsAfterReconnect();
      this.startHeartbeat();
    });
  }

  /**
   * Task 11.3: 处理消息序列号 - 去重和间隙检测
   * 返回 true 表示消息有效，false 表示应丢弃
   */
  private processSequenceNumber(msg: IMMessage): boolean {
    if (!msg.groupId || msg.sequenceNumber === undefined || msg.sequenceNumber === null) {
      return true; // 没有序列号信息的消息直接放行
    }

    const lastSeq = this.lastSequenceNumbers.get(msg.groupId) ?? 0;

    // 去重：seq <= lastSeq 丢弃
    if (msg.sequenceNumber <= lastSeq) {
      return false;
    }

    // 间隙检测：seq - lastSeq > 1 请求补发
    if (lastSeq > 0 && msg.sequenceNumber - lastSeq > 1) {
      this.requestBackfill(msg.groupId, lastSeq, msg.sequenceNumber);
    }

    // 更新最后序列号
    this.lastSequenceNumbers.set(msg.groupId, msg.sequenceNumber);
    return true;
  }

  /** Task 11.3: 请求服务端补发缺失消息 */
  private requestBackfill(groupId: string, afterSeq: number, beforeSeq: number): void {
    this.connection?.invoke("RequestBackfill", groupId, afterSeq)
      .catch(() => { /* 补发请求失败静默处理 */ });
  }

  /** 处理结构化消息 */
  private handleStructuredMessage(msgStr: string): void {
    try {
      const parsed = JSON.parse(msgStr);
      const imMsg = parseIMMessage(parsed);
      if (!imMsg) return;

      // Task 11.3: 去重和间隙检测
      if (!this.processSequenceNumber(imMsg)) return;

      // Task 11.4: 按类型路由
      this.routeMessageByType(imMsg);
    } catch { /* 非结构化消息静默忽略 */ }
  }

  /** Task 11.4: 按消息类型路由到对应回调 */
  private routeMessageByType(msg: IMMessage): void {
    if (isTextMessage(msg)) {
      this.options.onTextMessage?.(msg);
    } else if (isGiftMessage(msg)) {
      this.options.onGiftMessage?.(msg);
    } else if (isSystemNotice(msg)) {
      this.options.onSystemNotice?.(msg);
    } else if (isCustomMessage(msg)) {
      this.options.onCustomMessage?.(msg);
    }
  }

  /**
   * Task 11.7: 重连后重新加入群组，携带 lastSequenceNumber
   */
  private async rejoinGroupsAfterReconnect(): Promise<void> {
    const groups = Array.from(this.lastSequenceNumbers.entries());
    for (const [groupId, lastSeq] of groups) {
      try {
        await this.connection?.invoke("JoinGroup", groupId, lastSeq);
      } catch { /* 重新加入失败静默处理 */ }
    }
    // 如果没有 StateRestored 事件，恢复为 Connected
    if (groups.length === 0) {
      this.setConnectionState(ConnectionState.Connected);
    }
  }

  /**
   * Task 11.6 & 11.7: 手动重连逻辑
   */
  private attemptReconnect(): void {
    if (this.isManualDisconnect) return;

    const maxAttempts = this.options.maxReconnectAttempts ?? -1;

    // 检查是否超过最大重连次数
    if (maxAttempts > 0 && this.reconnectAttemptCount >= maxAttempts) {
      this.options.onReconnectFailed?.();
      return;
    }

    this.reconnectAttemptCount++;
    const delay = this.getReconnectDelay(this.reconnectAttemptCount);

    // 触发 onReconnectAttempt 事件
    this.options.onReconnectAttempt?.({
      attemptNumber: this.reconnectAttemptCount,
      delay,
    });

    this.setConnectionState(ConnectionState.Reconnecting);

    setTimeout(async () => {
      if (this.isManualDisconnect) return;

      try {
        const connection = this.buildConnection(this.hubUrl, this.appId, this.userId, this.userSig);
        this.connection = connection;
        this.registerCallbacks();
        this.registerConnectionEvents();
        await this.connection.start();
        this.reconnectAttemptCount = 0;
        this.setConnectionState(ConnectionState.Restoring);
        this.rejoinGroupsAfterReconnect();
        this.startHeartbeat();
      } catch {
        this.attemptReconnect();
      }
    }, delay);
  }

  /** 计算重连延迟（指数退避） */
  private getReconnectDelay(attempt: number): number {
    const delays = [0, 2000, 5000, 10000, 30000];
    return attempt <= delays.length ? delays[attempt - 1] : 30000;
  }

  /**
   * Task 11.7: 网络状态监听
   * 使用 navigator.onLine + online 事件检测网络恢复
   */
  private setupNetworkListener(): void {
    if (typeof window === 'undefined') return;

    this.onlineEventHandler = () => {
      if (this._connectionState === ConnectionState.Disconnected ||
          this._connectionState === ConnectionState.Reconnecting) {
        // 网络恢复，立即触发重连
        this.reconnectAttemptCount = 0;
        this.attemptReconnect();
      }
    };

    window.addEventListener('online', this.onlineEventHandler);
  }

  /** 移除网络状态监听 */
  private removeNetworkListener(): void {
    if (typeof window === 'undefined' || !this.onlineEventHandler) return;
    window.removeEventListener('online', this.onlineEventHandler);
    this.onlineEventHandler = null;
  }

  /**
   * Task 11.9: 启动心跳机制
   * 连接成功后每 30 秒发送心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    const interval = this.options.heartbeatIntervalMs ?? 30000;
    this.heartbeatTimer = setInterval(() => {
      if (this.connection && this._connectionState === ConnectionState.Connected) {
        this.connection.invoke("Heartbeat").catch(() => { /* 心跳失败静默处理 */ });
      }
    }, interval);
  }

  /** Task 11.9: 停止心跳 */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
