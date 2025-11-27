# App 版本與更新管理規範

本文件說明本專案的版本管理策略、更新流程與決策指南。

---

## 1. 核心原則

### 1.1 版本號管理

**`expo.version` 是 App 的唯一語意版本號**

- 格式：`MAJOR.MINOR.PATCH`（例如：`1.2.3`）
- 對應 Store 顯示版本號
- 對應 App 內顯示版本號
- 自動決定 `runtimeVersion`（透過 `policy: "appVersion"`）

```json
{
  "expo": {
    "version": "1.2.3", // 唯一真相來源
    "runtimeVersion": {
      "policy": "appVersion" // 自動等於 expo.version
    }
  }
}
```

⚠️ **關鍵理解**：

- 修改 `expo.version` → `runtimeVersion` 自動更新
- `runtimeVersion` 改變 → 舊版 App **無法**收到新的 OTA 更新
- OTA 只推送給相同 `runtimeVersion` 的 App

### 1.2 版本號意義

| 欄位                  | 用途                     | 何時修改                      | 影響                              |
| --------------------- | ------------------------ | ----------------------------- | --------------------------------- |
| `expo.version`        | App 語意版本號           | 需要新 native build 時        | 改變 runtimeVersion，切斷舊版 OTA |
| `ios.buildNumber`     | Store 識別 iOS build     | 每次 submit 到 Store          | Store 判斷是否為新 build          |
| `android.versionCode` | Store 識別 Android build | 每次 submit 到 Store          | Store 判斷是否為新 build          |
| `runtimeVersion`      | OTA 相容性判斷           | **自動**（跟隨 expo.version） | 決定哪些 App 能收到 OTA           |
| Commit Hash           | 追蹤 JS bundle 版本      | 自動注入                      | Sentry 追蹤、客服查詢             |

### 1.3 Branch & Channel 策略

| Branch    | Build Profile | Channel      | 用途     | 誰會使用   |
| --------- | ------------- | ------------ | -------- | ---------- |
| `develop` | `preview`     | `preview`    | 內部測試 | 開發團隊   |
| `main`    | `production`  | `production` | 正式版本 | 所有使用者 |

**原則**：

- ✅ 使用者**只會**拿到來自 `main` branch 的代碼
- ✅ `develop` 僅用於內部開發與測試
- ✅ 所有 PR 必須先合併到 `main` 再發布 production build

---

## 2. 更新機制說明

### 2.1 三種更新方式

#### **A. OTA 更新（Over-The-Air）**

- **適用**：純 JS/React 代碼變更
- **速度**：秒級推送
- **限制**：不能修改 native code
- **版本號**：`expo.version` 保持不變

#### **B. Native Build 更新**

- **適用**：Native module、配置變更
- **速度**：需要 Store 審核（1-7 天）
- **限制**：必須透過 Store 下載
- **版本號**：`expo.version` 必須升級

#### **C. Bundle 更新（不升級 expo.version）**

- **適用**：想讓新用戶直接下載最新 JS bundle
- **速度**：需要 Store 審核
- **限制**：僅 `buildNumber`/`versionCode` 遞增
- **版本號**：`expo.version` 保持不變
- **效果**：舊用戶透過 OTA 更新，新用戶下載到最新 bundle

### 2.2 App 啟動時的更新檢查流程

```
App 冷啟動
    ↓
┌─────────────────────────────────────┐
│ 1. Native Version 檢查              │
│    - 從 S3 獲取 version-config.json │
│    - 比較當前版本與 latestVersion   │
└─────────────────────────────────────┘
    ↓
    ├─ 版本 < minVersion
    │   → 顯示「Update Required」提醒
    │   → 非阻擋式（用戶可選擇 Later）
    │
    ├─ 版本 < latestVersion
    │   → 顯示「Update Available」提醒
    │   → 非阻擋式（用戶可選擇 Later）
    │
    └─ 版本 >= latestVersion
        ↓
┌─────────────────────────────────────┐
│ 2. Runtime Version 檢查              │
│    - 自動判斷（基於 expo.version）   │
└─────────────────────────────────────┘
    ↓
    ├─ runtimeVersion 不符
    │   → 無法收到 OTA（已知限制）
    │   → 需要升級 native build
    │
    └─ runtimeVersion 相符
        ↓
┌─────────────────────────────────────┐
│ 3. OTA Update 檢查                   │
│    - 檢查 Expo Updates 服務          │
│    - 下載新 JS bundle                │
└─────────────────────────────────────┘
    ↓
    ├─ 有更新
    │   → 顯示確認提示
    │   → 下載並重載 App
    │
    └─ 無更新
        → 完成啟動
```

