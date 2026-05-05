export declare enum ConnectionState {
    Connecting = "connecting",
    Connected = "connected",
    Disconnected = "disconnected",
    Reconnecting = "reconnecting"
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
export declare class OrangeCloudIMClient {
    private connection;
    private _connectionState;
    private options;
    constructor(options?: OrangeCloudIMClientOptions);
    get connectionState(): ConnectionState;
    login(hubUrl: string, appId: string, userId: string, userSig: string): Promise<void>;
    logout(): Promise<void>;
    joinGroup(groupId: string): Promise<void>;
    quitGroup(groupId: string): Promise<void>;
    sendGroupMsg(groupId: string, messageJson: string): Promise<void>;
    getGroupMemberList(groupId: string): Promise<void>;
    dispose(): void;
    private setConnectionState;
    private registerCallbacks;
    private registerConnectionEvents;
}
//# sourceMappingURL=OrangeCloudIMClient.d.ts.map