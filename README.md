# 豆灰仔 · 電動車持有成本

記錄購置成本、每月固定支出與充電，算出每月花費與每公里成本。充電單可拍照或選圖，瀏覽器辨識後再確認入帳。

登入 Google 後，帳本存在你的雲端帳號，手機和電腦看到的是同一本。

線上使用：https://ckjan0516.github.io/douhuizai-ev-cost/

## 本機開發

雲端硬碟不適合裝 `node_modules`。建議把專案拷到本機磁碟再安裝：

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` 填入 Firebase 網頁設定。localhost 可以用相機／選圖測試掃描。

## 成本怎麼算

- 購置攤提（月）=（購置合計 − 殘值）÷（持有年數 × 12）
- 該月固定支出 = 當月月繳 + 年繳 ÷ 12 + 當月一次性
- 該月充電 = 該月充電金額加總
- 每月持有成本 = 攤提 + 固定支出 + 充電
- 每公里成本 = 期間總持有成本 ÷（期末里程 − 期初里程）

家充若只填度數，會用「家充電價」帶出金額。沒有里程時，總覽仍顯示花費，每公里會標「尚缺里程」。

## 備份

日常換裝置：用同一支 Google 帳號登入即可。

「備份」頁的 JSON 是額外副本。匯入會覆寫這支 Google 帳號的雲端資料。

## 部署

推到 `main` 後，GitHub Actions 會發布到 GitHub Pages。Firebase 設定值放在 repo 的 Actions secrets，變數名稱與 `.env.example` 相同。
