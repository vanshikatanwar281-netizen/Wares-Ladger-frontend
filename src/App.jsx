import { useState, useEffect, useMemo } from 'react';
import './index.css';

const API = 'http://localhost:5000';
const PALETTE = ['#2B6E68', '#8A5A34', '#B8860B', '#3A3A3A', '#7A4B8A', '#1E4F4B', '#A6432E', '#4A6FA5'];
const LOW_STOCK = 20;

const emptyForm = { name: '', category: '', price: '', stock: '', color: PALETTE[0], rating: 3 };

function Stars({ n }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i > n ? 'off' : ''}>★</span>
      ))}
    </div>
  );
}

function Toasts({ toasts }) {
  return (
    <div id="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={'toast' + (t.err ? ' err' : '')}>{t.msg}</div>
      ))}
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [activeCat, setActiveCat] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState('default');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErr, setFormErr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [toasts, setToasts] = useState([]);

  function toast(msg, err = false) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }

  async function loadProducts() {
    setStatus('loading');
    try {
      const res = await fetch(`${API}/products`);
      if (!res.ok) throw new Error();
      setProducts(await res.json());
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') closePanel(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeCat !== 'All') list = list.filter((p) => p.category === activeCat);
    if (searchTerm) list = list.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    switch (sortMode) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'stock-asc': list.sort((a, b) => a.stock - b.stock); break;
      case 'rating-desc': list.sort((a, b) => b.rating - a.rating); break;
      default: break;
    }
    return list;
  }, [products, activeCat, searchTerm, sortMode]);

  const stats = useMemo(() => ({
    count: products.length,
    units: products.reduce((s, p) => s + Number(p.stock), 0),
    value: products.reduce((s, p) => s + Number(p.price) * Number(p.stock), 0),
  }), [products]);

  function openPanel(product = null) {
    setEditingId(product ? product.id : null);
    setForm(product ? {
      name: product.name, category: product.category, price: product.price,
      stock: product.stock, color: product.color, rating: product.rating,
    } : { ...emptyForm, color: PALETTE[Math.floor(Math.random() * PALETTE.length)] });
    setFormErr(false);
    setPanelOpen(true);
  }
  function closePanel() { setPanelOpen(false); }

  async function saveEntry() {
    const { name, category, price, stock, color, rating } = form;
    if (!name.trim() || !category.trim() || price === '') { setFormErr(true); return; }

    const body = {
      name: name.trim(), category: category.trim(), price: Number(price),
      stock: stock === '' ? 0 : Number(stock), color, rating,
    };
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`${API}/products/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch(`${API}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setProducts((prev) => editingId ? prev.map((p) => (p.id === editingId ? saved : p)) : [...prev, saved]);
      toast(editingId ? 'Entry updated.' : 'New entry added to the ledger.');
      closePanel();
    } catch {
      toast('Could not save — check the server.', true);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(id) {
    try {
      const res = await fetch(`${API}/products/${id}`, { method: 'DELETE' });
      if (res.status !== 204) throw new Error();
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast('Item removed from the ledger.');
    } catch {
      toast('Could not delete — check the server.', true);
    } finally {
      setConfirmId(null);
    }
  }

  return (
    <>
      <header>
        <div className="masthead">
          <div>
            <h1>The Wares <em>Ledger</em></h1>
            <p className="tagline">A running record of what's on the shelf — stock, price and condition, at a glance.</p>
          </div>
          <div className="stats">
            <div className="stat"><span className="n">{status === 'ok' ? stats.count : '–'}</span><span className="l">items</span></div>
            <div className="stat"><span className="n">{status === 'ok' ? stats.units : '–'}</span><span className="l">units in stock</span></div>
            <div className="stat"><span className="n">{status === 'ok' ? `$${stats.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '–'}</span><span className="l">total value</span></div>
          </div>
        </div>
      </header>

      {status === 'error' && (
        <div id="connBanner" style={{ display: 'flex' }}>
          <span>Can't reach the server at <strong>localhost:5000</strong>. Make sure your backend is running.</span>
          <button onClick={loadProducts}>Retry</button>
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <input type="text" placeholder="Search wares by name…" value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="chips">
          {categories.map((c) => (
            <button key={c} className={'chip' + (c === activeCat ? ' active' : '')} onClick={() => setActiveCat(c)}>{c}</button>
          ))}
        </div>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
          <option value="default">Sort: Ledger order</option>
          <option value="name">Sort: Name A–Z</option>
          <option value="price-asc">Sort: Price low–high</option>
          <option value="price-desc">Sort: Price high–low</option>
          <option value="stock-asc">Sort: Stock low–high</option>
          <option value="rating-desc">Sort: Rating high–low</option>
        </select>
        <button className="newBtn" onClick={() => openPanel()}>+ New Entry</button>
      </div>

      {status === 'loading' && (
        <div id="grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" />)}
        </div>
      )}

      {status === 'ok' && filtered.length === 0 && (
        <div className="placeholder">
          {products.length === 0
            ? <><h2>The shelf is empty</h2><p>Add your first item with "New Entry".</p></>
            : <><h2>Nothing matches</h2><p>Try a different search or category.</p></>}
        </div>
      )}

      {status === 'ok' && filtered.length > 0 && (
        <div id="grid">
          {filtered.map((p) => {
            const low = p.stock < LOW_STOCK;
            const pct = Math.min(100, Math.round((p.stock / 60) * 100));
            return (
              <div key={p.id} className={'card' + (low ? ' low' : '')}>
                <div className="swatchRow">
                  <div className="swatch" style={{ background: p.color }} />
                  <span className="cat">{p.category}</span>
                </div>
                <p className="pname">{p.name}</p>
                <Stars n={p.rating} />
                <div className="priceRow">
                  <span className="price">${Number(p.price).toFixed(2)}</span>
                  <span className="stockWrap">{p.stock} in stock{low ? ' · low' : ''}</span>
                </div>
                <div className="stockBar"><i style={{ width: `${pct}%` }} /></div>
                {confirmId === p.id ? (
                  <div className="confirmRow">
                    Remove this item?
                    <button className="yes" onClick={() => doDelete(p.id)}>Yes</button>
                    <button className="no" onClick={() => setConfirmId(null)}>No</button>
                  </div>
                ) : (
                  <div className="cardActions">
                    <button className="iconBtn" onClick={() => openPanel(p)}>Edit</button>
                    <button className="iconBtn del" onClick={() => setConfirmId(p.id)}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={'overlay' + (panelOpen ? ' open' : '')} onClick={closePanel} />
      <div className={'panel' + (panelOpen ? ' open' : '')}>
        <button className="closeX" onClick={closePanel}>&times;</button>
        <h2>{editingId ? 'Edit Entry' : 'New Entry'}</h2>
        <p className="sub">{editingId ? `#${String(editingId).padStart(4, '0')}` : 'A fresh line in the ledger'}</p>

        <label>Name</label>
        <input type="text" placeholder="e.g. Enamel Camp Mug" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label>Category</label>
        <input type="text" placeholder="e.g. Kitchen" list="catList" value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <datalist id="catList">
          {[...new Set(products.map((p) => p.category))].map((c) => <option key={c} value={c} />)}
        </datalist>

        <label>Price ($)</label>
        <input type="number" min="0" step="0.01" value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })} />

        <label>Stock</label>
        <input type="number" min="0" step="1" value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })} />

        <label>Color</label>
        <div className="colorPick">
          {PALETTE.map((c) => (
            <div key={c} className={'colorDot' + (c === form.color ? ' sel' : '')} style={{ background: c }}
              onClick={() => setForm({ ...form, color: c })} />
          ))}
        </div>

        <label>Rating</label>
        <div className="ratingPick">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= form.rating ? 'on' : ''} onClick={() => setForm({ ...form, rating: n })}>★</span>
          ))}
        </div>

        {formErr && <p className="errText" style={{ display: 'block' }}>Name, category and price are required.</p>}

        <div className="panelActions">
          <button className="saveBtn" onClick={saveEntry} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</button>
          <button className="cancelBtn" onClick={closePanel}>Cancel</button>
        </div>
      </div>

      <Toasts toasts={toasts} />
    </>
  );
}
