# TradingView Advanced Chart Integration

本文件說明 TradingView Advanced Chart 在專案中的整合方式、架構設計、以及如何維護 CDN 上的 charting library。

## 概述

我們使用 TradingView 的 Advanced Charts（charting_library）來顯示 K 線圖。這是一個需要授權的商業產品，必須自行託管 library 檔案。

### 為什麼需要 CDN？

TradingView charting_library 無法直接打包到 React Native app 中，原因如下：

1. **WebView 獨立環境** - React Native 的 WebView 無法直接存取 app 的檔案系統
2. **動態載入** - charting_library 使用 code splitting，執行時動態 import 多個 chunk 檔案
3. **檔案大小** - 整個 library 約 24MB，無法 inline 到 HTML 中

因此我們將 library 檔案託管在 S3 + CloudFront CDN 上。

## 架構

```
┌─────────────────────────────────────────────────────────────────┐
│  React Native App                                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ChartUI (app-internal/components/trade/ChartUi.tsx)    │   │
│  │    └── TradingViewChart (WebView wrapper)               │   │
│  │          │                                              │   │
│  │          │  postMessage                                 │   │
│  │          ▼                                              │   │
│  │    ┌─────────────────────────────────────────────┐     │   │
│  │    │  WebView                                    │     │   │
│  │    │    └── HTML + TradingView Widget            │     │   │
│  │    │          │                                  │     │   │
│  │    │          │ <script src="CDN/...">           │     │   │
│  │    │          ▼                                  │     │   │
│  │    │    ┌─────────────────────────────────┐     │     │   │
│  │    │    │  Custom Datafeed                │     │     │   │
│  │    │    │    • getBars → RN → HL API      │     │     │   │
│  │    │    │    • subscribeBars → polling    │     │     │   │
│  │    │    └─────────────────────────────────┘     │     │   │
│  │    └─────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CloudFront CDN                                                 │
│  https://d1n6xgrj1qiiow.cloudfront.net/                         │
│                              │                                  │
│                              │ Origin Request                   │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  S3 Bucket: riverrun.perp.com                           │   │
│  │    └── /charting_library/                               │   │
│  │          ├── charting_library.standalone.js             │   │
│  │          ├── bundles/*.js                               │   │
│  │          └── ...                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 檔案結構

### App 端程式碼

```
app-internal/components/trade/chart/
├── index.ts                 # Module exports
├── chartHtml.ts             # HTML template with TradingView widget
├── TradingViewChart.tsx     # WebView wrapper component
└── resolutionMapping.ts     # TradingView ↔ Hyperliquid resolution mapping
```

### CDN 檔案

```
s3://riverrun.perp.com/charting_library/
├── charting_library.standalone.js    # 主要 entry point
├── charting_library.js               # UMD build
├── charting_library.esm.js           # ESM build
├── charting_library.cjs.js           # CommonJS build
├── charting_library.d.ts             # TypeScript definitions
├── datafeed-api.d.ts                 # Datafeed API types
├── package.json
├── sameorigin.html
└── bundles/                          # Code-split chunks (~1000 files)
    ├── *.js
    └── *.css
```

## AWS 資源

| 資源                       | 值                                       |
| -------------------------- | ---------------------------------------- |
| S3 Bucket                  | `riverrun.perp.com`                      |
| S3 Path                    | `/charting_library/`                     |
| CloudFront Distribution ID | `E3DC0WYHQ8DFGF`                         |
| CloudFront Domain          | `https://d1n6xgrj1qiiow.cloudfront.net/` |
| Origin Access Control ID   | `E3IP19THUFCHI8`                         |
| AWS Region                 | `ap-southeast-1`                         |

## 更新 Charting Library

當需要更新 TradingView charting library 版本時，請按照以下步驟操作：

### 1. 取得最新的 charting_library

```bash
# Clone 或更新 charting_library repository
# Repository: https://github.com/perpetual-protocol/charting_library

# 如果尚未 clone
git clone https://github.com/perpetual-protocol/charting_library.git
cd charting_library

# 如果已經 clone，更新到最新版本
cd charting_library
git pull origin main
# 或切換到特定 tag
git checkout v31.0.0
```

### 2. 上傳到 S3

```bash
# 同步檔案到 S3（只上傳變更的檔案）
# 注意：上傳的是 charting_library/charting_library/ 目錄（內層目錄）
aws s3 sync ./charting_library \
  s3://riverrun.perp.com/charting_library/ \
  --cache-control "public, max-age=31536000"
```

### 3. 清除 CloudFront 快取

由於我們設定了 1 年的快取時間，更新後需要手動清除快取：

```bash
# 清除整個 charting_library 目錄的快取
aws cloudfront create-invalidation \
  --distribution-id E3DC0WYHQ8DFGF \
  --paths "/charting_library/*"
```

查看 invalidation 狀態：

