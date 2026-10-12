import { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { get, post } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { inr, todayKey, shiftDay, fmtDay, fmtDayLong } from '../lib/format.js';
import { IconCash, IconQr, IconCard, IconReceipt } from '../components/Icons.jsx';

const PINK = '#D94F70';
const GOLD = '#C9A227';
const GREEN = '#2F7A4F';
const BROWN = '#6B4226';
const YELLOW = '#F2C14E';
const PIE_COLORS = [PINK, GOLD, GREEN, BROWN, YELLOW, '#E88BA6', '#8FBF9F', '#A98A5E'];
const EXP_CATS = ['kirana', 'vegetables', 'dairy', 'wages', 'rent', 'utilities', 'transport', 'other'];

const axisStyle = { fontSize: 11, fill: '#7A6A5F' };

function ChartCard({ title, subtitle, children, height = 240 }) {
  return (
    <div className="card chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        {subtitle && <span className="muted small">{subtitle}</span>}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: '#FFF8F1', border: '1px solid #EADFD3', borderRadius: 10, fontSize: 13 },
  labelStyle: { color: '#5C4033' },
};

// Cash vs QR vs card breakdown of collected revenue
function MethodMix({ methods }) {
  const { t } = useLang();
  const m = methods || {};
  const items = [
    { icon: IconCash, label: t('col_cash'), value: m.cash || 0, cls: 'cash' },
    { icon: IconQr, label: t('method_upi'), value: m.upi || 0, cls: 'upi' },
    { icon: IconCard, label: t('col_card'), value: m.card || 0, cls: 'card' },
    { icon: IconReceipt, label: t('method_other'), value: m.other || 0, cls: 'other' },
  ];
  return (
    <div className="method-strip">
      <span className="mix-title">{t('mk_title')}</span>
      {items.map((row) => {
        const RowIcon = row.icon;
        return (
          <div key={row.cls} className={`mix-item ${row.cls}`}>
            <span>
              <RowIcon size={15} /> {row.label}
            </span>
            <b>{inr(row.value)}</b>
          </div>
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const { can } = useAuth();
  const { t, dish } = useLang();
  const toast = useToast();
  const [mode, setMode] = useState('daily');
  const [day, setDay] = useState(todayKey());
  const [weekEnd, setWeekEnd] = useState(todayKey());
  const [year, setYear] = useState(new Date().getFullYear());
  const [daily, setDaily] = useState(null);
  const [closing, setClosing] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [yearly, setYearly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kept, setKept] = useState('0');
  const [withdrawn, setWithdrawn] = useState('0');
  const [closingBusy, setClosingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'daily') {
        const [d, c] = await Promise.all([
          get(`/api/analytics/daily?day=${day}`),
          get(`/api/closings/summary?day=${day}`),
        ]);
        setDaily(d);
        setClosing(c);
        const avail = c.today.cashAvailable;
        if (c.today.closing) {
          setKept(String(c.today.closing.closingCash ?? Math.max(0, avail - (c.today.closing.withdrawn || 0))));
          setWithdrawn(String(c.today.closing.withdrawn || 0));
        } else {
          setKept(String(Math.max(0, avail)));
          setWithdrawn(String(Math.min(Math.max(0, avail), Math.max(0, avail))));
        }
      } else if (mode === 'weekly') {
        setWeekly(await get(`/api/analytics/weekly?end=${weekEnd}`));
      } else {
        setYearly(await get(`/api/analytics/yearly?year=${year}`));
      }
    } catch (err) {
      if (err.status !== 0) toast.push(t('an_load_err', { err: err.message }), 'error');
    } finally {
      setLoading(false);
    }
  }, [mode, day, weekEnd, year, toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener('bfvr:refresh', onRefresh);
    return () => window.removeEventListener('bfvr:refresh', onRefresh);
  }, [load]);

  // linked inputs: available = opening + revenue − expenses; kept + withdrawn = available
  const avail = closing ? Math.max(0, closing.today.cashAvailable) : 0;
  const shortfall = closing ? closing.today.cashAvailable < 0 : false;

  const onKept = (vRaw) => {
    const v = Math.max(0, Number(vRaw) || 0);
    setKept(String(v));
    setWithdrawn(String(Math.max(0, avail - v)));
  };
  const onWithdrawn = (vRaw) => {
    const v = Math.max(0, Number(vRaw) || 0);
    setWithdrawn(String(v));
    setKept(String(Math.max(0, avail - v)));
  };

  const saveClosing = async () => {
    setClosingBusy(true);
    try {
      const body = avail >= 0 ? { day, closingCash: Number(kept) || 0 } : { day, withdrawn: 0 };
      await post('/api/closings', body, { label: `${t('c_save')} ${day}` });
      toast.push(t('c_saved'), 'success');
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setClosingBusy(false);
    }
  };

  const delta = (now, prev) => {
    if (!prev) return null;
    const pct = ((now - prev) / prev) * 100;
    if (!isFinite(pct)) return null;
    return pct;
  };

  const pieFor = (list) => list.map((e) => ({ name: t(`exp_${EXP_CATS.includes(e.category) ? e.category : 'other'}`), value: e.amount }));

  const renderDaily = () => {
    if (!daily || !closing) return null;
    const t0 = closing.today;
    const y = closing.yesterday;
    const revDelta = delta(t0.revenue, y.revenue);
    const pieData = pieFor(daily.expenseByCategory);

    return (
      <>
        <div className="stat-grid">
          <div className="stat-card pink">
            <span>{t('common_today')}{t('stat_revenue')}</span>
            <b>{inr(t0.revenue)}</b>
            <em className={revDelta != null && revDelta >= 0 ? 'up' : 'down'}>
              {revDelta != null
                ? `${revDelta >= 0 ? '▲' : '▼'} ${Math.abs(revDelta).toFixed(0)}% ${t('vs_prev')}`
                : t('first_day')}
            </em>
          </div>
          <div className="stat-card gold">
            <span>{t('common_today')}{t('stat_expenses')}</span>
            <b>{inr(t0.expenses)}</b>
            <em>{t('exp_count_hint', { n: t0.expenseCount })}</em>
          </div>
          <div className={`stat-card ${t0.net >= 0 ? 'green' : 'brown'}`}>
            <span>{t('stat_net')}</span>
            <b>{inr(t0.net)}</b>
            <em>{t('net_hint')}</em>
          </div>
          <div className="stat-card brown">
            <span>{t('stat_cash')}</span>
            <b>{inr(t0.closing ? t0.closingCash : t0.cashAvailable)}</b>
            <em>{t('cash_hint')}</em>
          </div>
        </div>

        <MethodMix methods={daily.methodTotals} />

        <div className="chart-grid">
          <ChartCard title={t('chart_hourly')} subtitle={t('chart_hourly_sub')} height={250}>
            <BarChart data={daily.hourly} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFE4D8" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip {...tooltipStyle} formatter={(v) => [inr(v), t('legend_revenue')]} />
              <Bar dataKey="revenue" fill={PINK} radius={[6, 6, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ChartCard>

          <ChartCard title={t('chart_pie')} subtitle={t('chart_pie_sub')} height={250}>
            {pieData.length === 0 ? (
              <div className="empty-state">{t('pie_empty')}</div>
            ) : (
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v, n) => [inr(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            )}
          </ChartCard>
        </div>

        <div className="chart-grid">
          <ChartCard title={t('chart_vs_prev')} subtitle={fmtDayLong(y.day)} height={210}>
            <BarChart
              data={[
                { name: t('legend_revenue'), d1: y.revenue, d2: t0.revenue },
                { name: t('legend_expenses'), d1: y.expenses, d2: t0.expenses },
                { name: t('legend_net'), d1: y.net, d2: t0.net },
              ]}
              margin={{ top: 8, right: 12, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EFE4D8" vertical={false} />
              <XAxis dataKey="name" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip {...tooltipStyle} formatter={(v) => inr(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="d1" name={t('legend_yesterday')} fill="#E7C9A9" radius={[5, 5, 0, 0]} maxBarSize={26} />
              <Bar dataKey="d2" name={t('legend_today')} fill={PINK} radius={[5, 5, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ChartCard>

          <div className="card">
            <div className="chart-head">
              <h3>{t('top_today')}</h3>
            </div>
            {daily.topDishes.length === 0 ? (
              <div className="empty-state">{t('no_bills_today')}</div>
            ) : (
              <ul className="top-list">
                {daily.topDishes.map((d, i) => (
                  <li key={d.name}>
                    <span className="rank">{i + 1}</span>
                    <span className="top-name">{dish(d)}</span>
                    <span className="muted">{t('sold_qty', { n: d.qty })}</span>
                    <b>{inr(d.revenue)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Day closing — next day starts with whatever is kept here (not a fixed float) */}
        <div className="card closing-card">
          <div className="chart-head">
            <h3>{t('closing_title')}</h3>
            <span className="muted small">{t('closing_hint')}</span>
          </div>
          <div className="closing-grid">
            <div>
              <span className="muted small">{t('c_opening')}</span>
              <b>{inr(t0.opening)}</b>
            </div>
            <div>
              <span className="muted small">{t('c_available')}</span>
              <b className={shortfall ? 'red' : 'green'}>{inr(t0.cashAvailable)}</b>
            </div>
            <div>
              <span className="muted small">{t('c_withdrawn')}</span>
              {can('closings:write') && !shortfall ? (
                <input type="number" min="0" max={avail} value={withdrawn} onChange={(e) => onWithdrawn(e.target.value)} />
              ) : (
                <b>{inr(t0.withdrawn)}</b>
              )}
            </div>
            <div>
              <span className="muted small">{t('c_kept')}</span>
              {can('closings:write') && !shortfall ? (
                <input type="number" min="0" max={avail} value={kept} onChange={(e) => onKept(e.target.value)} />
              ) : (
                <b>{inr(t0.closingCash)}</b>
              )}
            </div>
            {t0.closing && (
              <div>
                <span className="muted small">{t('c_recorded')}</span>
                <b>
                  {inr(t0.closing.withdrawn)} / {inr(t0.closing.closingCash ?? 0)}
                </b>
              </div>
            )}
            {can('closings:write') && (
              <div className="closing-action">
                <button className="btn btn-primary" disabled={closingBusy} onClick={saveClosing}>
                  {closingBusy ? t('c_saving') : t('c_save')}
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderWeekly = () => {
    if (!weekly) return null;
    const data = weekly.days.map((d) => ({ ...d, label: fmtDay(d.day) }));
    const pieData = pieFor(weekly.expenseByCategory);
    return (
      <>
        <div className="stat-grid">
          <div className="stat-card pink">
            <span>{t('wk_rev')}</span>
            <b>{inr(weekly.totals.revenue)}</b>
            <em>{fmtDay(weekly.start)} — {fmtDay(weekly.end)}</em>
          </div>
          <div className="stat-card gold">
            <span>{t('wk_exp')}</span>
            <b>{inr(weekly.totals.expenses)}</b>
            <em>{t('wk_avg', { amt: inr(Math.round(weekly.totals.expenses / 7)) })}</em>
          </div>
          <div className={`stat-card ${weekly.totals.net >= 0 ? 'green' : 'brown'}`}>
            <span>{t('wk_net')}</span>
            <b>{inr(weekly.totals.net)}</b>
            <em>{t('net_hint')}</em>
          </div>
          <div className="stat-card brown">
            <span>{t('wk_bills')}</span>
            <b>{weekly.totals.orders}</b>
            <em>{t('wk_billed')} {inr(weekly.totals.billed)}</em>
          </div>
        </div>

        <MethodMix methods={weekly.methodTotals} />

        <ChartCard title={t('wk_chart')} subtitle={t('chart_rev_vs_exp')} height={280}>
          <BarChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EFE4D8" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            <Tooltip {...tooltipStyle} formatter={(v) => inr(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue" name={t('legend_revenue')} fill={PINK} radius={[5, 5, 0, 0]} maxBarSize={30} />
            <Bar dataKey="expenses" name={t('legend_expenses')} fill={GOLD} radius={[5, 5, 0, 0]} maxBarSize={30} />
            <Bar dataKey="net" name={t('legend_net')} fill={GREEN} radius={[5, 5, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ChartCard>

        <div className="chart-grid">
          <div className="card">
            <div className="chart-head">
              <h3>{t('top_week')}</h3>
            </div>
            {weekly.topDishes.length === 0 ? (
              <div className="empty-state">{t('no_sales')}</div>
            ) : (
              <ul className="top-list">
                {weekly.topDishes.map((d, i) => (
                  <li key={d.name}>
                    <span className="rank">{i + 1}</span>
                    <span className="top-name">{dish(d)}</span>
                    <span className="muted">{t('sold_qty', { n: d.qty })}</span>
                    <b>{inr(d.revenue)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ChartCard title={t('chart_pie')} height={230}>
            {pieData.length === 0 ? (
              <div className="empty-state">{t('pie_empty')}</div>
            ) : (
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v, n) => [inr(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            )}
          </ChartCard>
        </div>

        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>{t('col_day')}</th>
                <th className="right">{t('legend_revenue')}</th>
                <th className="right">{t('col_cash')}</th>
                <th className="right">{t('col_qr')}</th>
                <th className="right">{t('legend_expenses')}</th>
                <th className="right">{t('legend_net')}</th>
              </tr>
            </thead>
            <tbody>
              {weekly.days.map((d) => (
                <tr key={d.day}>
                  <td>{fmtDay(d.day)}</td>
                  <td className="right">{inr(d.revenue)}</td>
                  <td className="right">{inr(d.methods?.cash || 0)}</td>
                  <td className="right">{inr(d.methods?.upi || 0)}</td>
                  <td className="right">{inr(d.expenses)}</td>
                  <td className="right">
                    <b>{inr(d.net)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderYearly = () => {
    if (!yearly) return null;
    const pieData = pieFor(yearly.expenseByCategory);
    return (
      <>
        <div className="stat-grid">
          <div className="stat-card pink">
            <span>{yearly.year} {t('yr_rev')}</span>
            <b>{inr(yearly.totals.revenue)}</b>
            <em>{t('yr_billed')} {inr(yearly.totals.billed)}</em>
          </div>
          <div className="stat-card gold">
            <span>{yearly.year} {t('yr_exp')}</span>
            <b>{inr(yearly.totals.expenses)}</b>
            <em>{t('yr_avg', { amt: inr(Math.round(yearly.totals.expenses / 12)) })}</em>
          </div>
          <div className={`stat-card ${yearly.totals.net >= 0 ? 'green' : 'brown'}`}>
            <span>{t('yr_net')}</span>
            <b>{inr(yearly.totals.net)}</b>
            <em>{t('net_hint')}</em>
          </div>
          <div className="stat-card brown">
            <span>{t('yr_bills')}</span>
            <b>{yearly.totals.orders}</b>
            <em>{t('yr_bill_avg', { n: Math.round(yearly.totals.orders / 12) })}</em>
          </div>
        </div>

        <MethodMix methods={yearly.methodTotals} />

        <ChartCard title={`${t('yr_chart')} — ${yearly.year}`} subtitle={t('yr_chart_sub')} height={300}>
          <BarChart data={yearly.months} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EFE4D8" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            <Tooltip {...tooltipStyle} formatter={(v) => inr(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue" name={t('legend_revenue')} fill={PINK} radius={[5, 5, 0, 0]} maxBarSize={26} />
            <Bar dataKey="expenses" name={t('legend_expenses')} fill={GOLD} radius={[5, 5, 0, 0]} maxBarSize={26} />
            <Bar dataKey="net" name={t('legend_net')} fill={GREEN} radius={[5, 5, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ChartCard>

        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>{t('col_month')}</th>
                <th className="right">{t('legend_revenue')}</th>
                <th className="right">{t('col_cash')}</th>
                <th className="right">{t('col_qr')}</th>
                <th className="right">{t('legend_expenses')}</th>
                <th className="right">{t('legend_net')}</th>
              </tr>
            </thead>
            <tbody>
              {yearly.months.map((mth) => (
                <tr key={mth.month}>
                  <td>{mth.label}</td>
                  <td className="right">{inr(mth.revenue)}</td>
                  <td className="right">{inr(mth.methods?.cash || 0)}</td>
                  <td className="right">{inr(mth.methods?.upi || 0)}</td>
                  <td className="right">{inr(mth.expenses)}</td>
                  <td className="right">
                    <b>{inr(mth.net)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-grid">
          <ChartCard title={t('chart_pie')} subtitle={String(yearly.year)} height={240}>
            {pieData.length === 0 ? (
              <div className="empty-state">{t('pie_empty')}</div>
            ) : (
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v, n) => [inr(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            )}
          </ChartCard>

          <div className="card">
            <div className="chart-head">
              <h3>{t('top_year')}</h3>
            </div>
            {yearly.topDishes.length === 0 ? (
              <div className="empty-state">{t('no_sales')}</div>
            ) : (
              <ul className="top-list">
                {yearly.topDishes.map((d, i) => (
                  <li key={d.name}>
                    <span className="rank">{i + 1}</span>
                    <span className="top-name">{dish(d)}</span>
                    <span className="muted">{t('sold_qty', { n: d.qty })}</span>
                    <b>{inr(d.revenue)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div>
      <div className="page-head">
        <h2>{t('an_title')}</h2>
        <div className="seg">
          {[
            { key: 'daily', labelKey: 'an_daily' },
            { key: 'weekly', labelKey: 'an_weekly' },
            { key: 'yearly', labelKey: 'an_yearly' },
          ].map((m) => (
            <button key={m.key} className={mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)}>
              {t(m.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-bar">
        {mode === 'daily' && (
          <div className="date-nav">
            <button className="btn btn-sm" onClick={() => setDay((d) => shiftDay(d, -1))}>◀</button>
            <b>{fmtDayLong(day)}</b>
            <button className="btn btn-sm" onClick={() => setDay((d) => shiftDay(d, 1))} disabled={day >= todayKey()}>▶</button>
            {day !== todayKey() && (
              <button className="btn btn-sm btn-outline" onClick={() => setDay(todayKey())}>{t('common_today')}</button>
            )}
          </div>
        )}
        {mode === 'weekly' && (
          <div className="date-nav">
            <button className="btn btn-sm" onClick={() => setWeekEnd((d) => shiftDay(d, -7))}>◀</button>
            <b>{fmtDay(shiftDay(weekEnd, -6))} — {fmtDay(weekEnd)}</b>
            <button className="btn btn-sm" onClick={() => setWeekEnd((d) => shiftDay(d, 7))} disabled={weekEnd >= todayKey()}>▶</button>
            <button className="btn btn-sm btn-outline" onClick={() => setWeekEnd(todayKey())}>{t('an_this_week')}</button>
          </div>
        )}
        {mode === 'yearly' && (
          <div className="date-nav">
            <button className="btn btn-sm" onClick={() => setYear((y) => y - 1)}>◀</button>
            <b>{year}</b>
            <button className="btn btn-sm" onClick={() => setYear((y) => y + 1)} disabled={year >= new Date().getFullYear()}>▶</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card empty-state">{t('an_loading')}</div>
      ) : mode === 'daily' ? (
        renderDaily()
      ) : mode === 'weekly' ? (
        renderWeekly()
      ) : (
        renderYearly()
      )}
    </div>
  );
}
