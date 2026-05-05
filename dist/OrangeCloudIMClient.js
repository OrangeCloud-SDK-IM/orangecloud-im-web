"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrangeCloudIMClient = exports.ConnectionState = void 0;
const signalr_1 = require("@microsoft/signalr");
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["Connecting"] = "connecting";
    ConnectionState["Connected"] = "connected";
    ConnectionState["Disconnected"] = "disconnected";
    ConnectionState["Reconnecting"] = "reconnecting";
})(ConnectionState || (exports.ConnectionState = ConnectionState = {}));
class OrangeCloudIMClient {
    constructor(options = {}) {
        this.connection = null;
        this._connectionState = ConnectionState.Disconnected;
        this.options = options;
    }
    get connectionState() { return this._connectionState; }
    async login(hubUrl, appId, userId, userSig) {
        const params = `appId=${encodeURIComponent(appId)}&userId=${encodeURIComponent(userId)}&userSig=${encodeURIComponent(userSig)}`;
        const url = hubUrl.includes("?") ? `${hubUrl}&${params}` : `${hubUrl}?${params}`;
        this.connection = new signalr_1.HubConnectionBuilder()
            .withUrl(url, { transport: signalr_1.HttpTransportType.WebSockets | signalr_1.HttpTransportType.LongPolling })
            .withAutomaticReconnect([0, 2000, 10000, 30000])
            .configureLogging(signalr_1.LogLevel.Warning)
            .build();
        this.registerCallbacks();
        this.registerConnectionEvents();
        this.setConnectionState(ConnectionState.Connecting);
        try {
            await this.connection.start();
            this.setConnectionState(ConnectionState.Connected);
        }
        catch (err) {
            this.setConnectionState(ConnectionState.Disconnected);
            throw err;
        }
    }
    async logout() {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
        this.setConnectionState(ConnectionState.Disconnected);
    }
    async joinGroup(groupId) { await this.connection?.invoke("JoinGroup", groupId); }
    async quitGroup(groupId) { await this.connection?.invoke("QuitGroup", groupId); }
    async sendGroupMsg(groupId, messageJson) { await this.connection?.invoke("SendGroupMsg", groupId, messageJson); }
    async getGroupMemberList(groupId) { await this.connection?.invoke("GetGroupMemberList", groupId); }
    dispose() {
        this.connection?.stop();
        this.connection = null;
        this.setConnectionState(ConnectionState.Disconnected);
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
        this.connection.on("ReceiveMessage", (msg) => this.options.onMessageReceived?.(msg));
        this.connection.on("UserJoined", (info) => this.options.onUserJoined?.(info));
        this.connection.on("UserLeft", (key) => this.options.onUserLeft?.(key));
        this.connection.on("OnlineCountChanged", (count) => this.options.onOnlineCountChanged?.(count));
        this.connection.on("OnMuted", (info) => this.options.onMuted?.(info));
        this.connection.on("OnUnmuted", (key) => this.options.onUnmuted?.(key));
        this.connection.on("RoomClosed", () => this.options.onRoomClosed?.());
        this.connection.on("Error", (msg) => this.options.onError?.(msg));
    }
    registerConnectionEvents() {
        if (!this.connection)
            return;
        this.connection.onclose(() => this.setConnectionState(ConnectionState.Disconnected));
        this.connection.onreconnecting(() => this.setConnectionState(ConnectionState.Reconnecting));
        this.connection.onreconnected(() => this.setConnectionState(ConnectionState.Connected));
    }
}
exports.OrangeCloudIMClient = OrangeCloudIMClient;
//# sourceMappingURL=OrangeCloudIMClient.js.map