    // ====== CONFIG — REPLACE THESE TWO LINES ======
    const PAYMENT_LINK = "https://buy.stripe.com/test_REPLACE_WITH_YOUR_LINK"; // Stripe Payment Link URL
    const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";          // Your Formspree form ID
    // ==============================================

    const shippingFlat = 0; // e.g. set to 4.99 if needed

    // Try to read cart from localStorage (set by your products page). Fallback to sample.
    function loadCart(){
      try{
        const raw = localStorage.getItem('dropcart_cart');
        if(raw){
          const arr = JSON.parse(raw);
          if(Array.isArray(arr) && arr.length){
            return arr.map(x=>({
              id: String(x.id||cryptoRandom()),
              title: String(x.title||'Item'),
              price: Number(x.price||0),
              qty: Number(x.qty||1)
            })).filter(i=>i.qty>0);
          }
        }
      }catch(e){/* ignore */}
      return [
        { id: "sw1", title: "Premium Pet Hair Removal Gloves", price: 50.00, qty: 1 }
      ];
    }

    localStorage.clear();

    function cryptoRandom(){
      if(window.crypto && crypto.getRandomValues){
        const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0].toString(36);
      }
      return Math.random().toString(36).slice(2);
    }

    let cart = loadCart();

    const $ = (q) => document.querySelector(q);
    const $$ = (q) => Array.from(document.querySelectorAll(q));

    const cartList = $("#cartList");
    const subTotalEl = $("#subTotal");
    const shippingEl = $("#shipping");
    const grandTotalEl = $("#grandTotal");
    const cartJsonEl = $("#cartJson");
    const orderTotalEl = $("#orderTotal");
    const orderForm = $("#orderForm");
    const statusEl = $("#status");
    const payOnlyBtn = $("#payOnlyBtn");

    function money(n){ return `$${n.toFixed(2)}` }

    function renderCart(){
      cartList.innerHTML = "";
      cart.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'item';
        row.dataset.index = idx;
        row.innerHTML = `
          <div class="thumb" aria-hidden="true">🛒</div>
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="qty"><input type="number" min="1" value="${item.qty}" data-id="${item.id}" aria-label="Quantity"></div>
          <div class="price">${money(item.price)}</div>
          <div class="line">${money(item.price * item.qty)}</div>
          <button class="remove" aria-label="Remove">Remove</button>
        `;
        cartList.appendChild(row);
      });
      attachCartEvents();
      updateTotals();
    }

    function escapeHtml(s){
      return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
    }

    function attachCartEvents(){
      $$(".item input[type='number']").forEach(inp=>{
        inp.addEventListener('input', e=>{
          const id = e.target.dataset.id;
          const it = cart.find(x=>x.id===id);
          let v = parseInt(e.target.value,10);
          if(!Number.isFinite(v) || v < 1) v = 1;
          it.qty = v;
          e.target.value = v;
          e.target.closest('.item').querySelector('.line').textContent = money(it.price * it.qty);
          updateTotals();
        });
      });
      $$(".item .remove").forEach((btn, i)=>{
        btn.addEventListener('click', ()=>{
          cart.splice(i,1);
          renderCart();
        });
      });
    }

    function totals(){
      const subtotal = cart.reduce((s,i)=> s + i.price * i.qty, 0);
      const shipping = cart.length ? shippingFlat : 0;
      const total = subtotal + shipping;
      return {subtotal, shipping, total};
    }

    function updateTotals(){
      const t = totals();
      subTotalEl.textContent = money(t.subtotal);
      shippingEl.textContent = money(t.shipping);
      grandTotalEl.textContent = money(t.total);
      cartJsonEl.value = JSON.stringify(cart);
      orderTotalEl.value = t.total.toFixed(2);
      // keep storage in sync
      try{ localStorage.setItem('dropcart_cart', JSON.stringify(cart)); }catch(e){}
      // disable if empty
      const disabled = cart.length === 0;
      $("#placeOrderBtn").disabled = disabled;
    }

    // Submit order to Formspree then open Stripe Payment Link
    orderForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      statusEl.textContent = "";

      if(PAYMENT_LINK.includes('REPLACE_WITH_YOUR_LINK')){
        statusEl.innerHTML = "<span class='err'>Set your <b>Stripe Payment Link</b> in the code.</span>";
        return;
      }
      if(FORMSPREE_ENDPOINT.endsWith('YOUR_FORM_ID')){
        statusEl.innerHTML = "<span class='err'>Set your <b>Formspree form ID</b> in the code.</span>";
        return;
      }

      const formData = new FormData(orderForm);
      // add a readable summary
      const t = totals();
      formData.set('cart_json', JSON.stringify(cart));
      formData.set('order_total', t.total.toFixed(2));
      formData.append('order_summary', `Items: ${cart.map(i=>i.title+" x"+i.qty).join(', ')} | Total: ${t.total.toFixed(2)}`);

      try{
        const res = await fetch(FORMSPREE_ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: formData });
        if(res.ok){
          statusEl.innerHTML = "<span class='ok'>Order details sent. Redirecting to payment…</span>";
          window.open(PAYMENT_LINK, '_blank');
        } else {
          statusEl.innerHTML = "<span class='err'>Could not send order details. Opening payment anyway…</span>";
          window.open(PAYMENT_LINK, '_blank');
        }
      }catch(err){
        statusEl.innerHTML = "<span class='err'>Network error. Opening payment…</span>";
        window.open(PAYMENT_LINK, '_blank');
      }
    });

    // Optional: Pay only button (no form submission)
    payOnlyBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      if(PAYMENT_LINK.includes('REPLACE_WITH_YOUR_LINK')){
        statusEl.innerHTML = "<span class='err'>Set your <b>Stripe Payment Link</b> in the code.</span>";
        return;
      }
      window.open(PAYMENT_LINK, '_blank');
    });

    document.getElementById('year').textContent = new Date().getFullYear();

    // Initialize
    renderCart();