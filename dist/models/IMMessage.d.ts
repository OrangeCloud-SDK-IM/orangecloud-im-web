/**
 * 结构化消息类型定义
 * IM SDK 可靠性增强 - Web 客户端
 */
/** 消息类型枚举 */
export type IMMessageType = 'text' | 'gift' | 'systemNotice' | 'custom';
/** 发送者信息 */
export interface SenderInfo {
    userId: string;
    nickName: string;
    faceUrl: string;
    level: string;
    isAdmin: boolean;
    isAnchor: boolean;
}
/** 消息基础接口 */
export interface IMMessage {
    messageType: IMMessageType;
    sequenceNumber: number;
    serverTimestamp: number;
    senderInfo: SenderInfo;
    groupId: string;
    data: any;
}
/**
 * 文本消息
 *
 * 业务字段同时提供扁平访问器（与 iOS / Android / Flutter 一致）和原始 data。
 * 推荐使用扁平字段：`msg.content`。
 */
export interface TextMessage extends IMMessage {
    messageType: 'text';
    /** 便捷访问：等价于 data.content（四端一致的推荐写法） */
    content: string;
    data: {
        content: string;
    };
}
/** 礼物消息（推荐使用扁平字段：msg.giftId / msg.giftName / ...） */
export interface GiftMessage extends IMMessage {
    messageType: 'gift';
    giftId: string;
    giftName: string;
    giftCount: number;
    giftPrice: number;
    animationUrl: string;
    data: {
        giftId: string;
        giftName: string;
        giftCount: number;
        giftPrice: number;
        animationUrl: string;
    };
}
/** 系统通知（推荐使用扁平字段：msg.noticeType / msg.title / msg.content） */
export interface SystemNotice extends IMMessage {
    messageType: 'systemNotice';
    noticeType: string;
    title: string;
    content: string;
    data: {
        noticeType: string;
        title: string;
        content: string;
    };
}
/** 自定义消息（推荐使用扁平字段：msg.customType / msg.payload） */
export interface CustomMessage extends IMMessage {
    messageType: 'custom';
    customType: string;
    payload: Record<string, any>;
    data: {
        customType: string;
        payload: Record<string, any>;
    };
}
/** 状态恢复信息 */
export interface StateRestoredInfo {
    groupIds: string[];
    backfilledCount: number;
}
/** 重连尝试信息 */
export interface ReconnectAttemptInfo {
    attemptNumber: number;
    delay: number;
}
/** 从 JSON 对象解析消息类型
 *
 * 解析时把 data 下的业务字段摊平到顶层，使四端访问方式一致：
 * 既可 `msg.content`（推荐），也可 `msg.data.content`（兼容）。
 */
export declare function parseIMMessage(json: any): IMMessage | null;
/** 判断是否为文本消息 */
export declare function isTextMessage(msg: IMMessage): msg is TextMessage;
/** 判断是否为礼物消息 */
export declare function isGiftMessage(msg: IMMessage): msg is GiftMessage;
/** 判断是否为系统通知 */
export declare function isSystemNotice(msg: IMMessage): msg is SystemNotice;
/** 判断是否为自定义消息 */
export declare function isCustomMessage(msg: IMMessage): msg is CustomMessage;
