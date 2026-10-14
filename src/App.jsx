import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeDollarSign, Bot, BriefcaseBusiness, Building2, CalendarDays, ChevronDown, Command, Download, GraduationCap, LayoutDashboard, LockKeyhole, LogOut, Mail, MapPin, MessageCircle, MoreHorizontal, Search, Send, ShieldAlert, Sparkles, UserRound, Wallet, X } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const money = (value) => `¥${(value / 10000).toFixed(1)}万`
const periodOptions = [{ value: 'last6', label: '近6个月' }, { value: '2026-10', label: '2026年10月' }, { value: '2026-09', label: '2026年9月' }]

function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('bosshelper-demo-auth-v2') === 'true')
  const [publicPage, setPublicPage] = useState('本源科技')
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('经营总览')
  const [period, setPeriod] = useState('last6')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [asking, setAsking] = useState(false)
  const [openChat, setOpenChat] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedRisk, setSelectedRisk] = useState(null)
  const [toast, setToast] = useState('')
  const searchRef = useRef(null)

  const loadData = useCallback(async (selected = period) => {
    try {
      const response = await fetch(`/api/overview?period=${encodeURIComponent(selected)}`)
      if (!response.ok) throw new Error('经营数据读取失败')
      setData(await response.json())
    } catch { setData({ error: true }) }
  }, [period])

  useEffect(() => { if (authenticated) loadData(period) }, [authenticated, loadData, period])
  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 0) }
      if (event.key === 'Escape') { setSearchOpen(false); setPeriodOpen(false); setSelectedCustomer(null); setSelectedRisk(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const tell = (text) => { setToast(text); window.setTimeout(() => setToast(''), 2600) }
  async function ask(text = question) {
    if (!text.trim() || asking) return
    setMessages((current) => [...current, { role: 'user', text }])
    setQuestion(''); setAsking(true)
    try {
      const response = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: text }) })
      const result = await response.json()
      setMessages((current) => [...current, { role: 'assistant', text: result.answer, source: result.source }])
    } catch { setMessages((current) => [...current, { role: 'assistant', text: '暂时无法连接演示服务，请检查前后端是否都已启动。' }]) }
    setAsking(false)
  }

  function login(username, password) {
    if (username.trim().toLowerCase() !== 'lin@gmail.com' || password !== 'Lin123321#') {
      setAuthError('用户名或密码错误，请检查后重试。')
      setAuthNotice('')
      return
    }
    sessionStorage.setItem('bosshelper-demo-auth-v2', 'true')
    setAuthenticated(true)
    setAuthError('')
  }

  function register({ username, email, password, confirmPassword }) {
    if (password !== confirmPassword) { setAuthError('两次输入的密码不一致。'); setAuthNotice(''); return }
    if (username.trim().toLowerCase() !== 'lin@gmail.com' || email.trim().toLowerCase() !== 'test@gmail.com' || password !== 'Lin123321#') {
      setAuthError('演示版只预置一个测试账号，请使用页面展示的账号信息。')
      setAuthNotice('')
      return
    }
    setAuthError('')
    setAuthNotice('该测试账号已预先开通，请直接登录。')
    setAuthMode('login')
  }

  function logout() {
    sessionStorage.removeItem('bosshelper-demo-auth-v2')
    setAuthenticated(false)
    setData(null)
    setMessages([])
    setTab('经营总览')
    setAuthMode('login')
    setPublicPage('本源科技')
  }

  const searchResults = useMemo(() => {
    if (!data || !search.trim()) return []
    const q = search.trim().toLowerCase()
    const results = []
    for (const customer of data.customers || []) if (`${customer.name}${customer.segment}${customer.city}`.toLowerCase().includes(q)) results.push({ type: '客户', label: customer.name, detail: `${customer.segment} · 毛利 ${money(customer.grossProfit)}`, customer })
    for (const product of data.products || []) if (`${product.name}${product.category}`.toLowerCase().includes(q)) results.push({ type: '产品', label: product.name, detail: `${product.category} · 毛利 ${money(product.grossProfit)}` })
    const metrics = [
      ['收入', '营业收入', money(data.summary.revenue), '经营总览'], ['毛利', '综合毛利', money(data.summary.grossProfit), '客户分析'], ['现金', '现金余额', money(data.summary.cashBalance), '现金流'], ['应收', '应收账款', money(data.summary.receivables), '风险预警'],
    ]
    for (const [word, label, value, destination] of metrics) if (`${word}${label}`.toLowerCase().includes(q)) results.push({ type: '指标', label, detail: value, destination })
    return results.slice(0, 8)
  }, [data, search])

  function selectSearchResult(result) {
    if (result.customer) setSelectedCustomer(result.customer)
    else if (result.destination) setTab(result.destination)
    else tell(`已找到${result.type}：${result.label}`)
    setSearchOpen(false); setSearch('')
  }

  function exportCsv() {
    if (!data) return
    const rows = [['订单号','日期','客户','产品','订单收入','直接成本','毛利','已回款','未收应收','到期日','是否逾期']]
    for (const order of data.orders) rows.push([order.id, order.date, order.customerName, order.productName, order.amount, order.cost, order.amount - order.cost, order.received, order.outstanding, order.dueDate, order.overdue ? '是' : '否'])
    const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'BOSSHELPER-订单回款明细.csv'; link.click(); URL.revokeObjectURL(url)
    tell('订单、成本、回款和应收明细已导出')
  }

  if (!authenticated) return <AuthScreen mode={authMode} setMode={(mode) => { setAuthMode(mode); setAuthError(''); setAuthNotice('') }} page={publicPage} setPage={setPublicPage} onLogin={login} onRegister={register} error={authError} notice={authNotice} />
  if (!data) return <div className="loading"><div className="spinner" /><span>正在读取经营数据…</span></div>
  if (data.error) return <div className="loading"><strong>暂时读不到经营数据</strong><small>请在项目终端运行 npm.cmd run dev，并确认前后端服务正常。</small><button className="report-btn" onClick={() => loadData(period)}>重新连接</button></div>

  const nav = [{ name: '经营总览', icon: LayoutDashboard }, { name: '客户分析', icon: BriefcaseBusiness }, { name: '现金流', icon: Wallet }, { name: '风险预警', icon: ShieldAlert }, { name: '创始人', icon: UserRound }, { name: '关于 OriginTech', icon: Building2 }]
  const isBrandPage = tab === '创始人' || tab === '关于 OriginTech'
  const metrics = [
    { label: data.selectedPeriod === 'last6' ? '近6个月营业收入' : `${data.period}营业收入`, value: money(data.summary.revenue), change: `${data.summary.revenueChange > 0 ? '+' : ''}${data.summary.revenueChange}%`, note: data.summary.comparisonLabel, icon: BadgeDollarSign, color: 'blue', destination: '经营总览' },
    { label: '综合毛利', value: money(data.summary.grossProfit), change: `${data.summary.grossMargin}%`, note: '毛利率', icon: Activity, color: 'purple', destination: '客户分析' },
    { label: '期末现金余额', value: money(data.summary.cashBalance), change: `${data.summary.cashRunway} 个月`, note: '预测现金可支撑', icon: Wallet, color: 'green', destination: '现金流' },
    { label: '应收账款', value: money(data.summary.receivables), change: `${money(data.summary.receivablesOverdue)} 逾期`, note: '需重点跟进', icon: CalendarDays, color: 'orange', destination: '风险预警' },
  ]
  const allOrders = data.orders || []
  const customers = data.customers || []
  const risks = data.risks || []

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={17} fill="currentColor" /></div><div><b>经营参谋</b><small>AI BUSINESS COPILOT</small></div></div>
      <button className="company-switch" onClick={() => tell(`当前演示企业：${data.company}`)}><div className="company-logo">知</div><div className="company-label"><b>{data.company}</b><span>演示工作空间</span></div><ChevronDown size={15} /></button>
      <div className="nav-title">工作台</div><nav>{nav.map(({ name, icon: Icon }) => <button key={name} className={`nav-link ${tab === name ? 'selected' : ''}`} onClick={() => setTab(name)}><Icon size={17} /><span>{name}</span>{name === '风险预警' && <i className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><div className="avatar"><img src="/lin-avatar.png?v=3" alt="林先生" /></div><div className="profile-name"><b>林先生</b><small>企业管理员</small></div><button className="profile-menu" title="退出登录" onClick={logout}><LogOut size={15} /><span>退出</span></button></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">工作台 <span>/</span> <b>{tab}</b></div>{!isBrandPage && <div className="top-actions"><div className="search-wrap"><label className="search-btn"><Search size={15} /><input ref={searchRef} value={search} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true) }} onKeyDown={(event) => { if (event.key === 'Enter' && searchResults[0]) selectSearchResult(searchResults[0]) }} placeholder="搜索指标、客户、产品" /><kbd>⌘ K</kbd></label>{searchOpen && search && <div className="search-results">{searchResults.length ? searchResults.map((result, index) => <button key={`${result.label}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSearchResult(result)}><span className="search-type">{result.type}</span><span className="search-result-copy"><b>{result.label}</b><small>{result.detail}</small></span><ArrowRight size={14} /></button>) : <div className="search-empty">没有找到匹配的客户、产品或指标</div>}</div>}</div><div className="period-wrap"><button className="period-btn" onClick={() => setPeriodOpen(!periodOpen)}><CalendarDays size={15} />{data.period}<ChevronDown size={14} /></button>{periodOpen && <div className="period-menu">{periodOptions.map((option) => <button key={option.value} className={period === option.value ? 'active' : ''} onClick={() => { setPeriod(option.value); setPeriodOpen(false) }}>{option.label}{period === option.value && <span>✓</span>}</button>)}</div>}</div><button className="icon-btn" title="导出订单明细 CSV" onClick={exportCsv}><Download size={16} /></button></div>}</header>
      <div className="page-wrap">{!isBrandPage && <><section className="welcome-row"><div><div className="eyebrow"><span className="live-dot" />经营简报 <span className="muted">· 数据截至 {data.asOfDate}</span></div><h1>早上好，林先生 <span className="wave">✦</span></h1><p>{data.company} · {data.period}经营情况，指标由订单、回款和现金流水明细汇总。</p></div><button className="report-btn" onClick={() => { setOpenChat(true); ask('下个月应该做什么？') }}><Sparkles size={15} />生成经营建议</button></section>
      <section className="metrics-grid">{metrics.map(({ label, value, change, note, icon: Icon, color, destination }) => <button className="metric-card metric-button" key={label} onClick={() => setTab(destination)} title={`查看${destination}`}><div className="metric-top"><span>{label}</span><div className={`metric-icon ${color}`}><Icon size={17} /></div></div><div className="metric-value">{value}</div><div className="metric-foot"><span className={`metric-change ${color}`}>{label.includes('应收') ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{change}</span><span>{note}</span></div></button>)}</section></>}

      {tab === '经营总览' && <>
        <section className="middle-grid"><article className="panel trend-panel"><div className="panel-heading"><div><h2>收入与毛利趋势</h2><p>按月汇总订单收入及直接成本</p></div><button className="select-small" onClick={() => { setPeriod('last6'); setPeriodOpen(false) }}>近6个月 <ChevronDown size={13} /></button></div><div className="legend"><span><i className="legend-blue" />营业收入</span><span><i className="legend-purple" />毛利</span><span className="chart-unit">单位：千元</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.monthly} margin={{ top: 10, right: 5, left: -18, bottom: 0 }}><defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4b73e8" stopOpacity={0.16} /><stop offset="100%" stopColor="#4b73e8" stopOpacity={0} /></linearGradient><linearGradient id="profit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9177ec" stopOpacity={0.12} /><stop offset="100%" stopColor="#9177ec" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0f5" strokeDasharray="3 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9299a7', fontSize: 12 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a7b2', fontSize: 11 }} /><Tooltip formatter={(v) => `${v.toFixed(0)} 千元`} contentStyle={{ border: '1px solid #edf0f5', borderRadius: 10, fontSize: 12 }} /><Area type="monotone" dataKey="revenue" name="营业收入" stroke="#4f74e8" strokeWidth={2.5} fill="url(#rev)" /><Area type="monotone" dataKey="profit" name="毛利" stroke="#9379e9" strokeWidth={2.5} fill="url(#profit)" /></AreaChart></ResponsiveContainer></div><div className="chart-insight"><span className="insight-spark"><Sparkles size={14} /></span><span>10月收入 <b>{money(data.reconciliation.revenue)}</b>，毛利率 <b>{data.summary.grossMargin}%</b>；图表来自月度经营汇总。</span><button onClick={() => { setOpenChat(true); ask('收入和毛利趋势说明了什么？') }}>查看分析 <ArrowRight size={13} /></button></div></article>
          <article className="panel insight-panel"><div className="panel-heading"><div className="title-icon"><Sparkles size={15} /></div><div><h2>参谋发现</h2><p>根据应收与现金明细识别的重点</p></div><button className="dots-btn" onClick={() => tell('指标来源：订单、回款记录、费用记录和现金流水。')}><MoreHorizontal size={18} /></button></div><div className="ai-summary"><span className="summary-label">本月经营摘要</span><p>本月收入 <b>{money(data.reconciliation.revenue)}</b>，毛利 <b>{money(data.reconciliation.grossProfit)}</b>。未收应收 <b>{money(data.reconciliation.receivables)}</b>，其中逾期 <b>{money(data.summary.receivablesOverdue)}</b>，建议先处理回款。</p></div><button className="mini-risk" onClick={() => setSelectedRisk(risks[0])}><div className="risk-mini-icon"><Wallet size={16} /></div><div><b>现金安全垫偏薄</b><span>账面余额 {money(data.cashLedger.closingBalance)} · 预测可支撑 {data.summary.cashRunway} 个月</span></div><span className="severity">需关注</span></button><button className="ask-link" onClick={() => setOpenChat(true)}><MessageCircle size={15} />和 AI 参谋聊聊 <ArrowRight size={14} /></button></article></section>
        <section className="bottom-grid"><CustomerPanel customers={customers.slice(0, 4)} onSelect={setSelectedCustomer} onAll={() => setTab('客户分析')} /><RiskPanel risks={risks.slice(0, 3)} onSelect={setSelectedRisk} onAll={() => setTab('风险预警')} /></section>
      </>}

      {tab === '客户分析' && <section className="panel full-panel"><div className="panel-heading"><div><h2>客户盈利分析</h2><p>按 {data.currentPeriod.slice(0, 4)}年{Number(data.currentPeriod.slice(5))}月订单计算；点击客户查看订单、成本与回款</p></div><span className="risk-count">{customers.length} 家客户</span></div><CustomerTable customers={customers} onSelect={setSelectedCustomer} /><div className="panel-subsection"><h3>产品盈利贡献</h3><div className="product-grid">{data.products.map((product) => <button className="product-card" key={product.id} onClick={() => tell(`${product.name}：收入 ${money(product.revenue)}，成本 ${money(product.cost)}，毛利 ${money(product.grossProfit)}`)}><span>{product.category}</span><b>{product.name}</b><strong>{money(product.grossProfit)}</strong><small>收入 {money(product.revenue)} · 毛利率 {product.margin}%</small></button>)}</div></div></section>}

      {tab === '现金流' && <section className="cash-view"><div className="cash-summary-grid"><div className="panel cash-summary-card"><span>月初现金</span><b>{money(data.cashLedger.openingBalance)}</b></div><div className="panel cash-summary-card"><span>本月回款</span><b className="positive">+{money(data.cashLedger.inflows)}</b></div><div className="panel cash-summary-card"><span>本月现金支出</span><b className="negative">−{money(data.cashLedger.outflows)}</b></div><div className="panel cash-summary-card"><span>期末现金</span><b>{money(data.cashLedger.closingBalance)}</b></div><div className="panel cash-summary-card"><span>采购成本未付</span><b>{money(data.reconciliation.supplierPayables)}</b></div></div><section className="panel"><div className="panel-heading"><div><h2>现金流水</h2><p>月初余额 + 客户回款 − 供应商及经营支出 = 期末余额</p></div><button className="text-link" onClick={exportCsv}>导出订单回款 <Download size={14} /></button></div><div className="ledger-list"><div className="ledger-head"><span>日期</span><span>类别 / 摘要</span><span>关联单据</span><span>金额</span><span>余额影响</span></div>{data.cashLedger.entries.map((entry) => <div className="ledger-row" key={entry.id}><span>{entry.date.slice(5)}</span><div><b>{entry.category}</b><small>{entry.description}</small></div><span>{entry.referenceId || '费用流水'}</span><b className={entry.type === 'inflow' ? 'positive' : 'negative'}>{entry.type === 'inflow' ? '+' : '−'}{money(entry.amount)}</b><span>{entry.type === 'inflow' ? '流入' : '流出'}</span></div>)}<div className="ledger-total"><b>期末现金余额</b><strong>{money(data.cashLedger.closingBalance)}</strong></div></div></section><section className="panel cash-note"><Wallet size={17} /><div><b>现金可支撑约 {data.summary.cashRunway} 个月</b><span>按未来三个月固定支出与计划采购的月均净现金消耗 {money(data.cashForecast.monthlyNetBurn)} 估算。采购成本 {money(data.reconciliation.cost)} 与本月现金采购付款 {money(data.reconciliation.supplierPayments)} 的差额 {money(data.reconciliation.supplierPayables)} 作为未付采购款展示。预测为演示假设。</span></div><button onClick={() => setSelectedRisk(risks[0])}>查看风险依据 <ArrowRight size={14} /></button></section></section>}

      {tab === '风险预警' && <section className="panel full-panel"><div className="panel-heading"><div><h2>经营风险与行动建议</h2><p>打开风险查看关联数据依据和建议动作</p></div><span className="risk-count">{risks.length} 项</span></div><div className="risk-list-full">{risks.map((risk) => <button className="risk-card-full" key={risk.id} onClick={() => setSelectedRisk(risk)}><div className={`risk-indicator ${risk.level}`} /><div className="risk-copy"><b>{risk.title}</b><span>{risk.detail}</span><em>建议：{risk.action}</em></div><ArrowRight size={16} /></button>)}</div></section>}

      {tab === '创始人' && <FounderPage onCompany={() => setTab('关于 OriginTech')} onDashboard={() => setTab('经营总览')} />}
      {tab === '关于 OriginTech' && <CompanyPage onFounder={() => setTab('创始人')} onDashboard={() => setTab('经营总览')} />}

      {!isBrandPage && <><section className="ask-bar"><div className="ask-avatar"><Bot size={17} /></div><div className="ask-copy"><b>有经营问题？问问你的 AI 参谋</b><span>回答引用订单、回款及现金流水汇总</span></div><div className="suggestions"><button onClick={() => { setOpenChat(true); ask('哪些客户最赚钱？') }}>哪些客户最赚钱？</button><button onClick={() => { setOpenChat(true); ask('现金会不会断？') }}>现金会不会断？</button><button onClick={() => { setOpenChat(true); ask('下个月应该做什么？') }}>下个月做什么？</button></div><button className="ask-open" onClick={() => setOpenChat(true)}><Command size={16} /></button></section><footer className="footer"><span>经营参谋 <i>·</i> 为每一个重要决策提供依据</span><span>演示数据，仅供产品体验</span></footer></>}</div>
    </main>

    {selectedCustomer && <CustomerModal customer={selectedCustomer} allOrders={allOrders} onClose={() => setSelectedCustomer(null)} />}
    {selectedRisk && <RiskModal risk={selectedRisk} data={data} onClose={() => setSelectedRisk(null)} onCustomer={(customer) => { setSelectedRisk(null); setSelectedCustomer(customer) }} />}
    {openChat && <div className="chat-overlay" onClick={(event) => { if (event.target === event.currentTarget) setOpenChat(false) }}><section className="chat-panel"><header className="chat-header"><div className="chat-header-icon"><Bot size={18} /></div><div><b>AI 经营参谋</b><span><i className="live-dot" />基于知行生活经营明细</span></div><button className="icon-btn" onClick={() => setOpenChat(false)}><X size={17} /></button></header><div className="chat-messages">{messages.length === 0 && <div className="chat-welcome"><div className="chat-welcome-icon"><Sparkles size={19} /></div><h3>你好，林先生</h3><p>你可以问我收入、客户利润、现金流风险，或下个月的经营重点。</p><div className="chat-prompts">{['哪些客户最赚钱？', '现金会不会断？', '下个月应该做什么？'].map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}<ArrowRight size={13} /></button>)}</div></div>}{messages.map((message, index) => <div className={`message ${message.role}`} key={`${index}-${message.text}`}>{message.role === 'assistant' && <div className="message-avatar"><Bot size={14} /></div>}<div className="bubble">{message.text}{message.source && <small className="message-source">{message.source}</small>}</div></div>)}{asking && <div className="message assistant"><div className="message-avatar"><Bot size={14} /></div><div className="bubble typing"><i /><i /><i /></div></div>}</div><form className="chat-input" onSubmit={(event) => { event.preventDefault(); ask() }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="问问经营数据…" /><button type="submit" disabled={!question.trim() || asking}><Send size={16} /></button></form><div className="chat-footnote">演示规则问答；数字来自订单、回款和现金流水汇总</div></section></div>}
    {toast && <div className="toast-message">{toast}</div>}
  </div>
}

function FounderPage({ onCompany, onDashboard }) {
  return <div className="brand-page founder-page">
    <section className="founder-hero"><div className="founder-copy"><span className="founder-eyebrow"><i /> ORIGINTECH · FOUNDER PROFILE</span><h1>Gary Yu<span>.</span></h1><h2>以工程思维构建<br />下一代智能商业软件</h2><p className="founder-lead">一位横跨金融科技、全栈软件与人工智能的技术专家，在纽约拥有十年工作经验，专注于把复杂系统转化为可靠、易用的产品。</p><div className="founder-tags"><span>AI Engineering</span><span>Financial Systems</span><span>Full-stack Software</span></div><div className="founder-actions"><button className="founder-primary" onClick={onCompany}>探索 OriginTech <ArrowRight size={15} /></button><button className="founder-secondary" onClick={onDashboard}>进入经营参谋</button></div><div className="founder-location"><MapPin size={14} /> New York · 10 years</div></div>
      <div className="portrait-stage"><div className="portrait-orbit orbit-one"/><div className="portrait-orbit orbit-two"/><div className="portrait-glow"/><div className="portrait-card"><span className="portrait-label">BUILDER · THINKER · ENGINEER</span><div className="portrait-art"><img src="/gary-yu-avatar.png" alt="Gary Yu 的职场卡通头像"/><span className="portrait-signature">GY</span></div><div className="portrait-caption"><div className="portrait-status"><i/>Building at the edge of AI & software</div><b>Technology should make hard things feel simple.</b></div></div><div className="portrait-float float-ai"><Sparkles size={15}/><span>AI × Engineering</span></div><div className="portrait-float float-finance"><Activity size={15}/><span>Financial Systems</span></div></div></section>
    <section className="founder-stats"><div><b>10<span>+</span></b><small>年纽约工作经验</small></div><div><b>4</b><small>金融系统工程经历</small></div><div><b>AI</b><small>工程与研究经历</small></div><div><b>2×MS</b><small>TAMU 双硕士</small></div></section>
    <section className="founder-detail-grid"><article className="founder-info-card education-card"><div className="section-eyebrow">EDUCATION</div><h3>工程训练，数学思维</h3><div className="education-entry"><div className="edu-mark hust-mark">华</div><div><b>华中科技大学</b><span>本科 · 工业工程</span></div><GraduationCap size={17}/></div><div className="education-entry"><div className="edu-mark tamu-mark">T</div><div><b>Texas A&amp;M University</b><span>硕士 · 工业工程 &amp; 数学（双硕士）</span></div><GraduationCap size={17}/></div></article><article className="founder-info-card experience-card"><div className="section-eyebrow">EXPERIENCE</div><h3>在金融系统与 AI 前沿之间</h3><div className="experience-entry"><span className="experience-node google-node"/><div><b>Google · AI Engineering &amp; Research</b><p>参与人工智能工程与研究工作，探索前沿能力如何转化为实际应用。</p></div></div><div className="experience-entry"><span className="experience-node finance-node"/><div><b>Goldman Sachs · Bloomberg · Verition</b><p>多年金融系统全栈研发经历，涵盖高要求、复杂业务场景下的软件系统建设。</p></div></div><div className="experience-entry"><span className="experience-node state-node"/><div><b>State Street · SWE</b><p>软件工程师经历，进一步积累金融科技系统的工程实践。</p></div></div><div className="experience-entry"><span className="experience-node teaching-node"/><div><b>软件编程教学</b><p>多年编程教学经验，善于将技术概念清晰拆解，并与不同背景的团队有效沟通。</p></div></div>
    </article></section>
    <section className="founder-quote"><Sparkles size={18}/><p>“好的技术，不只解决复杂问题，也让决策变得更清楚。”</p><span>GARY YU · ORIGINTECH</span></section>
  </div>
}

function CompanyPage({ onFounder, onDashboard }) {
  const capabilities = [
    { number: '01', title: 'AI 商业智能', text: '将企业经营数据转化为清晰的指标、异常洞察与有依据的决策建议。', label: 'AI BUSINESS INTELLIGENCE' },
    { number: '02', title: '企业级 AI 应用', text: '围绕真实工作场景构建智能助手，让 AI 能理解业务上下文并融入日常工作。', label: 'APPLIED AI' },
    { number: '03', title: '数据平台与分析', text: '连接分散的数据来源，建立一致的指标口径、分析模型与可追溯的数据视图。', label: 'DATA & ANALYTICS' },
    { number: '04', title: '软件工程与集成', text: '以全栈工程能力交付安全、可靠、可扩展的软件产品与系统集成方案。', label: 'SOFTWARE ENGINEERING' },
  ]
  return <div className="brand-page company-page">
    <section className="company-hero"><div className="company-hero-grid"/><div className="company-orb orb-a"/><div className="company-orb orb-b"/><div className="company-hero-content"><span className="company-overline"><i/> ORIGINTECH · COMPANY PROFILE</span><div className="origin-wordmark"><span className="origin-symbol">O<span/></span><span>Origin<b>Tech</b></span></div><h1>起源科技创新公司</h1><p className="company-tagline">让数据成为洞察，让智能驱动行动。</p><p className="company-description">OriginTech 是一家专注于人工智能、企业软件与数据智能的科技公司。我们将先进技术与扎实的软件工程结合，帮助企业连接数据、理解经营、优化流程，并更有信心地做出下一步决策。</p><div className="company-hero-actions"><button className="company-primary" onClick={onDashboard}>了解 AI 经营参谋 <ArrowRight size={15}/></button><button className="company-text-action" onClick={onFounder}>认识创始人 <ArrowRight size={14}/></button></div></div><div className="company-visual" aria-hidden="true"><div className="visual-ring ring-1"/><div className="visual-ring ring-2"/><div className="visual-center"><div className="visual-core"><Sparkles size={29}/></div><span>INTELLIGENCE<br/>IN MOTION</span></div><div className="visual-node node-one"><Activity size={16}/></div><div className="visual-node node-two"><Bot size={16}/></div><div className="visual-node node-three"><Building2 size={16}/></div><div className="visual-node node-four"><ArrowRight size={16}/></div></div></section>
    <section className="company-manifesto"><span className="section-eyebrow">OUR PURPOSE</span><h2>从复杂的数据与流程中，<br/><em>找到新的起点。</em></h2><p>我们相信，技术的价值在于让人看见更好的可能。OriginTech 以 AI、数据和软件工程为基础，打造能落地、能解释、能持续进化的数字化工具。</p></section>
    <section className="capabilities-section"><div className="capabilities-heading"><div><span className="section-eyebrow">WHAT WE BUILD</span><h2>把关键技术，做成真正有用的产品</h2></div><span>FROM INSIGHT<br/>TO IMPACT</span></div><div className="capabilities-grid">{capabilities.map((item) => <article className="capability-card" key={item.number}><span className="capability-number">{item.number}</span><span className="capability-label">{item.label}</span><h3>{item.title}</h3><p>{item.text}</p><div className="capability-line"/></article>)}</div></section>
    <section className="company-workflow"><div><span className="section-eyebrow">HOW WE WORK</span><h2>技术走完这四步，<br/>才真正产生价值。</h2><p>从接入信息到推动行动，OriginTech 关注完整链路，而不止是一个模型或一张报表。</p></div><div className="workflow-steps"><div><span>01</span><b>连接</b><small>打通数据与系统</small></div><i/><div><span>02</span><b>理解</b><small>建立业务上下文</small></div><i/><div><span>03</span><b>判断</b><small>发现机会与风险</small></div><i/><div><span>04</span><b>行动</b><small>让建议进入流程</small></div></div></section>
    <section className="company-cta"><div><span className="section-eyebrow">BUILT FOR WHAT'S NEXT</span><h2>每一次创新，<br/>都从一个更好的问题开始。</h2><p>了解我们的 AI 经营参谋 Demo，或认识 OriginTech 的创始人。</p></div><div className="company-cta-actions"><button className="company-primary" onClick={onDashboard}>查看产品 Demo <ArrowRight size={15}/></button><button className="company-cta-secondary" onClick={onFounder}>Gary Yu · 创始人</button></div></section>
  </div>
}

function AuthScreen({ mode, setMode, page, setPage, onLogin, onRegister, error, notice }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const showAuth = (nextMode) => { setPage('本源科技'); setMode(nextMode) }
  return <main className="public-auth-shell">
    <header className="public-header"><button className="public-brand" onClick={() => setPage('本源科技')}><span className="public-brand-mark">O</span><span>本源科技<small>ORIGINTECH · 起源科技创新公司</small></span></button><nav>{['本源科技', '公司简介', '创始人'].map((name) => <button key={name} className={page === name ? 'active' : ''} onClick={() => setPage(name)}>{name}</button>)}</nav><div className="public-header-auth"><button onClick={() => showAuth('login')}>登录</button><button onClick={() => showAuth('register')}>注册</button></div></header>
    {page === '本源科技' ? <div className="public-layout public-home-layout"><section className="public-home-copy"><span className="public-eyebrow">AI · DATA · SOFTWARE</span><h1>让数据成为洞察，<br/><em>让智能驱动行动。</em></h1><p>本源科技（起源科技创新公司，OriginTech）专注于人工智能、企业软件与数据智能，帮助企业连接经营数据、发现风险与机会，并把分析转化为清晰的行动建议。</p><div className="public-services"><span>AI 商业智能</span><span>企业 AI 应用</span><span>数据平台</span><span>软件工程</span></div><div className="public-home-points"><div><Sparkles size={17}/><b>接入数据</b><span>整合日常经营信息</span></div><div><Activity size={17}/><b>理解经营</b><span>自动计算指标与风险</span></div><div><ArrowRight size={17}/><b>推动行动</b><span>生成建议与经营报告</span></div></div><span className="public-home-note">欢迎体验 AI 经营参谋演示版</span></section><aside className="public-auth-column" id="access"><div className="public-auth-top"><span>BUSINESS COPILOT DEMO</span><div className="auth-logo-glyph"><Sparkles size={17}/></div></div><div className="auth-card"><div className="auth-heading"><div className="auth-icon">{mode === 'login' ? <LockKeyhole size={19} /> : <UserRound size={19} />}</div><h1>{mode === 'login' ? '欢迎回来' : '创建演示账号'}</h1><p>{mode === 'login' ? '登录后查看企业经营数据与 AI 分析' : '本演示只开放一个预设测试账号'}</p></div><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>登录</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button></div>
      {mode === 'login' ? <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onLogin(username, password) }}><label>用户名 / 邮箱<div className="auth-input"><UserRound size={15} /><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="lin@gmail.com" /></div></label><label>密码<div className="auth-input"><LockKeyhole size={15} /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" /></div></label><button className="auth-submit" type="submit">登录进入 Demo</button></form> : <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onRegister({ username: registerUsername, email, password: registerPassword, confirmPassword }) }}><label>邮箱<div className="auth-input"><Mail size={15} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="test@gmail.com" /></div></label><label>用户名<div className="auth-input"><UserRound size={15} /><input autoComplete="username" value={registerUsername} onChange={(event) => setRegisterUsername(event.target.value)} placeholder="lin@gmail.com" /></div></label><label>密码<div className="auth-input"><LockKeyhole size={15} /><input type="password" autoComplete="new-password" value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} placeholder="Lin123321#" /></div></label><label>确认密码<div className="auth-input"><LockKeyhole size={15} /><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" /></div></label><button className="auth-submit" type="submit">模拟注册</button></form>}
      {error && <div className="auth-feedback error" role="alert">{error}</div>}{notice && <div className="auth-feedback success" role="status">{notice}</div>}<div className="demo-account"><span>演示登录凭据</span><b>用户名：lin@gmail.com</b><b>密码：Lin123321#</b><b>邮箱：test@gmail.com</b></div><p className="auth-footnote">这是前端演示登录，不会创建真实账号或保存密码。</p></div><div className="auth-demo-note"><span className="live-dot"/>演示数据 · 登录后进入经营总览</div></aside></div> : <div className="public-brand-page"><div className="public-brand-page-heading"><span className="public-eyebrow">ORIGINTECH · {page === '公司简介' ? 'COMPANY' : 'FOUNDER'}</span><h1>{page}</h1></div>{page === '公司简介' ? <CompanyPage onFounder={() => setPage('创始人')} onDashboard={() => showAuth('login')} /> : <FounderPage onCompany={() => setPage('公司简介')} onDashboard={() => showAuth('login')} />}</div>}
    <footer className="public-footer"><span>本源科技 · OriginTech · 起源科技创新公司</span><span>Building at the edge of AI & software</span></footer>
  </main>
}

function CustomerPanel({ customers, onSelect, onAll }) {
  return <article className="panel customers-panel"><div className="panel-heading"><div><h2>利润贡献客户</h2><p>按本月毛利贡献排序 · 点击查看明细</p></div><button className="text-link" onClick={onAll}>查看全部 <ArrowRight size={14} /></button></div><CustomerTable customers={customers} onSelect={onSelect} compact /></article>
}

function CustomerTable({ customers, onSelect, compact = false }) {
  return <div className="customer-table"><div className="table-head"><span>客户</span><span>营业收入</span><span>直接成本</span><span>毛利贡献</span><span>毛利率</span></div>{customers.map((customer, index) => <button className="customer-row customer-row-button" key={customer.id} onClick={() => onSelect(customer)}><div className="customer-name"><div className={`customer-avatar c${index % 4}`}>{customer.name.slice(0, 1)}</div><div><b>{customer.name}</b><small>{customer.segment}{!compact && ` · ${customer.city}`}</small></div></div><b>{money(customer.revenue)}</b><b>{money(customer.cost)}</b><b>{money(customer.grossProfit)}</b><div className="margin-cell"><span className="margin-track"><i style={{ width: `${Math.min(customer.margin * 2, 100)}%` }} /></span>{customer.margin}%</div></button>)}</div>
}

function RiskPanel({ risks, onSelect, onAll }) {
  return <article className="panel risks-panel"><div className="panel-heading"><div><h2>风险提醒</h2><p>点击风险查看影响和依据</p></div><span className="risk-count">{risks.length} 项</span></div>{risks.map((risk) => <button className="risk-row risk-row-button" key={risk.id} onClick={() => onSelect(risk)}><div className={`risk-indicator ${risk.level}`} /><div className="risk-copy"><b>{risk.title}</b><span>{risk.action}</span></div><ArrowRight size={15} className="risk-arrow" /></button>)}<button className="risk-footer" onClick={onAll}>查看风险详情 <ArrowRight size={13} /></button></article>
}

function CustomerModal({ customer, allOrders, onClose }) {
  const orders = allOrders.filter((order) => order.customerId === customer.id)
  return <div className="detail-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="detail-modal"><header><div><span className="detail-kicker">客户经营档案 · {customer.segment}</span><h2>{customer.name}</h2><p>{customer.city} · 客户负责人：{customer.owner}</p></div><button className="icon-btn" onClick={onClose}><X size={17} /></button></header><div className="detail-stats"><div><span>订单收入</span><b>{money(customer.revenue)}</b></div><div><span>直接成本</span><b>{money(customer.cost)}</b></div><div><span>毛利贡献</span><b>{money(customer.grossProfit)}</b></div><div><span>毛利率</span><b>{customer.margin}%</b></div><div><span>未收应收</span><b>{money(customer.receivables)}</b></div></div><div className="detail-section-title">关联订单与回款</div><div className="detail-orders">{orders.map((order) => <div className="detail-order" key={order.id}><div><b>{order.id} · {order.productName}</b><small>{order.date}下单 · 到期 {order.dueDate}{order.overdue && <em>逾期</em>}</small></div><div><b>{money(order.amount)}</b><small>成本 {money(order.cost)}</small></div><div><b>{money(order.received)}</b><small>已回款</small></div><div><b>{money(order.outstanding)}</b><small>未收</small></div></div>)}</div><footer><span>收入、成本和应收均按关联订单及回款记录汇总。</span><button className="report-btn" onClick={onClose}>完成</button></footer></section></div>
}

function RiskModal({ risk, data, onClose, onCustomer }) {
  let sources = []
  if (risk.source === 'receivables') sources = data.orders.filter((order) => order.overdue || order.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding)
  else if (risk.source.startsWith('C')) sources = data.orders.filter((order) => order.customerId === risk.source)
  else if (risk.source.startsWith('EX')) sources = data.expenses.filter((entry) => entry.id === risk.source)
  else sources = data.cashLedger.entries.filter((entry) => entry.referenceId === risk.source || entry.id === risk.source)
  return <div className="detail-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="detail-modal risk-modal"><header><div><span className={`detail-kicker risk-level-${risk.level}`}>{risk.level === 'high' ? '高优先级' : risk.level === 'medium' ? '中优先级' : '观察项'}</span><h2>{risk.title}</h2><p>{risk.detail}</p></div><button className="icon-btn" onClick={onClose}><X size={17} /></button></header><div className="risk-action-box"><Sparkles size={16} /><div><b>建议行动</b><span>{risk.action}</span></div></div><div className="detail-section-title">关联数据依据</div>{risk.source === 'receivables' && <div className="risk-evidence"><div><span>未收应收总额</span><b>{money(data.reconciliation.receivables)}</b></div><div><span>逾期应收</span><b>{money(data.summary.receivablesOverdue)}</b></div><div><span>期末现金</span><b>{money(data.cashLedger.closingBalance)}</b></div><div><span>预测现金支撑</span><b>{data.summary.cashRunway}个月</b></div></div>}<div className="risk-source-list">{sources.map((source) => source.customerName ? <button key={source.id} onClick={() => { const customer = data.customers.find((item) => item.id === source.customerId); if (customer) onCustomer(customer) }}><span><b>{source.customerName} · {source.id}</b><small>{source.productName} · 到期日 {source.dueDate}{source.overdue ? ' · 逾期' : ''}</small></span><b>{money(source.outstanding)} 未收</b><ArrowRight size={14} /></button> : <div key={source.id} className="risk-source-expense"><span>{source.date} · {source.category || source.description}</span><b>{money(source.amount)}</b></div>)}</div><footer><span>风险数据可追溯到对应订单、回款或费用流水。</span><button className="report-btn" onClick={onClose}>关闭</button></footer></section></div>
}

export default App