```bash
# 列出最近的 invalidations
aws cloudfront list-invalidations --distribution-id E3DC0WYHQ8DFGF

# 查看特定 invalidation 狀態
aws cloudfront get-invalidation \
  --distribution-id E3DC0WYHQ8DFGF \
  --id <INVALIDATION_ID>
```

### 4. 驗證更新

```bash
# 確認檔案已更新（檢查 Last-Modified header）
curl -I "https://d1n6xgrj1qiiow.cloudfront.net/charting_library/charting_library.standalone.js"

# 確認 cache 已清除（x-cache 應該顯示 Miss from cloudfront）
curl -I "https://d1n6xgrj1qiiow.cloudfront.net/charting_library/charting_library.standalone.js" | grep x-cache
```

## 環境變數

| 變數                               | 說明                         | 預設值                                   |
| ---------------------------------- | ---------------------------- | ---------------------------------------- |
| `EXPO_PUBLIC_CHARTING_LIBRARY_URL` | Charting library 的 base URL | `https://d1n6xgrj1qiiow.cloudfront.net/` |

### 使用本地開發 Server（可選）

如果需要在本地測試修改過的 charting library：

```bash
# 1. 啟動本地 server
./scripts/serve-charting-library.sh

# 2. 在 .env.local 中覆蓋 CDN URL
EXPO_PUBLIC_CHARTING_LIBRARY_URL=http://localhost:9090/

# 3. 重新啟動 app
npx expo start --clear
```

## 安全性設定

### S3 Bucket Policy

CloudFront 只能存取 `/charting_library/*` 路徑下的檔案：

```json
{
  "Sid": "AllowCloudFrontServicePrincipal",
  "Effect": "Allow",
  "Principal": {
    "Service": "cloudfront.amazonaws.com"
  },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::riverrun.perp.com/charting_library/*",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::676069118885:distribution/E3DC0WYHQ8DFGF"
    }
  }
}
```

### CORS 設定

S3 bucket 已設定 CORS，允許 WebView 載入資源：

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["*"],
      "MaxAgeSeconds": 86400
    }
  ]
}
```

## 資料流

### 歷史 K 線資料 (getBars)

```
TradingView Widget
    │
    │ datafeed.getBars(symbol, resolution, from, to)
    ▼
chartHtml.ts (WebView JS)
    │
    │ postMessage({ type: 'request', requestType: 'getBars', ... })
    ▼
TradingViewChart.tsx (React Native)
    │
    │ infoClient.candleSnapshot({ coin, interval, startTime, endTime })
    ▼
Hyperliquid API
    │
    │ Response: [{ t, o, h, l, c, v }, ...]
    ▼
TradingViewChart.tsx
    │
    │ sendToWebView({ type: 'response', data: { bars } })
    ▼
chartHtml.ts
    │
    │ onResult(bars)
    ▼
TradingView Widget (renders chart)
```

### 即時更新 (subscribeBars)

目前使用 polling 實作（每 5 秒）：

```
TradingView Widget
    │
    │ datafeed.subscribeBars(symbolInfo, resolution, onTick, listenerGuid)
    ▼
chartHtml.ts
    │
    │ postMessage({ type: 'subscribeBars', listenerGuid, coin, interval })
    ▼
TradingViewChart.tsx
    │
    │ setInterval(() => infoClient.candleSnapshot(...), 5000)
    │
    │ sendToWebView({ type: 'candleUpdate', data: latestCandle })
    ▼
chartHtml.ts
    │
    │ subscriber.onTick(bar)
    ▼
TradingView Widget (updates chart)
```

## 已知限制

1. **即時更新使用 Polling** - 目前每 5 秒輪詢一次，應改用 WebSocket
2. **Price Scale 硬編碼** - 應從 market metadata 動態取得
3. **Symbol Search 未實作** - TradingView 的搜尋功能回傳空結果
4. **無 Position/Order 標記** - 未在圖表上顯示持倉和訂單位置

## 故障排除

### Chart 無法載入

1. 檢查網路連線
2. 確認 CloudFront URL 可存取：
   ```bash
   curl -I "https://d1n6xgrj1qiiow.cloudfront.net/charting_library/charting_library.standalone.js"
   ```
3. 檢查 WebView console logs

### 資料不顯示

1. 確認 Hyperliquid API 可存取
2. 檢查 React Native 端的 console logs
3. 確認 coin symbol 格式正確（如 "BTC"、"ETH"）

### 更新後仍顯示舊版本

1. 確認 CloudFront invalidation 已完成
2. 清除 app 快取重新啟動：`npx expo start --clear`
3. 檢查 response header 中的 `x-cache` 是否為 `Miss from cloudfront`

## 參考連結

- [TradingView Charting Library Documentation](https://www.tradingview.com/charting-library-docs/)
- [Hyperliquid API Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
