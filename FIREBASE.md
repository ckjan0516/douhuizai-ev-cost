# 開啟 Google 登入

到 [Firebase 控制台](https://console.firebase.google.com/) 用你平常的 Google 帳號操作：

1. 新增專案，名稱可填 `douhuizai`
2. 專案設定 → 新增應用程式 → 選網頁，暱稱填 `豆灰仔`
3. 複製六個設定值：`apiKey`、`authDomain`、`projectId`、`storageBucket`、`messagingSenderId`、`appId`
4. Authentication → Sign-in method → 開啟 Google
5. Authentication → Settings → Authorized domains 加上：
   - `localhost`
   - `ckjan0516.github.io`
6. Firestore Database → 建立，選生產模式，規則貼上 [`firestore.rules`](firestore.rules)
7. Storage → 開始使用，規則貼上 [`storage.rules`](storage.rules)

把六個設定值傳給我，或自己加到 GitHub repo 的 Settings → Secrets and variables → Actions。
