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
- 由於使用 `runtimeVersion: { policy: "appVersion" }`，每次 bump version 都會同時更新 runtime version

⚠️ **重要警告**：

- **不要隨意 bump `expo.version`**，除非真的要出新的 native build
- 每次 bump version 會改變 runtime version，導致已安裝舊版 app 的使用者**無法收到新的 OTA 更新**
- OTA 只會推送給相同 runtime version 的使用者

### 1.2 `ios.buildNumber` / `android.versionCode`

- Store 判斷新 binary 的依據
- 每次 submit 都必須遞增
- JS-only OTA **不修改**

### 1.3 `expo.runtimeVersion`

- 決定 OTA 是否相容
- **使用 `policy: "appVersion"` 自動管理**
- Runtime version 自動與 `expo.version` 同步
- 這意味著每次 bump `expo.version` 時，runtime version 也會自動更新

### 1.4 Git Commit Hash

- 用於工程師 debug / Sentry dist
- **不儲存在 `expo.extra`**，改用 `EXPO_PUBLIC_GIT_COMMIT_HASH` 環境變數
- CI 在執行 `eas update` 時注入 `git rev-parse --short HEAD`
- 透過 `process.env.EXPO_PUBLIC_GIT_COMMIT_HASH` 在 App 中存取

---

## 2. Git Branch / EAS Channel 策略

| Git branch | EAS Update branch | Channel    | Build Profile | 用途                 |
| ---------- | ----------------- | ---------- | ------------- | -------------------- |
| develop    | develop           | preview    | preview       | 內部測試（內部分發） |
| main       | main              | production | production    | 使用者版本（Store）  |

### Channel 設定

在 `eas.json` 中配置 channel：

```json
{
  "build": {
    "preview": {
      "channel": "preview",
      "distribution": "internal"
    },
    "production": {
      "channel": "production"
    }
  }
}
```

### 運作方式

- 執行 `eas build --profile preview` 產生的 binary 會訂閱 `preview` channel
- 執行 `eas build --profile production` 產生的 binary 會訂閱 `production` channel
- Store 安裝的 App（production build）永遠指向 `production` channel
- 只有 `main` branch 的程式碼能送達使用者

---

## 3. `app.json` / `app.config.ts` 範例

### `app.json`

```json
{
  "expo": {
    "version": "1.2.3",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "ios": {
      "buildNumber": "45"
    },
    "android": {
      "versionCode": 45
    },
    "extra": {
      "sentryDsn": "https://..."
    }
  }
}
```

### `app.config.ts`

```ts
import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'MyApp',
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.mycompany.myapp',
    },
    android: {
      ...config.android,
      package: 'com.mycompany.myapp',
    },
    extra: {
      ...config.extra,
      // 注意：不要在這裡放 commitHash
      // commitHash 透過 EXPO_PUBLIC_GIT_COMMIT_HASH 注入
    },
  };
};
```

**重要注意事項**：

1. **Runtime Version**：使用 `policy: "appVersion"` 自動與 `expo.version` 同步，不需手動維護
2. **Git Commit Hash**：不應該放在 `app.config.ts` 的 `extra` 中，因為 `eas update` 執行時無法存取 shell 環境變數。改用 `EXPO_PUBLIC_` 前綴的環境變數，直接注入到 JavaScript bundle 中
3. **⚠️ 不要輕易修改 `expo.version`**：由於 runtime version 與 `expo.version` 綁定，每次修改版本號都會建立新的 runtime version，導致舊版使用者無法收到 OTA 更新

---

## 4. CI / CD 流程

### 4.1 在 CI 取得 commit hash

在 GitHub Actions 中取得 commit hash 並設為環境變數：

```bash
COMMIT_HASH=$(git rev-parse --short HEAD)
```

### 4.2 develop → preview（自動 OTA）

```yaml
name: Publish EAS Update (Preview)

on:
  push:
    branches: [develop]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - uses: pnpm/action-setup@v4
        with:
          version: 10.16.1

      - name: Install dependencies
        run: pnpm install

      - name: Publish Update
        run: |
          COMMIT_HASH=$(git rev-parse --short HEAD)
          EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH pnpm exec eas update \
            --branch develop \
            --channel preview \
            --message "Preview: $COMMIT_HASH"
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

**關鍵要點**：

- 使用 `EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH` 在指令前綴設定環境變數
- 這會將 commit hash 注入到 JavaScript bundle 中
- `--branch develop` 指定 EAS Update branch（用於版本管理）
- `--channel preview` 指定推送到 preview channel（對應到 `eas.json` 中的 preview build profile）
- Preview builds（`eas build --profile preview`）訂閱 `preview` channel，會收到這個更新

### 4.3 main → production（自動 OTA）

```yaml
name: Publish EAS Update (Production)

