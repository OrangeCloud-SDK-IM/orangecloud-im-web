# OrangeCloud IM SDK - Web

[![Platform](https://img.shields.io/badge/platform-Web-F7DF1E?logo=javascript)](https://developer.mozilla.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)](https://typescriptlang.org)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/OrangeCloud-SDK/orangecloud-im-web/releases)

OrangeCloud IM Web SDK，TypeScript 编写，支持 CommonJS 和 ES Module。

## 安装

```bash
# 下载后本地引用
npm install ./orangecloud-im-client
```

或直接复制 `dist/` 目录到项目中引用。

## 快速开始

```typescript
import { OrangeCloudIMClient, IMMessageType } from '@orangecloud/im-client';

const client = new OrangeCloudIMClient({
  onMessageReceived: (json) => console.log('收到:', json),
  onConnectionStateChanged: (state) => console.log('状态:', state),
  onUserJoined: (info) => console.log('加入:', info),
  onOnlineCountChanged: (count) => console.log('在线:', count),
});

// 登录
await client.login(hubUrl, appId, userId, userSig);

// 加入房间
await client.joinGroup('room_001');

// 发送消息
await client.sendGroupMsg('room_001', JSON.stringify({
  Type: IMMessageType.publicMsg,
  data: { content: { word: 'Hello!' }, user_info: { uid: userId, nick: 'User' } }
}));
```

## Demo

完整 Web 示例请参考 [orangecloud-im-demos/web](https://github.com/OrangeCloud-SDK/orangecloud-im-demos/tree/main/web)

## License

MIT
