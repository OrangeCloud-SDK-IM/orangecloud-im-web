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
/** 从 JSON 对象解析消息类型
 *
 * 解析时把 data 下的业务字段摊平到顶层，使四端访问方式一致：
 * 既可 `msg.content`（推荐），也可 `msg.data.content`（兼容）。
 */
function parseIMMessage(json) {
    if (!json || !json.messageType)
        return null;
    const msg = json;
    // 把 data 下的业务字段摊平到顶层（不覆盖已有的元数据字段）
    if (msg.data && typeof msg.data === 'object') {
        for (const key of Object.keys(msg.data)) {
            if (!(key in msg)) {
                msg[key] = msg.data[key];
            }
        }
    }
    return msg;
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
