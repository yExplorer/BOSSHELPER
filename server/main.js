import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const port = Number(process.env.PORT || 8000)
const dataPath = resolve(dirname(fileURLToPath(import.meta.url)), 'data/business.json')
async function loadSource() {
  return JSON.parse(await readFile(dataPath, 'utf8'))
}

function buildOverview(source, selectedPeriod = 'last6') {
  const receiptsByOrder = new Map()
  for (const receipt of source.receipts) receiptsByOrder.set(receipt.orderId, (receiptsByOrder.get(receipt.orderId) || 0) + receipt.amount)

  const currentOrders = source.orders.filter((order) => order.date.startsWith(source.currentPeriod))
  const totalRevenue = currentOrders.reduce((sum, order) => sum + order.amount, 0)
  const totalCost = currentOrders.reduce((sum, order) => sum + order.cost, 0)
  const grossProfit = totalRevenue - totalCost
  const totalReceipts = source.receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
  const receivableOrders = currentOrders.map((order) => {
    const received = receiptsByOrder.get(order.id) || 0
    const outstanding = Math.max(0, order.amount - received)
    const customer = source.customers.find((item) => item.id === order.customerId)
    const product = source.products.find((item) => item.id === order.productId)
    return { ...order, customerName: customer?.name || '未知客户', productName: product?.name || '未知产品', received, outstanding, overdue: outstanding > 0 && order.dueDate < source.asOfDate }
  })
  const receivables = receivableOrders.reduce((sum, order) => sum + order.outstanding, 0)
  const overdue = receivableOrders.filter((order) => order.overdue).reduce((sum, order) => sum + order.outstanding, 0)

  const customers = source.customers.map((customer) => {
    const orders = currentOrders.filter((order) => order.customerId === customer.id)
    const revenue = orders.reduce((sum, order) => sum + order.amount, 0)
    const cost = orders.reduce((sum, order) => sum + order.cost, 0)
    const customerReceivables = receivableOrders.filter((order) => order.customerId === customer.id).reduce((sum, order) => sum + order.outstanding, 0)
    const customerOverdue = receivableOrders.filter((order) => order.customerId === customer.id && order.overdue).reduce((sum, order) => sum + order.outstanding, 0)
    return { ...customer, revenue, cost, grossProfit: revenue - cost, margin: revenue ? Math.round((revenue - cost) / revenue * 1000) / 10 : 0, receivables: customerReceivables, overdue: customerOverdue, orders: orders.length }
  }).filter((customer) => customer.revenue > 0).sort((a, b) => b.grossProfit - a.grossProfit)

  const products = source.products.map((product) => {
    const orders = currentOrders.filter((order) => order.productId === product.id)
    const revenue = orders.reduce((sum, order) => sum + order.amount, 0)
    const cost = orders.reduce((sum, order) => sum + order.cost, 0)
    return { ...product, revenue, cost, grossProfit: revenue - cost, margin: revenue ? Math.round((revenue - cost) / revenue * 1000) / 10 : 0 }
  }).filter((product) => product.revenue > 0).sort((a, b) => b.grossProfit - a.grossProfit)

  const cashIn = source.cashLedger.entries.filter((entry) => entry.type === 'inflow').reduce((sum, entry) => sum + entry.amount, 0)
  const cashOut = source.cashLedger.entries.filter((entry) => entry.type === 'outflow').reduce((sum, entry) => sum + entry.amount, 0)
  const supplierPayments = source.cashLedger.entries.filter((entry) => entry.type === 'outflow' && entry.category === '供应商货款').reduce((sum, entry) => sum + entry.amount, 0)
  const cashBalance = source.cashLedger.openingBalance + cashIn - cashOut
  const expensesTotal = source.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const monthly = [...source.monthlyHistory, { period: source.currentPeriod, revenue: totalRevenue, grossProfit, cashBalance, receivables, receivablesOverdue: overdue }]
  const prior = monthly.find((item) => item.period === '2026-09')
  const comparison = (a, b) => b ? Math.round((a / b - 1) * 1000) / 10 : 0

  let summary
  let periodLabel
  if (selectedPeriod === 'last6') {
    const range = monthly.slice(-6)
    summary = {
      revenue: range.reduce((sum, item) => sum + item.revenue, 0),
      grossProfit: range.reduce((sum, item) => sum + item.grossProfit, 0),
      grossMargin: Math.round(range.reduce((sum, item) => sum + item.grossProfit, 0) / range.reduce((sum, item) => sum + item.revenue, 0) * 1000) / 10,
      cashBalance,
      cashRunway: Math.round(cashBalance / source.cashForecast.monthlyNetBurn * 10) / 10,
      receivables,
      receivablesOverdue: overdue,
      revenueChange: comparison(totalRevenue, prior?.revenue),
      comparisonLabel: '10月较上月'
    }
    periodLabel = '近6个月'
  } else {
    const record = monthly.find((item) => item.period === selectedPeriod) || monthly.at(-1)
    const prev = monthly.find((item) => item.period === monthly[monthly.indexOf(record) - 1]?.period)
    summary = {
      revenue: record.revenue,
      grossProfit: record.grossProfit,
      grossMargin: record.revenue ? Math.round(record.grossProfit / record.revenue * 1000) / 10 : 0,
      cashBalance: record.cashBalance,
      cashRunway: Math.round(record.cashBalance / source.cashForecast.monthlyNetBurn * 10) / 10,
      receivables: record.receivables,
      receivablesOverdue: record.receivablesOverdue,
      revenueChange: comparison(record.revenue, prev?.revenue),
      comparisonLabel: '较上月'
    }
    periodLabel = `${record.period.slice(0, 4)}年${Number(record.period.slice(5))}月`
  }

  return {
    company: source.company,
    period: periodLabel,
    selectedPeriod,
    currentPeriod: source.currentPeriod,
    asOfDate: source.asOfDate,
    summary,
    monthly: monthly.map((item) => ({ month: `${Number(item.period.slice(5))}月`, revenue: item.revenue / 1000, profit: item.grossProfit / 1000, cash: item.cashBalance / 1000 })),
    customers,
    products,
    orders: receivableOrders,
    receipts: source.receipts,
    expenses: source.expenses,
    expensesTotal,
    cashLedger: { openingBalance: source.cashLedger.openingBalance, entries: source.cashLedger.entries, inflows: cashIn, outflows: cashOut, closingBalance: cashBalance },
    cashForecast: source.cashForecast,
    risks: source.risks,
    reconciliation: { revenue: totalRevenue, cost: totalCost, grossProfit, receipts: totalReceipts, receivables, supplierPayments, supplierPayables: totalCost - supplierPayments, openingCash: source.cashLedger.openingBalance, cashIn, cashOut, closingCash: cashBalance }
  }
}

