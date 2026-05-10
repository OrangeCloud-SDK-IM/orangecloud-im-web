export { OrangeCloudIMClient, ConnectionState, OrangeCloudIMClientOptions } from "./OrangeCloudIMClient";
export { IMMessageType, IMMessageTypeValue } from "./IMMessageType";
export type {
  IMMessage,
  TextMessage,
  GiftMessage,
  SystemNotice,
  CustomMessage,
  SenderInfo,
  StateRestoredInfo,
  ReconnectAttemptInfo,
} from "./models/IMMessage";
export type { IMMessageType as StructuredMessageType } from "./models/IMMessage";
export {
  parseIMMessage,
  isTextMessage,
  isGiftMessage,
  isSystemNotice,
  isCustomMessage,
} from "./models/IMMessage";
