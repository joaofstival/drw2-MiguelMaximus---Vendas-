// scripts.js — comportamento do catálogo, carrinho e checkout
// scripts.js — mock API + catálogo, carrinho, admin e acessibilidade

// Mock backend usando fetch interception simples
const MockAPI = (() => {
  const STORAGE_KEY = 'mock_products_v1';
  function load(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
    const initial = [
      {id:1,name:'Caderno Universitário 10x1 - 200 páginas',price:18.9,category:'papelaria',meta:'200 folhas, capa dura',stock:12,sku:'CAD-001'},
      {id:2,name:'Lápis HB (unidade)',price:1.5,category:'papelaria',meta:'Grafite macio',stock:120,sku:'LAP-HB'},
      {id:3,name:'Caneta esferográfica preta',price:2.9,category:'papelaria',meta:'Ponta 0.7mm',stock:80,sku:'CAN-PT'},
      {id:4,name:'Mochila escolar resistente',price:129.0,category:'mochilas',meta:'Grande, alças acolchoadas',stock:7,sku:'MOC-XL'},
      {id:5,name:'Estojo com zíper',price:29.9,category:'papelaria',meta:'Compartimentos para canetas',stock:30,sku:'EST-01'}
    ];
    localStorage.setItem(STORAGE_KEY,JSON.stringify(initial));
    return initial;
  }
  function save(all){localStorage.setItem(STORAGE_KEY,JSON.stringify(all));}

  // intercept fetch to /api/products
  async function fetcher(url, options={}){
    const method = (options.method||'GET').toUpperCase();
    const parts = url.split('?')[0].split('/').filter(Boolean);
    // /api/products or /api/products/:id or /api/coupon
    if(url.startsWith('/api/products')){
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(load()));
      const id = parts[parts.length-1] && Number(parts[parts.length-1]);
      if(method==='GET'){
        if(!isNaN(id)) return {status:200,json:()=>all.find(p=>p.id===id)};
        return {status:200,json:()=>all};
      }
      if(method==='POST'){
        const body = JSON.parse(options.body||'{}');
        const nid = all.reduce((m,x)=>Math.max(m,x.id),0)+1; body.id=nid; all.push(body); save(all); return {status:201,json:()=>body};
      }
      if(method==='PUT'){
        const body = JSON.parse(options.body||'{}');
        const idx = all.findIndex(x=>x.id===body.id); if(idx===-1) return {status:404}; all[idx]=body; save(all); return {status:200,json:()=>body};
      }
      if(method==='DELETE'){
        const idx = all.findIndex(x=>x.id===id); if(idx===-1) return {status:404}; all.splice(idx,1); save(all); return {status:204};
      }
    }
    if(url.startsWith('/api/coupon')){
      const body = JSON.parse(options.body||'{}');
      if(body.code && body.code.toUpperCase()==='ALUNO10') return {status:200,json:()=>({code:'ALUNO10',discount:0.10,message:'10% off aplicado'})};
      return {status:400,json:()=>({error:'Cupom inválido'})};
    }
    // fallback to real fetch for other URLs (like assets)
    return window.fetch(url,options);
  }

  return {load,fetcher};
})();

