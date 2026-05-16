"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomMessage = exports.isSystemNotice = exports.isGiftMessage = exports.isTextMessage = exports.parseIMMessage = exports.IMMessageType = exports.ConnectionState = exports.OrangeCloudIMClient = void 0;
var OrangeCloudIMClient_1 = require("./OrangeCloudIMClient");
Object.defineProperty(exports, "OrangeCloudIMClient", { enumerable: true, get: function () { return OrangeCloudIMClient_1.OrangeCloudIMClient; } });
Object.defineProperty(exports, "ConnectionState", { enumerable: true, get: function () { return OrangeCloudIMClient_1.ConnectionState; } });
var IMMessageType_1 = require("./IMMessageType");
Object.defineProperty(exports, "IMMessageType", { enumerable: true, get: function () { return IMMessageType_1.IMMessageType; } });
var IMMessage_1 = require("./models/IMMessage");
Object.defineProperty(exports, "parseIMMessage", { enumerable: true, get: function () { return IMMessage_1.parseIMMessage; } });
Object.defineProperty(exports, "isTextMessage", { enumerable: true, get: function () { return IMMessage_1.isTextMessage; } });
Object.defineProperty(exports, "isGiftMessage", { enumerable: true, get: function () { return IMMessage_1.isGiftMessage; } });
Object.defineProperty(exports, "isSystemNotice", { enumerable: true, get: function () { return IMMessage_1.isSystemNotice; } });
Object.defineProperty(exports, "isCustomMessage", { enumerable: true, get: function () { return IMMessage_1.isCustomMessage; } });
//# sourceMappingURL=index.js.map