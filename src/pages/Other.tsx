import { Link } from 'react-router-dom'

export function OtherPage() {
  return (
    <div className="stack">
      <section className="page-lead">
        <p className="eyebrow">其他</p>
        <h2>帳本以外的設定</h2>
        <p className="lede">固定支出和備份放這裡，充電與總覽才在主功能列。</p>
      </section>

      <Link to="/fixed" className="panel row-card other-link">
        <div>
          <p className="row-title">固定支出</p>
          <p className="row-meta">保險、停車、貸款、連線訂閱</p>
        </div>
        <p className="row-end">進入</p>
      </Link>

      <Link to="/backup" className="panel row-card other-link">
        <div>
          <p className="row-title">備份</p>
          <p className="row-meta">匯出或匯入 JSON</p>
        </div>
        <p className="row-end">進入</p>
      </Link>
    </div>
  )
}
