import { IMMessage, TextMessage, GiftMessage, SystemNotice, CustomMessage, StateRestoredInfo, ReconnectAttemptInfo } from "./models/IMMessage";
/**
 * 连接状态枚举（扩展，添加 restoring 状态）
 * Task 11.2
 */
export declare enum ConnectionState {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
    Reconnecting = "reconnecting",
    Restoring = "restoring"
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
    /** 群成员列表事件（getGroupMemberList 的响应） */
    onGroupMemberList?: (json: string) => void;
    /** Task 11.6: 重连事件 */
    onReconnectAttempt?: (info: ReconnectAttemptInfo) => void;
    onReconnectFailed?: () => void;
    /** Task 11.6: 最大重连次数，-1 表示无限重连 */
    maxReconnectAttempts?: number;
    /** Task 11.9: 心跳间隔（毫秒），默认 30000 */
    heartbeatIntervalMs?: number;
}
export declare class OrangeCloudIMClient {
    private connection;
    private _connectionState;
    private options;
    /** Task 11.3: 每个群组的最后序列号跟踪 */
    private lastSequenceNumbers;
    /** Task 11.7: 重连相关状态 */
    private reconnectAttemptCount;
    private isManualDisconnect;
    private hubUrl;
    private appId;
    private userId;
    private userSig;
    private onlineEventHandler;
    /** Task 11.9: 心跳定时器 */
    private heartbeatTimer;
    constructor(options?: OrangeCloudIMClientOptions);
    get connectionState(): ConnectionState;
    login(hubUrl: string, appId: string, userId: string, userSig: string): Promise<void>;
    logout(): Promise<void>;
    joinGroup(groupId: string, lastSequenceNumber?: number): Promise<void>;
    quitGroup(groupId: string): Promise<void>;
    sendGroupMsg(groupId: string, messageJson: string): Promise<void>;
    getGroupMemberList(groupId: string): Promise<void>;
    /** Task 11.8: 类型安全的发送方法 - 发送文本消息 */
    sendTextMessage(groupId: string, content: string): Promise<void>;
    /** Task 11.8: 类型安全的发送方法 - 发送礼物消息 */
    sendGiftMessage(groupId: string, giftInfo: {
        giftId: string;
        giftName: string;
        giftCount: number;
        giftPrice: number;
        animationUrl: string;
    }): Promise<void>;
    /** Task 11.8: 类型安全的发送方法 - 发送自定义消息 */
    sendCustomMessage(groupId: string, customType: string, payload: Record<string, any>): Promise<void>;
    /** Task 11.8: 获取指定群组的最后序列号 */
    getLastSequenceNumber(groupId: string): number;
    dispose(): void;
    private buildConnection;
    private setConnectionState;
    private registerCallbacks;
    private registerConnectionEvents;
    /**
     * Task 11.3: 处理消息序列号 - 去重和间隙检测
     * 返回 true 表示消息有效，false 表示应丢弃
     */
    private processSequenceNumber;
    /** Task 11.3: 请求服务端补发缺失消息 */
    private requestBackfill;
    /** 处理结构化消息 */
    private handleStructuredMessage;
    /** Task 11.4: 按消息类型路由到对应回调 */
    private routeMessageByType;
    /**
     * Task 11.7: 重连后重新加入群组，携带 lastSequenceNumber
     */
    private rejoinGroupsAfterReconnect;
    /**
     * Task 11.6 & 11.7: 手动重连逻辑
     */
    private attemptReconnect;
    /** 计算重连延迟（指数退避，与 withAutomaticReconnect 保持一致） */
    private getReconnectDelay;
    /**
     * Task 11.7: 网络状态监听
     * 使用 navigator.onLine + online 事件检测网络恢复
     */
    private setupNetworkListener;
    /** 移除网络状态监听 */
    private removeNetworkListener;
    /**
     * Task 11.9: 启动心跳机制
     * 连接成功后每 30 秒发送心跳
     */
    private startHeartbeat;
    /** Task 11.9: 停止心跳 */
    private stopHeartbeat;
}
