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

/** 文本消息 */
export interface TextMessage extends IMMessage {
  messageType: 'text';
  data: {
    content: string;
  };
}

/** 礼物消息 */
export interface GiftMessage extends IMMessage {
  messageType: 'gift';
  data: {
    giftId: string;
    giftName: string;
    giftCount: number;
    giftPrice: number;
    animationUrl: string;
  };
}

/** 系统通知 */
export interface SystemNotice extends IMMessage {
  messageType: 'systemNotice';
  data: {
    noticeType: string;
    title: string;
    content: string;
  };
}

/** 自定义消息 */
export interface CustomMessage extends IMMessage {
  messageType: 'custom';
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

/** 从 JSON 对象解析消息类型 */
export function parseIMMessage(json: any): IMMessage | null {
  if (!json || !json.messageType) return null;
  return json as IMMessage;
}

/** 判断是否为文本消息 */
export function isTextMessage(msg: IMMessage): msg is TextMessage {
  return msg.messageType === 'text';
}

/** 判断是否为礼物消息 */
export function isGiftMessage(msg: IMMessage): msg is GiftMessage {
  return msg.messageType === 'gift';
}

/** 判断是否为系统通知 */
export function isSystemNotice(msg: IMMessage): msg is SystemNotice {
  return msg.messageType === 'systemNotice';
}

/** 判断是否为自定义消息 */
export function isCustomMessage(msg: IMMessage): msg is CustomMessage {
  return msg.messageType === 'custom';
}