// App
window.addEventListener('DOMContentLoaded', async ()=>{
  // Elements
  const productsEl = document.getElementById('products');
  const cartListEl = document.getElementById('cartList');
  const totalPriceEl = document.getElementById('totalPrice');
  const cartCountEl = document.getElementById('cartCount');
  const drawerList = document.getElementById('drawerList');
  const drawerSubtotal = document.getElementById('drawerSubtotal');
  const drawer = document.getElementById('cartDrawer');
  const cartToggle = document.getElementById('cartToggle');
  const closeDrawer = document.getElementById('closeDrawer');
  const applyCouponBtn = document.getElementById('applyCoupon');
  const couponInput = document.getElementById('coupon');
  const drawerCouponMsg = document.getElementById('drawerCouponMsg');
  const drawerCheckout = document.getElementById('drawerCheckout');

  const searchEl = document.getElementById('search');
  const categoryFilterEl = document.getElementById('categoryFilter');
  const sortEl = document.getElementById('sort');
  const clearFiltersBtn = document.getElementById('clearFilters');

  const productForm = document.getElementById('productForm');
  const adminMsg = document.getElementById('adminMsg');

  // State
  let products = JSON.parse(localStorage.getItem('mock_products_v1')||'null') || MockAPI.load();
  let cart = JSON.parse(localStorage.getItem('cart_vendas')) || {};
  let appliedCoupon = null;

  function formatBRL(v){return 'R$ '+v.toFixed(2).replace('.',',')}

  // Fetch wrapper
  async function apiFetch(path,opts) { return MockAPI.fetcher(path,opts); }

  // Render
  function renderProducts(){
    const q = (searchEl.value||'').trim().toLowerCase();
    const cat = categoryFilterEl.value;
    let items = products.filter(p=> (cat==='all'||p.category===cat) && (p.name.toLowerCase().includes(q)||(p.meta||'').toLowerCase().includes(q)) );
    const sort = sortEl.value;
    if(sort==='price-asc') items.sort((a,b)=>a.price-b.price);
    if(sort==='price-desc') items.sort((a,b)=>b.price-a.price);
    if(sort==='name-asc') items.sort((a,b)=>a.name.localeCompare(b.name));
    if(sort==='name-desc') items.sort((a,b)=>b.name.localeCompare(a.name));

    productsEl.innerHTML='';
    for(const p of items){
      const card = document.createElement('div');card.className='card';
      card.innerHTML = `
        <div class="thumb"><img src="assets/product-${p.id}.svg" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;border-radius:8px"/></div>
        <div class="title">${p.name}</div>
        <div class="meta">${p.meta||''} | Estoque: ${p.stock||0}</div>
        <div class="price">${formatBRL(p.price)}</div>
        <div style="display:flex;gap:8px;margin-top:auto">
          <button data-id="${p.id}" class="addBtn">Adicionar</button>
          <button data-id="${p.id}" class="editBtn">Editar</button>
        </div>
      `;
      card.querySelector('.addBtn').addEventListener('click',()=> addToCart(p.id));
      card.querySelector('.editBtn').addEventListener('click',()=> loadProductToForm(p));
      productsEl.appendChild(card);
    }
    if(items.length===0) productsEl.innerHTML='<div class="empty">Nenhum produto encontrado</div>';
  }

  function saveCart(){ localStorage.setItem('cart_vendas',JSON.stringify(cart)); }

  function addToCart(id){ const prod = products.find(p=>p.id==id); if(!prod) return; cart[id] = (cart[id]||0)+1; saveCart(); renderCart(); }
  function changeQty(id,delta){ cart[id] = (cart[id]||0)+delta; if(cart[id]<=0) delete cart[id]; saveCart(); renderCart(); }
  function removeItem(id){ delete cart[id]; saveCart(); renderCart(); }
  function clearCart(){ cart={}; saveCart(); renderCart(); }

  function renderCart(){
    cartListEl.innerHTML=''; drawerList.innerHTML='';
    const keys = Object.keys(cart);
    if(keys.length===0){ cartListEl.innerHTML='<div class="empty">Seu carrinho está vazio</div>'; drawerList.innerHTML='<div class="empty">Carrinho vazio</div>'; totalPriceEl.textContent='R$ 0,00'; drawerSubtotal.textContent='R$ 0,00'; cartCountEl.textContent='0'; return }
    let total=0; let count=0;
    for(const id of keys){ const p = products.find(x=>x.id==id); const qty=cart[id]; total+=p.price*qty; count+=qty;
      const item = document.createElement('div'); item.className='cart-item';
      item.innerHTML = `
        <div class="ci-thumb"><img src="assets/product-${p.id}.svg" alt="${p.name}" style="width:44px;height:44px;object-fit:contain;border-radius:6px"/></div>
        <div style="flex:1">
          <div style="font-weight:600">${p.name}</div>
          <div class="meta">${formatBRL(p.price)} x ${qty}</div>
        </div>
        <div class="qty">
          <button data-action="dec" data-id="${id}">-</button>
          <div>${qty}</div>
          <button data-action="inc" data-id="${id}">+</button>
          <button data-action="rm" data-id="${id}">✕</button>
        </div>
      `;
      cartListEl.appendChild(item);
      // drawer
      const ditem = item.cloneNode(true); drawerList.appendChild(ditem);
    }
    const finalTotal = appliedCoupon ? total*(1-appliedCoupon.discount) : total;
    totalPriceEl.textContent = formatBRL(finalTotal);
    drawerSubtotal.textContent = formatBRL(finalTotal);
    cartCountEl.textContent = String(Object.values(cart).reduce((s,x)=>s+x,0));

    // attach handlers
    cartListEl.querySelectorAll('button[data-action]').forEach(b=>{ const id=b.dataset.id; const act=b.dataset.action; b.addEventListener('click',()=>{ if(act==='inc') changeQty(id,1); if(act==='dec') changeQty(id,-1); if(act==='rm') removeItem(id); }); });
    drawerList.querySelectorAll('button[data-action]').forEach(b=>{ const id=b.dataset.id; const act=b.dataset.action; b.addEventListener('click',()=>{ if(act==='inc') changeQty(id,1); if(act==='dec') changeQty(id,-1); if(act==='rm') removeItem(id); }); });
  }

  // Drawer open/close
  function openDrawer(){ drawer.setAttribute('aria-hidden','false'); cartToggle.setAttribute('aria-pressed','true'); }
  function closeDrawerFn(){ drawer.setAttribute('aria-hidden','true'); cartToggle.setAttribute('aria-pressed','false'); }
  cartToggle.addEventListener('click', ()=>{ const hidden = drawer.getAttribute('aria-hidden')==='true'; if(hidden) openDrawer(); else closeDrawerFn(); });
  closeDrawer.addEventListener('click', closeDrawerFn);
  drawer.querySelector('.drawer-backdrop').addEventListener('click', closeDrawerFn);

  // Keyboard accessibility: close drawer with Escape, trap focus minimally
  document.addEventListener('keydown', (ev)=>{
    if(ev.key === 'Escape'){
      if(drawer.getAttribute('aria-hidden')==='false') closeDrawerFn();
    }
  });

  // When opening drawer, move focus to the first focusable element inside
  function focusFirstInDrawer(){
    const focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if(focusable.length) focusable[0].focus();
  }
  const originalOpenDrawer = openDrawer;
  openDrawer = ()=>{ drawer.setAttribute('aria-hidden','false'); cartToggle.setAttribute('aria-pressed','true'); focusFirstInDrawer(); };

  // Coupon
  applyCouponBtn.addEventListener('click', async ()=>{
    const code = (couponInput.value||'').trim(); if(!code) return drawerCouponMsg.textContent='Informe um cupom';
    const res = await apiFetch('/api/coupon',{method:'POST',body:JSON.stringify({code})});
  if(res.status===200){ const data = await res.json(); appliedCoupon = data; drawerCouponMsg.textContent = data.message; renderCart(); } else { const err = await res.json(); drawerCouponMsg.textContent = err.error || 'Inválido'; }
  });

  // Checkout drawer
  drawerCheckout.addEventListener('click', ()=>{ alert('Checkout simulado — obrigado!'); clearCart(); closeDrawerFn(); });

  // Admin form handlers (CRUD via mock fetch)
  function validateProductPayload(payload){ const errors=[]; if(!payload.name||payload.name.length<3||payload.name.length>60) errors.push('Nome deve ter 3–60 caracteres'); if(!(payload.price>=0.01)) errors.push('Preço mínimo 0.01'); if(!(Number.isInteger(payload.stock) && payload.stock>=0)) errors.push('Estoque deve ser inteiro >= 0'); if(!payload.category) errors.push('Categoria obrigatória'); return errors; }

  async function saveProduct(){
    const payload = {
      id: Number(document.getElementById('p_sku').dataset.editId) || undefined,
      name: document.getElementById('p_name').value.trim(),
      meta: document.getElementById('p_desc').value.trim(),
      price: parseFloat(document.getElementById('p_price').value),
      stock: parseInt(document.getElementById('p_stock').value,10),
      category: document.getElementById('p_category').value,
      sku: document.getElementById('p_sku').value.trim()
    };
    const errors = validateProductPayload(payload); if(errors.length){ adminMsg.textContent = errors.join('; '); return }
    if(payload.id){ // update
      const res = await apiFetch('/api/products',{method:'PUT',body:JSON.stringify(payload)});
      if(res.status===200){ const updated = await res.json(); products = products.map(p=>p.id===updated.id?updated:p); adminMsg.textContent='Produto atualizado'; }
    } else { // create
      const res = await apiFetch('/api/products',{method:'POST',body:JSON.stringify(payload)});
      if(res.status===201){ const created = await res.json(); products.push(created); adminMsg.textContent='Produto criado'; }
    }
    productForm.reset(); delete document.getElementById('p_sku').dataset.editId; renderProducts();
  }

  function loadProductToForm(p){ document.getElementById('p_name').value=p.name; document.getElementById('p_desc').value=p.meta||''; document.getElementById('p_price').value=p.price; document.getElementById('p_stock').value=p.stock||0; document.getElementById('p_category').value=p.category||'papelaria'; document.getElementById('p_sku').value=p.sku||''; document.getElementById('p_sku').dataset.editId = p.id; adminMsg.textContent='Editando produto ID '+p.id; window.scrollTo({top:document.getElementById('admin').offsetTop,behavior:'smooth'}); }

  document.getElementById('saveProduct').addEventListener('click', saveProduct);
  document.getElementById('resetProduct').addEventListener('click', ()=>{ productForm.reset(); delete document.getElementById('p_sku').dataset.editId; adminMsg.textContent=''; });

  // Ensure important controls have ARIA labels and are keyboard-focusable
  cartToggle.setAttribute('aria-label','Abrir/Fechar carrinho');
  document.querySelectorAll('#products .card button, #products .card button').forEach(b=>{ b.setAttribute('tabindex','0'); });

  // Sorting includes name asc/desc
  // Extend sort select options dynamically
  const nameAsc = document.createElement('option'); nameAsc.value='name-asc'; nameAsc.text='Nome: A→Z';
  const nameDesc = document.createElement('option'); nameDesc.value='name-desc'; nameDesc.text='Nome: Z→A';
  sortEl.appendChild(nameAsc); sortEl.appendChild(nameDesc);

  // Search / filters
  document.getElementById('clearSearch').addEventListener('click',()=>{ searchEl.value=''; renderProducts(); });
  clearFiltersBtn.addEventListener('click', ()=>{ categoryFilterEl.value='all'; sortEl.value='default'; searchEl.value=''; renderProducts(); });
  [searchEl, categoryFilterEl, sortEl].forEach(el=>el.addEventListener('input', renderProducts));

  // initial render
  renderProducts(); renderCart();
});
