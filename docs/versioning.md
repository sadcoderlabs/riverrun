# Expo App 版本與更新管理規範

## 0. 目標與設計原則

本文件說明本專案在 **Expo / EAS** 下的版本與更新管理策略，涵蓋：

- App 在 App Store / Play Store 的版本號管理
- OTA（EAS Update）發版流程（preview / production）
- runtimeVersion 管理原則
- 如何在 Sentry / 客服中追蹤使用者目前使用的 OTA 版本

設計原則：

1. **使用者只會拿到 `main` branch 的程式碼**
   - `develop` branch 僅用於 internal preview 測試
   - 真正上線給使用者的 OTA / binary 僅來源於 `main` branch

2. **App Store 顯示的版本號與 `expo.version` 完全對齊**
   - 使用者在 App 內看到的版本號 = Store 後台的版本號
   - 方便客服 / debug / 查 release 紀錄

3. **runtimeVersion 只用來表示「native 介面版本」**
   - 手動維護，僅在 **native 有變更** 時才更新
   - 使用日期字串（例如 `2024.11.18`）方便閱讀

4. **每次送新 binary，都會遞增 `buildNumber` / `versionCode`**
   - 這是 Store 的硬性規定
   - 版本號的主體資訊交由 `expo.version` 呈現

5. **不維護 git tag，追蹤 OTA 只靠 commit hash + Sentry release/dist**
   - CI 在 build / update 時，把 `git short hash` 注入 `extra.commitHash`
   - App 啟動時把 commitHash 傳給 Sentry，方便錯誤追蹤與客服排查

---

## 1. 版本欄位定義

### 1.1 `expo.version`

- 給使用者與 Store 顯示的版本號
- 格式：`MAJOR.MINOR.PATCH`
- **只在「要出新 binary 並送審」前才 bump**

### 1.2 `ios.buildNumber` / `android.versionCode`

- Store 判斷新 binary 的依據
- 每次 submit 都必須遞增
- JS-only OTA **不修改**

### 1.3 `expo.runtimeVersion`

- 決定 OTA 是否相容
- 使用日期字串（`2024.11.18`）
- **只在 native module/config 變更時更新**

### 1.4 `expo.extra.commitHash`

- 用於工程師 debug / Sentry dist
- CI 注入 `git rev-parse --short HEAD`

---

## 2. Git Branch / EAS Channel 策略

| Git branch | EAS branch | Channel    | 用途       |
| ---------- | ---------- | ---------- | ---------- |
| develop    | develop    | preview    | 內部測試   |
| main       | main       | production | 使用者版本 |

- Store 安裝的 App 永遠指向 `production` channel
- 只有 `main` branch 的程式碼能送達使用者

---

## 3. `app.config.ts` 範例

```ts
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'MyApp',
  slug: 'my-app',

  version: '1.2.3', // expo.version
  runtimeVersion: '2024.11.18', // native 介面版本

  ios: {
    buildNumber: '45',
    bundleIdentifier: 'com.mycompany.myapp',
  },
  android: {
    versionCode: 45,
    package: 'com.mycompany.myapp',
  },

  extra: {
    commitHash: process.env.GIT_COMMIT_HASH,
  },
};

export default config;
```

---

## 4. CI / CD 流程

### 4.1 在 CI 取得 commit hash

```bash
export GIT_COMMIT_HASH=$(git rev-parse --short HEAD)
```

### 4.2 develop → preview（自動 OTA）

```yaml
on:
  push:
    branches: [develop]

steps:
  - uses: actions/checkout@v4
  - run: echo "GIT_COMMIT_HASH=$(git rev-parse --short HEAD)" >> $GITHUB_ENV
  - run: npm install -g eas-cli && npm ci
  - run: eas update --branch develop --channel preview --message "Preview ($GIT_COMMIT_HASH)"
    env:
      EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

### 4.3 main → production（自動 OTA）

```yaml
on:
  push:
    branches: [main]
```

與 preview 同樣流程，只是 channel 變成：

```bash
eas update --branch main --channel production
```

### 4.4 新 binary 的手動 build + submit

```yaml
on:
  workflow_dispatch:
```

流程：

1. bump version / runtimeVersion
2. build
3. submit
4. Store 審核通過後進入 Ready for Sale / Available
5. 依照 4.5 的流程更新 `latest-build.json`

補充：Step 4 建議由值班工程師或自動腳本輪詢 App Store Connect / Play Console API，一旦確認最新 build 已發佈給使用者，就觸發 Step 5 將對應的 `minSupportedBuild` 與 `storeUrl` 更新至 S3

### 4.5 App Store 上架後同步 S3 JSON

- App Store 審核通過並上架後，務必更新 S3 上的 `latest-build.json`（或專案自訂名稱），讓線上使用中的 App 能知道最新 binary 是否已經推出。
- JSON 以平台為單位維護（`ios` / `android`），每個平台記錄 `minSupportedBuild`（允許繼續使用的最低 buildNumber/versionCode）與對應 Store 連結 `storeUrl`，供 App 決定是否顯示「請更新到最新版本」提示。
- 建議在更新 JSON 之前先確認 App Store Connect / Play Console 已顯示「Ready for Sale」，再使用 CI 腳本或手動 `aws s3 cp` 將檔案覆蓋上傳，並保留 Bucket Versioning 以利追溯。

範例：

```json
{
  "ios": {
    "minSupportedBuild": 45,
    "storeUrl": "https://apps.apple.com/app/"
  },
  "android": {
    "minSupportedBuild": 33,
    "storeUrl": "https://play.google.com/store/apps/details?id=..."
  }
}
```

---

## 5. App 端版本顯示 & Sentry

### 5.1 前端顯示

使用者看到（同時帶出 commit hash 方便客服定位）：

```
版本：1.2.3 (45) [a1b2c3d]
```

工程師 debug：

```
Debug：runtimeVersion=2024.11.18, commit=a1b2c3d
```

來源：

```ts
import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig;

expoConfig.version; // 1.2.3
expoConfig.runtimeVersion; // 2024.11.18
expoConfig.extra.commitHash; // a1b2c3d
expoConfig.ios.buildNumber;
expoConfig.android.versionCode;
```

### 5.2 Sentry 設定

```ts
Sentry.init({
  dsn: '...',
  release: `${bundleId}@${version}+${buildNumber}`,
  dist: commitHash,
});
```

---

## 6. 常見更新情境

### 6.1 JS-only OTA

- 修改 develop → 自動更新 preview
- merge main → 自動更新 production
- 不改 `expo.version`
- 不改 `runtimeVersion`
- commitHash 用於追蹤

### 6.2 Native 變更 + 新 binary

- bump：
  - `expo.version`
  - `runtimeVersion`
  - `buildNumber` / `versionCode`
- build → submit → Store 上架

---

## 7. 選擇背後的原則

1. `expo.version` 表示 Store release，不用來標記 OTA
2. `runtimeVersion` 用於「native 相容性」
3. git tag 非必要，小團隊降低維護成本
4. 使用 commitHash + Sentry 追蹤 OTA 來源
5. main / develop 分離，強制確保只有 production branch 能被使用者取得

---
