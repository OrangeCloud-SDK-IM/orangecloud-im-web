export const IMMessageType = {
  publicMsg: "public_msg",
  sendGift: "SEND_GIFT",
  sendBigGift: "SEND_BIG_GIFT",
  sendBarrage: "SEND_BARRAGE",
  aNotice: "ANotice",
  stopLive: "stop_live",
} as const;

export type IMMessageTypeValue = (typeof IMMessageType)[keyof typeof IMMessageType];
