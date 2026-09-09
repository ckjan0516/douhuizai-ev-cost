# 豆灰仔 · 電動車持有成本

本機帳本：記錄購置成本、每月固定支出與充電，算出每月花費與每公里成本。充電單可拍照或選圖，瀏覽器辨識後再確認入帳。

花費資料存在你開啟這個網站的瀏覽器（IndexedDB），不會上傳到伺服器。

## 本機開發

雲端硬碟不適合裝 `node_modules`。建議把專案拷到本機磁碟再安裝：

```bash
npm install
npm run dev
```

瀏覽器開終端機顯示的本機網址。localhost 可以用相機／選圖測試掃描。

## 成本怎麼算

- 購置攤提（月）=（購置合計 − 殘值）÷（持有年數 × 12）
- 該月固定支出 = 當月月繳 + 年繳 ÷ 12 + 當月一次性
- 該月充電 = 該月充電金額加總
- 每月持有成本 = 攤提 + 固定支出 + 充電
- 每公里成本 = 期間總持有成本 ÷（期末里程 − 期初里程）

家充若只填度數，會用「家充電價」帶出金額。沒有里程時，總覽仍顯示花費，每公里會標「尚缺里程」。

## 備份到雲端硬碟

1. 打開「備份」
2. 下載 JSON
3. 把檔案存進這份專案所在的雲端硬碟資料夾

換手機或清瀏覽器後，用同一份 JSON 匯入。匯入會覆寫該瀏覽器目前的帳。

## 部署到網路上

這是靜態網站，請部署到有 HTTPS 的空間，手機才能在充電站掃描充電單。不要用雲端硬碟預覽當網站。

### GitHub Pages

1. 把這個資料夾建成 GitHub repo（可先 private）
2. Repo Settings → Pages → Source 選 GitHub Actions
3. 已附 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，推到 `main` 就會部署
4. 網站網址形如 `https://<帳號>.github.io/<repo>/`

### Cloudflare Pages

1. 連接同一個 GitHub repo
2. Build command：`npm run build`
3. Output directory：`dist`

上線後請用同一個網址紀錄帳本。不同網址的瀏覽器資料是分開的。
