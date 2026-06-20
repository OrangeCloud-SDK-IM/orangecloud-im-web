"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMMessageType = void 0;
/**
 * @deprecated 旧版（腾讯 IM 遗留）业务消息类型常量，仅为历史兼容保留。
 *
 * 新接入请勿使用本常量。当前 SDK 的结构化消息类型统一为：
 *   'text' | 'gift' | 'systemNotice' | 'custom'
 * 见 models/IMMessage.ts 的 IMMessageType（StructuredMessageType）。
 */
exports.IMMessageType = {
    publicMsg: "public_msg",
    sendGift: "SEND_GIFT",
    sendBigGift: "SEND_BIG_GIFT",
    sendBarrage: "SEND_BARRAGE",
    aNotice: "ANotice",
    stopLive: "stop_live",
};