### 2.3 更新策略設計原則

- **非阻擋式**：所有提醒都允許用戶選擇「稍後」
- **單次提醒**：冷啟動只檢查一次，不重複打擾
- **分級提醒**：
  - `minVersion`：「Update Required」（強烈建議）
  - `latestVersion`：「Update Available」（溫和提醒）
- **錯誤容忍**：版本檢查失敗不影響 App 啟動

---

## 3. 決策指南：我該做什麼？

### 3.1 決策樹

```
我要做什麼修改？
    ↓
    ├─ 純 JS/React 代碼變更？
    │   ├─ 是 → 【情境 A：OTA 更新】
    │   └─ 否 ↓
    │
    ├─ 修改 native module 或配置？
    │   ├─ 是 → 【情境 B：Native Build 更新】
    │   └─ 否 ↓
    │
    └─ 想讓新用戶下載到最新 JS？
        └─ 是 → 【情境 C：Bundle 更新】
```

---

### 3.2 情境 A：OTA 更新（純 JS 變更）

**適用情況**：

- ✅ UI 調整、樣式修改
- ✅ 新增/修改 React 組件
- ✅ 商業邏輯變更
- ✅ Bug 修復（純 JS）
- ❌ 不能修改 native code
- ❌ 不能添加 native dependencies

**操作步驟**：

#### Develop 環境測試

```bash
# 1. 開發並提交到 develop
git checkout develop
git add .
git commit -m "feat: add new feature"
git push origin develop

# 2. CI 自動發布 Preview OTA
# 3. 使用 Preview Build 測試
```

#### 發布到 Production

```bash
# 4. 測試通過後，合併到 main（建議使用 PR）
git checkout main
git pull origin main
git merge develop
git push origin main

# 5. CI 自動發布 Production OTA
# 6. 所有使用者在下次啟動時收到更新
```

**版本號變更**：

- `expo.version`: ❌ 不改
- `buildNumber`/`versionCode`: ❌ 不改
- `version-config.json`: ❌ 不改

**時間**：約 5-10 分鐘（從 push 到使用者收到）

---

### 3.3 情境 B：Native Build 更新

**適用情況**：

- ✅ 新增 native module (如 expo-camera)
- ✅ 修改 app.json 的 native 配置
- ✅ 修改 iOS/Android 原生代碼
- ✅ 升級 Expo SDK
- ✅ 修改 permissions

**完整流程**：

#### 步驟 1：本地準備與版本號升級

```bash
# 1. 在 develop branch 開發
git checkout develop

# 2. 修改 app.json 升級版本號
vi app.json
```

```json
{
  "expo": {
    "version": "1.3.0", // 從 1.2.3 升級到 1.3.0
    "ios": {
      "buildNumber": "46" // 從 45 升級到 46
    },
    "android": {
      "versionCode": 46 // 從 45 升級到 46
    }
  }
}
```

```bash
# 3. 提交版本號變更
git add app.json
git commit -m "chore: bump version to 1.3.0"
```

#### 步驟 2：本地發 Development Build

⚠️ **重要**：必須先在本地發 development build，確保能正常開發

```bash
# 使用 pnpm script（包含 commit hash）
pnpm run build:development

# 或手動執行
COMMIT_HASH=$(git rev-parse --short HEAD)
EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile development --platform all
```

**為什麼要先發 development build？**

- ✅ 開發者需要在本地測試 native 變更
- ✅ 確保 development build 可以正常運行
- ✅ 驗證 native module 整合正確
- ✅ 在提交代碼前發現問題

```bash
# 4. 下載 development build 並在本地測試
# 5. 確認可以正常開發後，繼續下一步
```

#### 步驟 3：本地發 Preview Build

⚠️ **重要**：確保其他開發者可以下載使用

```bash
# 使用 pnpm script（包含 commit hash）
pnpm run build:preview

# 或手動執行
COMMIT_HASH=$(git rev-parse --short HEAD)
EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile preview --platform all
```

**為什麼要在本地發 preview build？**

- ✅ 確保 build 成功後才 push
- ✅ 其他開發者 pull 後可立即下載 preview build 測試
- ✅ 避免 push 後發現 build 失敗
- ✅ 內部測試人員可以立即開始測試

#### 步驟 4：Push 到 Develop