function answerQuestion(question, data) {
  const top = data.customers[0]
  if (['现金', '断', '资金', '回款'].some((word) => question.includes(word))) {
    return `当前现金余额约 ${(data.cashLedger.closingBalance / 10000).toFixed(1)} 万元，按预测月均净现金消耗 ${(data.cashForecast.monthlyNetBurn / 10000).toFixed(1)} 万元估算，可支撑约 ${data.summary.cashRunway} 个月。应收 ${(data.reconciliation.receivables / 10000).toFixed(1)} 万元，其中逾期 ${(data.reconciliation.receivables > 0 ? data.orders.filter((order) => order.overdue).reduce((sum, order) => sum + order.outstanding, 0) / 10000 : 0).toFixed(1)} 万元；建议优先跟进远帆百货和嘉木家居。`
  }
  if (['客户', '赚钱', '利润'].some((word) => question.includes(word))) {
    return `本月利润贡献最高的是${top.name}，收入 ${(top.revenue / 10000).toFixed(1)} 万元，直接成本 ${(top.cost / 10000).toFixed(1)} 万元，毛利 ${(top.grossProfit / 10000).toFixed(1)} 万元，毛利率 ${top.margin}%。这项结果由订单明细汇总。`
  }
  if (['产品'].some((word) => question.includes(word))) {
    const product = data.products[0]
    return `本月毛利贡献最高的产品是${product.name}，收入 ${(product.revenue / 10000).toFixed(1)} 万元，成本 ${(product.cost / 10000).toFixed(1)} 万元，毛利率 ${product.margin}%。`
  }
  if (['下个月', '建议', '做什么', '行动'].some((word) => question.includes(word))) {
    return `下月建议优先做三件事：①跟进 ${data.summary.receivablesOverdue / 10000} 万元逾期应收；②复核嘉木家居折扣与履约成本；③检查 1.9 万元营销支出的渠道回报。收入、毛利和现金数字均来自当前演示账目。`
  }
  return `本月收入 ${(data.reconciliation.revenue / 10000).toFixed(1)} 万元，直接成本 ${(data.reconciliation.cost / 10000).toFixed(1)} 万元，毛利 ${(data.reconciliation.grossProfit / 10000).toFixed(1)} 万元。回款 ${(data.reconciliation.receipts / 10000).toFixed(1)} 万元，期末现金 ${(data.reconciliation.closingCash / 10000).toFixed(1)} 万元。你可以继续问客户、产品、现金或下月行动。`
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
    if (request.method === 'GET' && url.pathname === '/api/overview') {
      sendJson(response, 200, buildOverview(await loadSource(), url.searchParams.get('period') || 'last6'))
      return
    }
    if (request.method === 'POST' && url.pathname === '/api/ask') {
      let body = ''
      for await (const chunk of request) body += chunk
      const question = String(JSON.parse(body || '{}').question || '').trim()
      const data = buildOverview(await loadSource(), '2026-10')
      sendJson(response, 200, { question, answer: answerQuestion(question, data), source: '基于订单、回款与现金流水明细汇总' })
      return
    }
    sendJson(response, 404, { error: '接口不存在' })
  } catch (error) {
    console.error(error)
    sendJson(response, 500, { error: '读取经营数据失败' })
  }
})

server.listen(port, () => console.log(`经营参谋 API 已启动：http://localhost:${port}`))