on:
  push:
    branches: [main]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - uses: pnpm/action-setup@v4
        with:
          version: 10.16.1

      - name: Install dependencies
        run: pnpm install

      - name: Publish Update
        run: |
          COMMIT_HASH=$(git rev-parse --short HEAD)
          EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH pnpm exec eas update \
            --branch main \
            --channel production \
            --message "Production: $COMMIT_HASH"
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

**關鍵要點**：

- `--branch main` 指定 EAS Update branch
- `--channel production` 指定推送到 production channel
- Production builds（從 Store 下載的 App）訂閱 `production` channel，會收到這個更新

### 4.4 新 binary 的手動 build + submit

當需要更新 native code 或發佈新版本到 Store 時，**務必遵循以下流程**：

#### 流程概覽

```
develop branch → 測試 → merge to main → build & submit → Store 上架
```

#### 詳細步驟

**步驟 1: 在 develop branch 上開發和測試**

1. 在 `develop` branch 進行 native 相關的開發
2. **Bump version**（在 `app.json` 中）：
   - 更新 `expo.version`（例如 `1.2.3` → `1.3.0`）
   - 更新 `ios.buildNumber` 和 `android.versionCode`
   - ⚠️ **注意**：runtime version 會自動跟著 `expo.version` 更新

3. **建立 preview build 進行測試**：

   ```bash
   # 在 develop branch
   eas build --profile preview --platform all
   ```

4. 使用 preview build 進行內部測試，確保 native 變更正常運作

**步驟 2: Merge to main branch**

測試完成後，將 `develop` merge 到 `main`：

```bash
git checkout main
git merge develop
git push origin main
```

⚠️ **重要**：必須先 merge 到 `main` 再 build production，確保：

- Production build 包含最新的程式碼
- `main` branch 保持為唯一的 production 程式碼來源
- 版本號與 Store 上的版本保持同步

**步驟 3: 建立 production build 並 submit**

```bash
# 在 main branch
eas build --profile production --platform all

# Submit to Store
eas submit --platform ios --latest
eas submit --platform android --latest
```

或使用 GitHub Actions workflow_dispatch 觸發。

**步驟 4: 等待審核與上架**

Store 審核通過後進入 Ready for Sale / Available

**步驟 5: 更新 latest-build.json**

依照 4.5 的流程更新 S3 上的版本資訊

#### 重要提醒

- ✅ **正確流程**：develop 測試 → merge to main → build production from main
- ❌ **錯誤流程**：在 develop build production，或 build 後才 merge
- Native build 的流程**不應該自動化**（需要手動觸發），確保版本號變更是有意識的決定
- 一旦 bump `expo.version`，舊版使用者將無法收到後續的 OTA 更新
- Production builds 會自動訂閱 `production` channel，推送到 `main` branch 的 OTA 更新會自動送達

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

取得版本資訊：

```ts
import Constants from 'expo-constants';

const version = Constants.expoConfig?.version; // 1.2.3
const runtimeVersion = Constants.expoConfig?.runtimeVersion; // { policy: 'appVersion' } 或實際值 1.2.3
const commitHash = process.env.EXPO_PUBLIC_GIT_COMMIT_HASH; // a1b2c3d
const buildNumber =
  Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode;
```

**注意**：由於使用 `policy: "appVersion"`，runtime version 實際上會等於 `expo.version`。

### 5.2 Sentry 設定

在 `Sentry.init()` 中加入版本追蹤：

```ts
Sentry.init({
  dsn: '...',
  release: `${bundleId}@${version}+${buildNumber}`,
  commit: commitHash, // 用 commit hash 識別 OTA 版本
  // ... 其他設定
});
```

---

## 6. 常見更新情境

### 6.1 JS-only OTA

- 修改 develop → 自動更新 preview
- merge main → 自動更新 production
- **不改 `expo.version`**（⚠️ 重要：改了會導致舊版使用者收不到 OTA）
- runtime version 自動維持不變
- commitHash 用於追蹤

### 6.2 Native 變更 + 新 binary

- bump：
  - `expo.version`（runtime version 會自動跟著更新）
  - `buildNumber` / `versionCode`
- build → submit → Store 上架

---

## 7. 選擇背後的原則

1. **`expo.version` 表示 Store release**：不用來標記 OTA，只在出新 binary 時才 bump
2. **`runtimeVersion` 使用 `policy: "appVersion"` 自動管理**：
   - 自動與 `expo.version` 同步，無需手動維護
   - 確保 OTA 只會推送給相同 app version 的使用者
   - 每次出新 binary 並 bump version 時，runtime version 自動更新
3. **Git tag 非必要**：小團隊降低維護成本
4. **使用 `EXPO_PUBLIC_GIT_COMMIT_HASH` + Sentry 追蹤 OTA 來源**：透過 commit hash 精確識別每個 OTA 版本
5. **main / develop 分離**：強制確保只有 production branch 能被使用者取得

---