```bash
# 6. Preview build 成功後 push
git push origin develop

# 7. 內部測試人員使用 Preview Build 測試
# 8. 確認無問題後進行下一步
```

#### 步驟 5：合併到 Main

```bash
# 9. 開 PR: develop → main
# 10. Code Review 通過後合併
git checkout main
git pull origin main
git merge develop
git push origin main
```

#### 步驟 6：發 Production Build

```bash
# 11. 在 main branch 發 Production Build（本地或 CI）
pnpm run build:production

# 或手動
COMMIT_HASH=$(git rev-parse --short HEAD)
EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile production --platform all
```

#### 步驟 7：提交到 Store

```bash
# 12. 自動提交到 Store
eas submit --platform ios --latest
eas submit --platform android --latest

# 13. 等待 Store 審核（1-7 天）
```

#### 步驟 8：更新 Version Config

```bash
# 14. Store 上架後，更新 version-config.json
vi version-config.json
```

```json
{
  "ios": {
    "latestVersion": "1.3.0", // 更新
    "minVersion": "1.2.0", // 可選：更新最低支援版本
    "storeUrl": "https://apps.apple.com/app/..."
  },
  "android": {
    "latestVersion": "1.3.0", // 更新
    "minVersion": "1.2.0",
    "storeUrl": "https://play.google.com/store/apps/..."
  }
}
```

```bash
# 15. 提交並推送（建議使用 PR）
git add version-config.json
git commit -m "chore: update version config to 1.3.0"
git push origin main

# 16. CI 自動上傳到 S3
```

**版本號變更**：

- `expo.version`: ✅ 升級 (1.2.3 → 1.3.0)
- `buildNumber`/`versionCode`: ✅ 升級 (45 → 46)
- `version-config.json`: ✅ 更新 latestVersion

**時間**：約 1-7 天（取決於 Store 審核）

**關鍵提醒**：

- ⚠️ 一旦升級 `expo.version`，舊版 App 將無法收到新的 OTA
- ⚠️ 必須先在本地發 development build 確認可以正常開發
- ⚠️ 必須在本地發 preview build 才能 push 到 develop
- ⚠️ 必須等 Store 上架後才更新 version-config.json

---

### 3.4 情境 C：Bundle 更新（不升級 expo.version）

**適用情況**：

- 累積了多個 OTA 更新
- 想讓新下載的用戶直接獲得最新 JS bundle
- 作為 OTA 的補充機制
- 無 native code 變更

**操作步驟**：

#### 步驟 1：升級 Build Number

```bash
# 1. 修改 app.json（只改 buildNumber）
vi app.json
```

```json
{
  "expo": {
    "version": "1.2.3", // 保持不變
    "ios": {
      "buildNumber": "46" // 從 45 升級
    },
    "android": {
      "versionCode": 46 // 從 45 升級
    }
  }
}
```

#### 步驟 2：發 Build 並提交

```bash
# 2. 提交版本變更
git add app.json
git commit -m "chore: bump build number to 46"
git push origin main

# 3. 發 Production Build
pnpm run build:production

# 4. 提交到 Store
eas submit --platform ios --latest
eas submit --platform android --latest
```

**效果**：

- 舊用戶：透過 OTA 持續更新（runtimeVersion 未變）
- 新用戶：下載到內嵌最新 JS 的 build
- version-config.json：不需要修改（latestVersion 未變）

**版本號變更**：

- `expo.version`: ❌ 不改
- `buildNumber`/`versionCode`: ✅ 升級
- `version-config.json`: ❌ 不改

**時間**：約 1-7 天（Store 審核）

**使用時機**：

- 定期發布（如每週/每月）
- 累積較多 OTA 更新後
- 提升新用戶首次體驗

---

## 4. Build Scripts 配置

為了確保 commit hash 正確注入，建議在 `package.json` 中添加 build scripts：

```json
{
  "scripts": {
    "build:development": "bash -c 'COMMIT_HASH=$(git rev-parse --short HEAD) && EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile development --platform all'",
    "build:development:ios": "bash -c 'COMMIT_HASH=$(git rev-parse --short HEAD) && EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile development --platform ios'",
    "build:development:android": "bash -c 'COMMIT_HASH=$(git rev-parse --short HEAD) && EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile development --platform android'",
    "build:preview": "bash -c 'COMMIT_HASH=$(git rev-parse --short HEAD) && EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile preview --platform all'",
    "build:preview:ios": "bash -c 'COMMIT_HASH=$(git rev-parse --short HEAD) && EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile preview --platform ios'",
    "build:preview:android": "bash -c 'COMMIT_HASH=$(git rev-parse --short HEAD) && EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile preview --platform android'",
    "build:production": "bash -c 'COMMIT_HASH=$(git rev-parse --short HEAD) && EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile production --platform all'",
    "build:production:ios": "bash -c 'COMMIT_HASH=$(git rev-parse --short HEAD) && EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile production --platform ios'",
    "build:production:android": "bash -c 'COMMIT_HASH=$(git rev-parse --short HEAD) && EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH eas build --profile production --platform android'"
  }
}
```

