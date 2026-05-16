"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrangeCloudIMClient = exports.ConnectionState = void 0;
const signalr_1 = require("@microsoft/signalr");
const IMMessage_1 = require("./models/IMMessage");
/**
 * 连接状态枚举（扩展，添加 restoring 状态）
 * Task 11.2
 */
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["Disconnected"] = "disconnected";
    ConnectionState["Connecting"] = "connecting";
    ConnectionState["Connected"] = "connected";
    ConnectionState["Reconnecting"] = "reconnecting";
    ConnectionState["Restoring"] = "restoring";
})(ConnectionState || (exports.ConnectionState = ConnectionState = {}));
class OrangeCloudIMClient {
    constructor(options = {}) {
        this.connection = null;
        this._connectionState = ConnectionState.Disconnected;
        /** Task 11.3: 每个群组的最后序列号跟踪 */
        this.lastSequenceNumbers = new Map();
        /** Task 11.7: 重连相关状态 */
        this.reconnectAttemptCount = 0;
        this.isManualDisconnect = false;
        this.hubUrl = "";
        this.appId = "";
        this.userId = "";
        this.userSig = "";
        this.onlineEventHandler = null;
        /** Task 11.9: 心跳定时器 */
        this.heartbeatTimer = null;
        this.options = options;
    }
    get connectionState() { return this._connectionState; }
    async login(hubUrl, appId, userId, userSig) {
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
        }
        catch (err) {
            this.setConnectionState(ConnectionState.Disconnected);
            throw err;
        }
    }
    async logout() {
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
    async joinGroup(groupId, lastSequenceNumber) {
        if (lastSequenceNumber !== undefined) {
            await this.connection?.invoke("JoinGroup", groupId, lastSequenceNumber);
        }
        else {
            const lastSeq = this.lastSequenceNumbers.get(groupId);
            if (lastSeq !== undefined && lastSeq > 0) {
                await this.connection?.invoke("JoinGroup", groupId, lastSeq);
            }
            else {
                await this.connection?.invoke("JoinGroup", groupId, 0);
            }
        }
    }
    async quitGroup(groupId) {
        await this.connection?.invoke("QuitGroup", groupId);
        this.lastSequenceNumbers.delete(groupId);
    }
    async sendGroupMsg(groupId, messageJson) {
        await this.connection?.invoke("SendGroupMsg", groupId, messageJson);
    }
    async getGroupMemberList(groupId) {
        await this.connection?.invoke("GetGroupMemberList", groupId);
    }
    /** Task 11.8: 类型安全的发送方法 - 发送文本消息 */
    async sendTextMessage(groupId, content) {
        const msg = JSON.stringify({
            messageType: 'text',
            data: { content },
        });
        await this.sendGroupMsg(groupId, msg);
    }
    /** Task 11.8: 类型安全的发送方法 - 发送礼物消息 */
    async sendGiftMessage(groupId, giftInfo) {
        const msg = JSON.stringify({
            messageType: 'gift',
            data: giftInfo,
        });
        await this.sendGroupMsg(groupId, msg);
    }
    /** Task 11.8: 类型安全的发送方法 - 发送自定义消息 */
    async sendCustomMessage(groupId, customType, payload) {
        const msg = JSON.stringify({
            messageType: 'custom',
            data: { customType, payload },
        });
        await this.sendGroupMsg(groupId, msg);
    }
    /** Task 11.8: 获取指定群组的最后序列号 */
    getLastSequenceNumber(groupId) {
        return this.lastSequenceNumbers.get(groupId) ?? 0;
    }
    dispose() {
        this.isManualDisconnect = true;
        this.stopHeartbeat();
        this.removeNetworkListener();
        this.connection?.stop();
        this.connection = null;
        this.lastSequenceNumbers.clear();
        this.setConnectionState(ConnectionState.Disconnected);
    }
    // ─── Private Methods ───────────────────────────────────────────────
    buildConnection(hubUrl, appId, userId, userSig) {
        const params = `appId=${encodeURIComponent(appId)}&userId=${encodeURIComponent(userId)}&userSig=${encodeURIComponent(userSig)}`;
        const url = hubUrl.includes("?") ? `${hubUrl}&${params}` : `${hubUrl}?${params}`;
        return new signalr_1.HubConnectionBuilder()
            .withUrl(url, { transport: signalr_1.HttpTransportType.WebSockets | signalr_1.HttpTransportType.LongPolling })
            .withAutomaticReconnect([0, 2000, 10000, 30000])
            .configureLogging(signalr_1.LogLevel.Warning)
            .build();
    }
    setConnectionState(state) {
        if (this._connectionState !== state) {
            this._connectionState = state;
            this.options.onConnectionStateChanged?.(state);
        }
    }
    registerCallbacks() {
        if (!this.connection)
            return;
        // 原有回调 - 保持向后兼容
        this.connection.on("ReceiveMessage", (msg) => {
            // 向后兼容：始终触发 onMessageReceived
            this.options.onMessageReceived?.(msg);
            // 结构化消息处理
            this.handleStructuredMessage(msg);
        });
        this.connection.on("UserJoined", (info) => this.options.onUserJoined?.(info));
        this.connection.on("UserLeft", (key) => this.options.onUserLeft?.(key));
        this.connection.on("OnlineCountChanged", (count) => this.options.onOnlineCountChanged?.(count));
        this.connection.on("OnMuted", (info) => this.options.onMuted?.(info));
        this.connection.on("OnUnmuted", (key) => this.options.onUnmuted?.(key));
        this.connection.on("RoomClosed", () => this.options.onRoomClosed?.());
        this.connection.on("Error", (msg) => this.options.onError?.(msg));
        // Task 11.5: 全局广播事件
        this.connection.on("ReceiveBroadcast", (msg) => {
            try {
                const parsed = JSON.parse(msg);
                const imMsg = (0, IMMessage_1.parseIMMessage)(parsed);
                if (imMsg) {
                    this.options.onBroadcastReceived?.(imMsg);
                }
            }
            catch { /* 静默处理解析错误 */ }
        });
        // Task 11.5: 批量消息事件
        this.connection.on("ReceiveBatchMessage", (batchJson) => {
            try {
                const parsed = JSON.parse(batchJson);
                const messages = [];
                const msgArray = Array.isArray(parsed) ? parsed : (parsed.messages || []);
                for (const item of msgArray) {
                    const imMsg = (0, IMMessage_1.parseIMMessage)(item);
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
            }
            catch { /* 静默处理解析错误 */ }
        });
        // Task 11.5: 状态恢复事件
        this.connection.on("StateRestored", (infoJson) => {
            try {
                const info = JSON.parse(infoJson);
                this.setConnectionState(ConnectionState.Connected);
                this.options.onStateRestored?.(info);
            }
            catch { /* 静默处理解析错误 */ }
        });
    }
    registerConnectionEvents() {
        if (!this.connection)
            return;
        this.connection.onclose(() => {
            this.stopHeartbeat();
            if (!this.isManualDisconnect) {
                this.setConnectionState(ConnectionState.Disconnected);
                this.attemptReconnect();
            }
            else {
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
    processSequenceNumber(msg) {
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
    requestBackfill(groupId, afterSeq, beforeSeq) {
        this.connection?.invoke("RequestBackfill", groupId, afterSeq)
            .catch(() => { });
    }
    /** 处理结构化消息 */
    handleStructuredMessage(msgStr) {
        try {
            const parsed = JSON.parse(msgStr);
            const imMsg = (0, IMMessage_1.parseIMMessage)(parsed);
            if (!imMsg)
                return;
            // Task 11.3: 去重和间隙检测
            if (!this.processSequenceNumber(imMsg))
                return;
            // Task 11.4: 按类型路由
            this.routeMessageByType(imMsg);
        }
        catch { /* 非结构化消息静默忽略 */ }
    }
    /** Task 11.4: 按消息类型路由到对应回调 */
    routeMessageByType(msg) {
        if ((0, IMMessage_1.isTextMessage)(msg)) {
            this.options.onTextMessage?.(msg);
        }
        else if ((0, IMMessage_1.isGiftMessage)(msg)) {
            this.options.onGiftMessage?.(msg);
        }
        else if ((0, IMMessage_1.isSystemNotice)(msg)) {
            this.options.onSystemNotice?.(msg);
        }
        else if ((0, IMMessage_1.isCustomMessage)(msg)) {
            this.options.onCustomMessage?.(msg);
        }
    }
    /**
     * Task 11.7: 重连后重新加入群组，携带 lastSequenceNumber
     */
    async rejoinGroupsAfterReconnect() {
        const groups = Array.from(this.lastSequenceNumbers.entries());
        for (const [groupId, lastSeq] of groups) {
            try {
                await this.connection?.invoke("JoinGroup", groupId, lastSeq);
            }
            catch { /* 重新加入失败静默处理 */ }
        }
        // 如果没有 StateRestored 事件，恢复为 Connected
        if (groups.length === 0) {
            this.setConnectionState(ConnectionState.Connected);
        }
    }
    /**
     * Task 11.6 & 11.7: 手动重连逻辑
     */
    attemptReconnect() {
        if (this.isManualDisconnect)
            return;
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
            if (this.isManualDisconnect)
                return;
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
            }
            catch {
                this.attemptReconnect();
            }
        }, delay);
    }
    /** 计算重连延迟（指数退避） */
    getReconnectDelay(attempt) {
        const delays = [0, 2000, 5000, 10000, 30000];
        return attempt <= delays.length ? delays[attempt - 1] : 30000;
    }
    /**
     * Task 11.7: 网络状态监听
     * 使用 navigator.onLine + online 事件检测网络恢复
     */
    setupNetworkListener() {
        if (typeof window === 'undefined')
            return;
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
    removeNetworkListener() {
        if (typeof window === 'undefined' || !this.onlineEventHandler)
            return;
        window.removeEventListener('online', this.onlineEventHandler);
        this.onlineEventHandler = null;
    }
    /**
     * Task 11.9: 启动心跳机制
     * 连接成功后每 30 秒发送心跳
     */
    startHeartbeat() {
        this.stopHeartbeat();
        const interval = this.options.heartbeatIntervalMs ?? 30000;
        this.heartbeatTimer = setInterval(() => {
            if (this.connection && this._connectionState === ConnectionState.Connected) {
                this.connection.invoke("Heartbeat").catch(() => { });
            }
        }, interval);
    }
    /** Task 11.9: 停止心跳 */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
}
exports.OrangeCloudIMClient = OrangeCloudIMClient;
//# sourceMappingURL=OrangeCloudIMClient.js.map