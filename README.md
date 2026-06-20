# OrangeCloud IM SDK - Web

[![Platform](https://img.shields.io/badge/platform-Web-F7DF1E?logo=javascript)](https://developer.mozilla.org)
[![Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/OrangeCloud-SDK/orangecloud-im-web/releases)

OrangeCloud IM Web SDK，基于 SignalR（WebSocket），支持文本/礼物/系统通知/自定义消息、断线重连、消息补发。

> 本仓库发布的是**编译产物**（`dist/` 下的 JS + 类型声明）。SDK 按月付费授权使用，鉴权由服务端签发的 UserSig 控制。

## 安装

```bash
npm install @orangecloud/im-client
```

## 快速开始

```typescript
import { OrangeCloudIMClient, ConnectionState } from '@orangecloud/im-client';

const client = new OrangeCloudIMClient({
  onTextMessage: (msg) => console.log(msg.senderInfo.nickName, msg.content),
  onGiftMessage: (msg) => console.log('礼物', msg.giftName),
  onSystemNotice: (msg) => console.log('通知', msg.title),
  onConnectionStateChanged: (s) => console.log('状态', s),
  maxReconnectAttempts: -1,
});

// 登录（userSig 由接入方业务服务端签发，切勿在前端硬编码 SecretKey）
await client.login('wss://api.xxx.com/livehub', 'APPID', 'user_1', 'USERSIG');

await client.joinGroup('room_001');
await client.sendTextMessage('room_001', '大家好');
await client.sendGiftMessage('room_001', {
  giftId: '1', giftName: '火箭', giftCount: 1, giftPrice: 100, animationUrl: '',
});

await client.quitGroup('room_001');
await client.logout();
```

## 字段访问（与 iOS / Android / Flutter 一致）

| 消息 | 访问方式 |
|---|---|
| 文本 | `msg.content` |
| 礼物 | `msg.giftId` / `msg.giftName` / `msg.giftCount` / `msg.giftPrice` / `msg.animationUrl` |
| 系统通知 | `msg.noticeType` / `msg.title` / `msg.content` |
| 自定义 | `msg.customType` / `msg.payload` |

## 集成文档

四端通用契约与详细接入说明见 OrangeCloud IM SDK 集成文档。

## License

UNLICENSED — 商业授权，按月付费。