**使用方式**：

```bash
# Development builds (本地開發測試)
pnpm run build:development
pnpm run build:development:ios
pnpm run build:development:android

# Preview builds (內部測試)
pnpm run build:preview
pnpm run build:preview:ios
pnpm run build:preview:android

# Production builds (正式發布)
pnpm run build:production
pnpm run build:production:ios
pnpm run build:production:android
```

**好處**：

- ✅ 自動注入 commit hash
- ✅ 統一 build 命令
- ✅ 減少人為錯誤
- ✅ 方便 Sentry 追蹤

---

## 5. CI/CD 自動化

### 5.1 自動 OTA 發布

#### Develop → Preview OTA

```yaml
# .github/workflows/eas-update-preview.yml
on:
  push:
    branches: [develop]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Publish EAS Update
        run: |
          COMMIT_HASH=$(git rev-parse --short HEAD)
          EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH pnpm exec eas update \
            --branch develop \
            --channel preview \
            --message "Preview: $COMMIT_HASH"
```

#### Main → Production OTA

```yaml
# .github/workflows/eas-update-production.yml
on:
  push:
    branches: [main]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Publish EAS Update
        run: |
          COMMIT_HASH=$(git rev-parse --short HEAD)
          EXPO_PUBLIC_GIT_COMMIT_HASH=$COMMIT_HASH pnpm exec eas update \
            --branch main \
            --channel production \
            --message "Production: $COMMIT_HASH"
```

### 5.2 自動上傳 Version Config

```yaml
# .github/workflows/upload-version-config.yml
on:
  push:
    branches: [main]
    paths:
      - 'version-config.json'

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - name: Upload to S3
        run: |
          aws s3 cp version-config.json s3://${{ secrets.AWS_S3_BUCKET }}/version-config.json \
            --cache-control "max-age=300, must-revalidate" \
            --content-type "application/json"
```

---

## 6. Version Config 管理

### 6.1 檔案結構

```json
{
  "ios": {
    "latestVersion": "1.3.0",
    "minVersion": "1.2.0",
    "storeUrl": "https://apps.apple.com/app/id6755521142"
  },
  "android": {
    "latestVersion": "1.3.0",
    "minVersion": "1.2.0",
    "storeUrl": "https://play.google.com/store/apps/details?id=com.perpetualprotocol.riverrun"
  }
}
```

### 6.2 欄位說明

- **`latestVersion`**: Store 上最新的版本號
  - 用於提示用戶有新版本
  - 與 `expo.version` 對應

- **`minVersion`**: 最低支援版本
  - 低於此版本顯示「Update Required」
  - 建議設為最近 2-3 個主要版本

- **`storeUrl`**: App Store / Play Store 連結
  - 用於「Update Now」按鈕跳轉

### 6.3 更新時機

**何時更新 latestVersion？**

- ✅ Native build 上架後
- ❌ 發 OTA 時不更新
- ❌ 僅升級 buildNumber 時不更新

**何時更新 minVersion？**

- ✅ 有重大安全漏洞修復
- ✅ 有破壞性 API 變更
- ✅ 舊版本不再維護
- ⚠️ 謹慎使用，會強制用戶更新

### 6.4 環境配置

```bash
# .env.production
EXPO_PUBLIC_VERSION_CONFIG_URL=https://s3.ap-southeast-1.amazonaws.com/riverrun.perp.com/version-config.json
```

---

## 7. 版本顯示與追蹤

### 7.1 App 內顯示

```typescript
import Constants from 'expo-constants';

const version = Constants.expoConfig?.version; // "1.2.3"
const commitHash = process.env.EXPO_PUBLIC_GIT_COMMIT_HASH; // "a1b2c3d"
const buildNumber = Constants.expoConfig?.ios?.buildNumber; // "45"

// 顯示格式: "1.2.3 (45) [a1b2c3d]"
const displayVersion = `${version} (${buildNumber}) [${commitHash}]`;
```

