"use strict";
/**
 * 结构化消息类型定义
 * IM SDK 可靠性增强 - Web 客户端
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIMMessage = parseIMMessage;
exports.isTextMessage = isTextMessage;
exports.isGiftMessage = isGiftMessage;
exports.isSystemNotice = isSystemNotice;
exports.isCustomMessage = isCustomMessage;
/** 从 JSON 对象解析消息类型 */
function parseIMMessage(json) {
    if (!json || !json.messageType)
        return null;
    return json;
}
/** 判断是否为文本消息 */
function isTextMessage(msg) {
    return msg.messageType === 'text';
}
/** 判断是否为礼物消息 */
function isGiftMessage(msg) {
    return msg.messageType === 'gift';
}
/** 判断是否为系统通知 */
function isSystemNotice(msg) {
    return msg.messageType === 'systemNotice';
}
/** 判断是否为自定义消息 */
function isCustomMessage(msg) {
    return msg.messageType === 'custom';
}
//# sourceMappingURL=IMMessage.js.map