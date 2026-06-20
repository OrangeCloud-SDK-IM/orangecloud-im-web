/**
 * @deprecated 旧版（腾讯 IM 遗留）业务消息类型常量，仅为历史兼容保留。
 *
 * 新接入请勿使用本常量。当前 SDK 的结构化消息类型统一为：
 *   'text' | 'gift' | 'systemNotice' | 'custom'
 * 见 models/IMMessage.ts 的 IMMessageType（StructuredMessageType）。
 */
export declare const IMMessageType: {
    readonly publicMsg: "public_msg";
    readonly sendGift: "SEND_GIFT";
    readonly sendBigGift: "SEND_BIG_GIFT";
    readonly sendBarrage: "SEND_BARRAGE";
    readonly aNotice: "ANotice";
    readonly stopLive: "stop_live";
};
export type IMMessageTypeValue = (typeof IMMessageType)[keyof typeof IMMessageType];