### 7.2 Sentry 追蹤

```typescript
Sentry.init({
  dsn: '...',
  release: `${bundleId}@${version}+${buildNumber}`,
  dist: commitHash, // 用 commit hash 識別 OTA 版本
});
```

**好處**：

- 客服查詢時可以精確定位版本
- 錯誤追蹤時可以知道具體的 JS bundle 版本
- 可以區分相同 `expo.version` 但不同 OTA 的問題

---

## 8. 常見問題

### Q1: 我可以跳過 preview build 直接發 production 嗎？

❌ **不建議**。Preview build 是為了：

- 內部測試 native 變更
- 在 TestFlight/Internal Testing 上驗證
- 避免將問題帶到 production

### Q2: 為什麼要先發 development build 再發 preview build？

✅ **必須**。原因：

**Development build**：

- 開發者在本地測試 native 變更
- 確保可以正常開發和調試
- 在提交前發現問題

**Preview build**：

- 其他開發者 pull 後可立即下載測試
- 內部測試人員使用
- 確保 build 成功才 push 代碼

### Q3: 忘記升級 buildNumber 會怎樣？

❌ Store 會拒絕：

- iOS: "Invalid Bundle. The bundle version must be higher than the previously uploaded version."
- Android: "Version code XXX has already been used."

### Q4: 可以降級 expo.version 嗎？

❌ **不可以**：

- Store 不允許降級
- 會造成版本混亂
- 可能導致 OTA 推送錯誤

### Q5: OTA 更新後用戶需要重啟 App 嗎？

✅ **是的**。OTA 下載完成後會呼叫 `reloadAsync()` 重新載入 App。

### Q6: 如果 version-config.json 下載失敗怎麼辦？

✅ **不影響啟動**：

- Native 版本檢查失敗會優雅降級
- 僅記錄錯誤但不阻擋 App
- 用戶可以正常使用 App

### Q7: 多久應該發一次 native build？

📊 **建議**：

- **必須時**：有 native 變更立即發
- **定期**：每 1-2 個月發一次（情境 C）
- **目的**：讓新用戶獲得最佳體驗

---

## 9. 快速參考

### 9.1 決策表

| 情況           | expo.version | buildNumber | version-config.json | 操作            |
| -------------- | ------------ | ----------- | ------------------- | --------------- |
| 純 JS 改動     | 不變         | 不變        | 不改                | Push → 自動 OTA |
| Native 改動    | 升級         | 升級        | 上架後更新          | 完整 Build 流程 |
| 優化新用戶體驗 | 不變         | 升級        | 不改                | Build → Submit  |
| 定期維護       | 不變         | 升級        | 不改                | Build → Submit  |

### 9.2 命令速查

```bash
# OTA 更新（自動觸發，無需手動）
git push origin develop  # → Preview OTA
git push origin main     # → Production OTA

# Preview Build（本地發）
pnpm run build:preview

# Production Build（本地發）
pnpm run build:production

# Submit to Store
eas submit --platform ios --latest
eas submit --platform android --latest

# 更新 Version Config
# 1. 修改 version-config.json
# 2. git add version-config.json
# 3. git commit -m "chore: update version config"
# 4. git push origin main  # → 自動上傳 S3
```

### 9.3 檢查清單

#### 發布 OTA 前

- [ ] 代碼已測試通過
- [ ] 無 native code 變更
- [ ] 已合併到目標 branch (develop/main)

#### 發布 Native Build 前

- [ ] 已升級 `expo.version`
- [ ] 已升級 `buildNumber`/`versionCode`
- [ ] 已在本地發 development build
- [ ] Development build 測試通過（本地開發正常）
- [ ] 已在本地發 preview build
- [ ] Preview build 已測試通過（內部測試正常）
- [ ] 已合併到 main branch
- [ ] 已發 production build

#### Native Build 上架後

- [ ] Store 已顯示「Ready for Sale」
- [ ] 已更新 `version-config.json`
- [ ] version-config.json 已推送到 main
- [ ] S3 已成功更新
- [ ] 測試 App 可正常檢查版本

---

## 10. 相關資源

- [Expo Updates 文檔](https://docs.expo.dev/versions/latest/sdk/updates/)
- [EAS Build 文檔](https://docs.expo.dev/build/introduction/)
- [EAS Submit 文檔](https://docs.expo.dev/submit/introduction/)
- [Semantic Versioning](https://semver.org/)
