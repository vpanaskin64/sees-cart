/* ============================================================
   SEES CART PROTOTYPE — main.js
   A1: Mixed Basket — Single Recipient
   A2: Subscribe & Save toggle
   B1: Gift checkbox expand + lock
   B2: Fulfillment switch (Pickup ↔ Shipping)
   B3: Add Another Recipient
   ============================================================ */

// ── Cart state ──────────────────────────────────────────────
const ITEMS = {
  'pickup-1': { price: 30, qty: 2, subscribed: false },
  'pickup-2': { price: 30, qty: 1, subscribed: false },
  'pickup-3': { price: 30, qty: 2, subscribed: false },
  'ship-1':   { price: 30, qty: 2, subscribed: false },
  'ship-2':   { price: 30, qty: 1, subscribed: false },
};

// ── Helpers ──────────────────────────────────────────────────
function fmt(n) {
  return '$' + (n).toFixed(2);
}

function renderItem(id) {
  const item = ITEMS[id];
  const valEl   = document.querySelector(`[data-qty-val="${id}"]`);
  const totalEl = document.querySelector(`[data-total="${id}"]`);
  if (valEl)   valEl.textContent = item.qty;
  if (totalEl) totalEl.textContent = fmt(item.price * item.qty);
}

function renderSummary() {
  // Total unique line items
  const count = Object.values(ITEMS).filter(i => i.qty > 0).length;
  const subtotal = Object.values(ITEMS).reduce((s, i) => s + i.price * i.qty, 0);

  const countEl    = document.querySelector('.totals-box__items-count');
  const subtotalEl = document.querySelector('.totals-box__subtotal-amount');
  if (countEl)    countEl.textContent = count;
  if (subtotalEl) subtotalEl.textContent = fmt(subtotal);

  // Promo bar — sum whichever items are currently in the shipping section
  const shippingIds = [...document.querySelectorAll('#shippingItems [data-item-id]')]
    .map(el => el.dataset.itemId);
  const shippingSubtotal = shippingIds
    .reduce((s, id) => s + (ITEMS[id] ? ITEMS[id].price * ITEMS[id].qty : 0), 0);
  const threshold = 80;
  const remaining = Math.max(0, threshold - shippingSubtotal);
  const pct = Math.min(100, (shippingSubtotal / threshold) * 100);

  const promoBody = remaining > 0
    ? `Add <strong>${fmt(remaining)}</strong> for <span class="free">FREE</span> shipping on $${threshold}+`
    : `You've unlocked <span class="free">FREE</span> shipping!`;

  document.querySelectorAll('.promo-bar__fill')
    .forEach(el => el.style.width = pct + '%');
  document.querySelectorAll('.promo-bar__meta-amount')
    .forEach(el => el.textContent = fmt(shippingSubtotal) + ' of $' + threshold + '.00');
  document.querySelectorAll('.promo-bar__text')
    .forEach(el => el.innerHTML = promoBody);
}

function toggleSubscription(id) {
  if (!ITEMS[id]) return;
  ITEMS[id].subscribed = !ITEMS[id].subscribed;

  const ctaEl    = document.querySelector(`[data-subscribe="${id}"]`);
  const moduleEl = document.querySelector(`[data-sub-module="${id}"]`);

  if (ctaEl)    ctaEl.hidden    =  ITEMS[id].subscribed;
  if (moduleEl) moduleEl.hidden = !ITEMS[id].subscribed;

  renderSubscriptionLock();
}

function renderSubscriptionLock() {
  const anySubscribed = Object.values(ITEMS).some(i => i.subscribed);
  const isGift       = document.getElementById('giftCheckbox')?.checked || false;
  const locked       = anySubscribed || isGift;

  const link    = document.getElementById('changeToPickup');
  const wrap    = document.getElementById('changeToPickupWrap');
  const tooltip = document.getElementById('changeToPickupTooltip');
  if (!link || !wrap) return;

  if (locked) {
    link.classList.add('fulfillment-header__action-link--disabled');
    link.removeAttribute('href');
    wrap._tooltipEnabled = true;
    if (tooltip) {
      tooltip.textContent = isGift && anySubscribed
        ? 'Unsubscribe and remove gift message first'
        : isGift
          ? 'Remove gift message first'
          : 'Unsubscribe from all products first';
    }
  } else {
    link.classList.remove('fulfillment-header__action-link--disabled');
    link.setAttribute('href', '#');
    wrap._tooltipEnabled = false;
    wrap.classList.remove('show-tooltip');
  }
}

// ── Gift checkbox ─────────────────────────────────────────────
function toggleGift() {
  const checked = document.getElementById('giftCheckbox')?.checked;
  const content = document.getElementById('giftContent');
  if (content) content.hidden = !checked;
  renderSubscriptionLock();
}

function updateGiftCounter() {
  const textarea = document.getElementById('giftTextarea');
  const counter  = document.getElementById('giftCounter');
  const saveBtn  = document.getElementById('giftSaveBtn');
  if (!textarea) return;
  const len = textarea.value.length;
  if (counter) counter.textContent = `${len}/150`;
  if (saveBtn) saveBtn.disabled = len === 0;
}

function saveGiftMessage() {
  const text = document.getElementById('giftTextarea')?.value?.trim();
  if (!text) return;

  // Show saved state with the message text
  const savedText = document.getElementById('giftSavedText');
  if (savedText) savedText.textContent = `"${text}"`;

  document.getElementById('giftEditing').hidden = true;
  document.getElementById('giftSaved').hidden   = false;
}

function editGiftMessage() {
  // Go back to editing with existing text pre-filled
  document.getElementById('giftEditing').hidden = false;
  document.getElementById('giftSaved').hidden   = true;
  updateGiftCounter(); // re-sync save button state
}

function removeGiftMessage() {
  // Clear text, uncheck, collapse
  const textarea = document.getElementById('giftTextarea');
  if (textarea) textarea.value = '';
  updateGiftCounter();

  document.getElementById('giftEditing').hidden = false;
  document.getElementById('giftSaved').hidden   = true;

  // Uncheck the gift checkbox
  const giftCb = document.getElementById('giftCheckbox');
  if (giftCb) {
    giftCb.checked = false;
    giftCb.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// ── Fulfillment confirmation modal ────────────────────────────
let pendingSwitch = null; // { newMode, fromGroupId }

function openFulfillmentModal(newMode, fromGroupId) {
  const fromGroup = document.getElementById(fromGroupId);
  if (!fromGroup) return;

  pendingSwitch = { newMode, fromGroupId };

  const isToShipping = newMode === 'shipping';
  document.getElementById('confirmTitle').textContent =
    isToShipping ? 'Change to Shipping' : 'Change to Pickup';
  document.getElementById('confirmDesc').textContent =
    isToShipping
      ? 'All pickup items will be switched to shipping:'
      : 'All shipping items will be switched to pickup:';
  document.getElementById('confirmBtn').textContent =
    isToShipping ? 'CHANGE TO SHIPPING' : 'CHANGE TO PICKUP';

  // Build product list from source group
  const itemsEl = document.getElementById('confirmItems');
  itemsEl.innerHTML = '';
  fromGroup.querySelectorAll('.cart-item').forEach(item => {
    const imgSrc = item.querySelector('.cart-item__img img')?.src || '';
    const name   = item.querySelector('.cart-item__name')?.textContent?.trim() || '';
    const qty    = item.querySelector('[data-qty-val]')?.textContent?.trim() || '1';
    const row = document.createElement('div');
    row.className = 'confirm-item';
    row.innerHTML = `
      <div class="confirm-item__thumb">
        <img src="${imgSrc}" alt="">
        <span class="confirm-item__qty">${qty}</span>
      </div>
      <span class="confirm-item__name">${name}</span>`;
    itemsEl.appendChild(row);
  });

  document.getElementById('confirmOverlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeFulfillmentModal() {
  document.getElementById('confirmOverlay').classList.remove('is-open');
  document.body.style.overflow = '';
  pendingSwitch = null;
}

function confirmFulfillmentSwitch() {
  if (!pendingSwitch) return;
  const { newMode, fromGroupId } = pendingSwitch;
  const isToShipping = newMode === 'shipping';

  const fromGroup   = document.getElementById(fromGroupId);
  const fromItemsEl = document.getElementById(
    fromGroupId === 'pickupGroup' ? 'pickupItems' : 'shippingItems'
  );
  const toItemsEl   = document.getElementById(
    isToShipping ? 'shippingItems' : 'pickupItems'
  );

  // Move all cart-item nodes from source into target section
  [...fromItemsEl.querySelectorAll('.cart-item')].forEach(item => {
    const itemId = item.dataset.itemId;

    if (isToShipping) {
      // Moving to shipping — add subscribe module if not already present
      if (itemId && !item.querySelector('[data-subscribe]')) {
        const body = item.querySelector('.cart-item__body');
        if (body) {
          const cta = document.createElement('div');
          cta.className = 'subscribe-cta';
          cta.dataset.subscribe = itemId;
          cta.innerHTML = `<span class="subscribe-cta__label">Subscribe &amp; Save</span>
            <img class="subscribe-cta__icon" src="assets/subscribe-icon.svg" alt="↻">`;

          const mod = document.createElement('div');
          mod.className = 'subscribe-module';
          mod.dataset.subModule = itemId;
          mod.hidden = true;
          mod.innerHTML = `
            <div class="subscribe-module__dropdown-group">
              <p class="subscribe-module__label">Delivers every:</p>
              <div class="subscribe-module__select">
                <span class="subscribe-module__select-text">2 months Recommended</span>
                <svg class="subscribe-module__chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9L12 15L18 9" stroke="#111" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
            <button class="subscribe-module__unsubscribe" data-unsub="${itemId}">Unsubscribe</button>`;

          body.appendChild(cta);
          body.appendChild(mod);
        }
      }
    } else {
      // Moving to pickup — unsubscribe if needed, remove subscribe elements
      if (itemId && ITEMS[itemId]?.subscribed) {
        ITEMS[itemId].subscribed = false;
      }
      item.querySelector('[data-subscribe]')?.remove();
      item.querySelector('[data-sub-module]')?.remove();
    }

    toItemsEl.appendChild(item);
  });

  // Hide the source group, ensure the target group is visible
  fromGroup.hidden = true;
  const toGroupId = isToShipping ? 'shippingGroup' : 'pickupGroup';
  document.getElementById(toGroupId).hidden = false;

  closeFulfillmentModal();

  // Show success toast
  showToast(
    isToShipping
      ? 'All pickup items have been switched to shipping'
      : 'All shipping items have been switched to pickup'
  );

  renderSummary();
  renderSubscriptionLock();
}

// ── Toast / alert banner ──────────────────────────────────────
function showToast(message) {
  const banner = document.getElementById('alertBanner');
  const text   = document.getElementById('alertText');
  if (!banner || !text) return;
  text.textContent = message;
  clearTimeout(banner._dismissTimer);
  // Force reflow so transition fires even if already visible
  banner.classList.remove('is-visible');
  void banner.offsetWidth;
  banner.classList.add('is-visible');
  banner._dismissTimer = setTimeout(dismissToast, 3000);
}

function dismissToast() {
  const banner = document.getElementById('alertBanner');
  if (!banner) return;
  clearTimeout(banner._dismissTimer);
  banner.classList.remove('is-visible');
}

// ── Multi-Recipient Modal ─────────────────────────────────────

const MR = {
  recipients: [],   // [{ id, firstName, lastName, address }]
  items: {},        // { recipientId: { itemId: qty } }
  checked: {},      // { recipientId: { itemId: bool } }
  nextId: 1,
};

// Fake address suggestions for autocomplete
const MR_ADDRESSES = [
  '123 Oak St, Tampa, FL 33601',
  '456 Maple Dr, Austin, TX 78701',
  '789 Pine Ave, Miami, FL 33101',
  '321 Elm Blvd, Dallas, TX 75201',
  '654 Cherry Ln, Nashville, TN 37201',
  '987 Birch Rd, Portland, OR 97201',
  '147 Walnut St, Denver, CO 80201',
  '258 Cedar Ave, Seattle, WA 98101',
  '369 Oak Ct, Chicago, IL 60601',
  '741 Maple Blvd, Boston, MA 02101',
  '500 Main St, San Francisco, CA 94105',
  '200 Park Ave, New York, NY 10166',
  '156 Maple Dr, Austin, TX 78702',
  '33 Palm Beach Dr, Miami, FL 33140',
  '88 Congress Ave, Austin, TX 78701',
  '214 Riverside Blvd, Tampa, FL 33606',
  '77 Lincoln Dr, Portland, OR 97209',
];

function mrGetShippingItems() {
  // In multi-recipient mode the items are restructured into recipient blocks and
  // no longer have data-item-id in the DOM — use the IDs saved at flow completion.
  if (MR.shippingItemIds) return MR.shippingItemIds;
  return [...document.querySelectorAll('#shippingItems [data-item-id]')]
    .map(el => el.dataset.itemId)
    .filter(id => ITEMS[id] && ITEMS[id].qty > 0);
}

function openMrModal() {
  const isAddMode = document.getElementById('shippingGroup')
    ?.classList.contains('is-multi-recipient') || false;

  if (isAddMode) {
    // Re-opening while multi-recipient is already active:
    // keep existing recipients (they'll render prefilled), track how many existed
    MR._addMode       = true;
    MR._existingCount = MR.recipients.length;
  } else {
    // Fresh start
    MR._addMode       = false;
    MR._existingCount = 0;
    MR.recipients = [];
    MR.items    = {};
    MR.checked  = {};
    MR.nextId   = 1;
    mrAddRecipient();  // Recipient 1
    mrAddRecipient();  // Recipient 2 — always start with 2, no remove links
  }

  // Show "Switch to single shipment" link only in add mode
  const switchLink = document.getElementById('mrSwitchToSingle');
  if (switchLink) switchLink.hidden = !isAddMode;

  document.getElementById('mrStep1').hidden = false;
  document.getElementById('mrStep2').hidden = true;

  mrRenderForms();   // remove link logic handled inside render

  document.getElementById('mrOverlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Always start from the top regardless of previous scroll position
  const mrBody = document.querySelector('#mrStep1 .mr-body');
  if (mrBody) mrBody.scrollTop = 0;
}

function closeMrModal() {
  document.getElementById('mrOverlay').classList.remove('is-open');
  document.body.style.overflow = '';
}

// ── Edit Recipient Modal ──────────────────────────────────────
let _editingRid = null;

function openEditModal(rid, num) {
  _editingRid = rid;
  const r = MR.recipients.find(r => r.id === rid);
  if (!r) return;

  document.getElementById('erRecipientLabel').textContent = `RECIPIENT ${num}`;
  document.getElementById('erFirstName').value  = r.firstName || '';
  document.getElementById('erLastName').value   = r.lastName  || '';
  document.getElementById('erAddress').value    = r.address   || '';

  document.getElementById('erOverlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  document.getElementById('erFirstName').focus();
}

function closeEditModal() {
  document.getElementById('erOverlay').classList.remove('is-open');
  document.body.style.overflow = '';
  _editingRid = null;
}

function commitEditModal() {
  if (!_editingRid) return;
  const r = MR.recipients.find(r => r.id === _editingRid);
  if (!r) { closeEditModal(); return; }

  r.firstName = document.getElementById('erFirstName').value.trim();
  r.lastName  = document.getElementById('erLastName').value.trim();
  r.address   = document.getElementById('erAddress').value.trim();

  // Update the name displayed in the cart block
  const block = document.querySelector(`[data-cart-rid="${_editingRid}"]`);
  const nameEl = block?.querySelector('.recipient-name');
  if (nameEl) nameEl.textContent = `${r.firstName} ${r.lastName}`;

  closeEditModal();
}

function mrAddRecipient() {
  if (MR.recipients.length >= 15) return;
  const id = 'r' + MR.nextId++;
  MR.recipients.push({ id, firstName: '', lastName: '', address: '' });
}

function mrRemoveRecipient(rid) {
  const card = document.querySelector(`.mr-recipient-block[data-rid="${rid}"]`);
  if (!card) { mrDoRemove(rid); return; }

  const h  = card.offsetHeight;
  const mt = parseInt(getComputedStyle(card).marginTop) || 0;

  card.style.overflow  = 'hidden';
  card.style.height    = h + 'px';
  card.style.marginTop = mt + 'px';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.style.transition = [
        'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'margin-top 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'opacity 0.25s ease',
      ].join(', ');
      card.style.height    = '0';
      card.style.marginTop = '0';
      card.style.opacity   = '0';

      card.addEventListener('transitionend', () => mrDoRemove(rid), { once: true });
    });
  });
}

function mrDoRemove(rid) {
  const wasThreeOrMore = MR.recipients.length >= 3;

  MR.recipients = MR.recipients.filter(r => r.id !== rid);
  delete MR.items[rid];
  mrClearAddMoreError();

  // Remove the card element from DOM (already animated out)
  document.querySelector(`.mr-recipient-block[data-rid="${rid}"]`)?.remove();

  // Re-number remaining cards (targeted, no innerHTML wipe)
  mrUpdateRecipientNumbers();

  // If dropping below 3, fade out all Remove links
  if (wasThreeOrMore && MR.recipients.length < 3) {
    mrFadeOutRemoveLinks();
  }

  mrUpdateAddMoreBtn();
  mrUpdateContinueBtn();
}

// ── Targeted DOM helpers (avoid full re-render) ───────────────

function mrCreateCardElement(r, index, showRemove) {
  const div = document.createElement('div');
  div.className  = 'mr-recipient-block';
  div.dataset.rid = r.id;
  div.innerHTML = `
    <div class="mr-label-row">
      <span class="mr-recipient-label">Recipient ${index + 1}</span>
      ${showRemove ? `<button class="mr-remove-link" data-mr-remove="${r.id}">Remove</button>` : ''}
    </div>
    <div class="mr-form-row">
      <div class="mr-field">
        <label class="mr-field-label" for="mr-fn-${r.id}">First Name*</label>
        <input class="mr-input" id="mr-fn-${r.id}" type="text" placeholder="First Name"
          data-rid="${r.id}" data-field="firstName" value="" autocomplete="given-name">
      </div>
      <div class="mr-field">
        <label class="mr-field-label" for="mr-ln-${r.id}">Last Name*</label>
        <input class="mr-input" id="mr-ln-${r.id}" type="text" placeholder="Last Name"
          data-rid="${r.id}" data-field="lastName" value="" autocomplete="family-name">
      </div>
    </div>
    <div class="mr-field">
      <label class="mr-field-label" for="mr-addr-${r.id}">Zip Code or Address*</label>
      <input class="mr-input mr-address-input" id="mr-addr-${r.id}" type="text"
        placeholder="Zip Code or Address"
        data-rid="${r.id}" data-field="address" value="" autocomplete="off">
      <div class="mr-ac" id="mrAc-${r.id}" hidden></div>
    </div>`;
  return div;
}

function mrUpdateRecipientNumbers() {
  document.querySelectorAll('#mrFormList .mr-recipient-block').forEach((card, i) => {
    const label = card.querySelector('.mr-recipient-label');
    if (label) label.textContent = `Recipient ${i + 1}`;
  });
}

function mrFadeInRemoveLinks() {
  document.querySelectorAll('#mrFormList .mr-recipient-block').forEach(card => {
    if (card.querySelector('.mr-remove-link')) return; // already has one
    const rid = card.dataset.rid;
    const btn = document.createElement('button');
    btn.className        = 'mr-remove-link';
    btn.dataset.mrRemove = rid;
    btn.textContent      = 'Remove';
    btn.style.opacity    = '0';
    card.querySelector('.mr-label-row')?.appendChild(btn);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        btn.style.transition = 'opacity 0.3s ease';
        btn.style.opacity    = '1';
        btn.addEventListener('transitionend', () => { btn.style.transition = ''; }, { once: true });
      });
    });
  });
}

function mrUpdateSelectAll(rid) {
  const btn = document.querySelector(`.mr-accordion-body [data-select-all="${rid}"]`);
  if (!btn) return;
  const shippingIds  = mrGetShippingItems();
  const checkedState = MR.checked[rid] || {};
  const allChecked   = shippingIds.every(id => checkedState[id] !== false);
  btn.disabled = allChecked;
}

function mrFadeOutRemoveLinks() {
  document.querySelectorAll('#mrFormList .mr-remove-link').forEach(btn => {
    btn.style.transition = 'opacity 0.25s ease';
    btn.style.opacity    = '0';
    btn.addEventListener('transitionend', () => btn.remove(), { once: true });
  });
}

function mrRenderForms() {
  const list = document.getElementById('mrFormList');
  if (!list) return;

  // Remove link rule: visible on ALL cards only when ≥3 recipients
  const showRemove = MR.recipients.length >= 3;

  list.innerHTML = MR.recipients.map((r, i) => `
    <div class="mr-recipient-block" data-rid="${r.id}">
      <div class="mr-label-row">
        <span class="mr-recipient-label">Recipient ${i + 1}</span>
        ${showRemove
          ? `<button class="mr-remove-link" data-mr-remove="${r.id}">Remove</button>`
          : ''}
      </div>
      <div class="mr-form-row">
        <div class="mr-field">
          <label class="mr-field-label" for="mr-fn-${r.id}">First Name*</label>
          <input class="mr-input" id="mr-fn-${r.id}" type="text" placeholder="First Name"
            data-rid="${r.id}" data-field="firstName"
            value="${r.firstName}" autocomplete="given-name">
        </div>
        <div class="mr-field">
          <label class="mr-field-label" for="mr-ln-${r.id}">Last Name*</label>
          <input class="mr-input" id="mr-ln-${r.id}" type="text" placeholder="Last Name"
            data-rid="${r.id}" data-field="lastName"
            value="${r.lastName}" autocomplete="family-name">
        </div>
      </div>
      <div class="mr-field">
        <label class="mr-field-label" for="mr-addr-${r.id}">Zip Code or Address*</label>
        <input class="mr-input mr-address-input" id="mr-addr-${r.id}" type="text"
          placeholder="Zip Code or Address"
          data-rid="${r.id}" data-field="address"
          value="${r.address}" autocomplete="off">
        <div class="mr-ac" id="mrAc-${r.id}" hidden></div>
      </div>
    </div>
  `).join('');

  mrUpdateAddMoreBtn();
  mrUpdateContinueBtn();
}

// breadcrumbs are now static HTML — no subtitle update needed

function mrUpdateAddMoreBtn() {
  const btn = document.getElementById('mrAddMoreBtn');
  if (btn) btn.hidden = MR.recipients.length >= 15;
}

function mrUpdateContinueBtn() {
  const btn = document.getElementById('mrContinueBtn');
  if (!btn) return;
  const allFilled = MR.recipients.length >= 1 &&
    MR.recipients.every(r =>
      r.firstName.trim() && r.lastName.trim() && r.address.trim()
    );
  btn.disabled = !allFilled;

  // Sync "Assign items" breadcrumb — active + clickable when all filled
  const nextCrumb = document.getElementById('mrBreadcrumbNext');
  if (nextCrumb) {
    nextCrumb.disabled = !allFilled;
    nextCrumb.classList.toggle('mr-breadcrumb--active',   allFilled);
    nextCrumb.classList.toggle('mr-breadcrumb--inactive', !allFilled);
  }
}

function mrShowAddMoreError(msg) {
  let el = document.getElementById('mrAddMoreError');
  if (!el) {
    el = document.createElement('p');
    el.id = 'mrAddMoreError';
    el.className = 'mr-add-error';
    document.getElementById('mrAddMoreBtn')?.insertAdjacentElement('afterend', el);
  }
  el.textContent = msg;
  el.hidden = false;
}

function mrClearAddMoreError() {
  const el = document.getElementById('mrAddMoreError');
  if (el) el.hidden = true;
  document.querySelectorAll('.mr-input--error').forEach(i => i.classList.remove('mr-input--error'));
}

// ── Autocomplete ──────────────────────────────────────────────

function mrGetSuggestions(query) {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  return MR_ADDRESSES.filter(a => a.toLowerCase().includes(q)).slice(0, 5);
}

function mrShowSuggestions(rid, suggestions) {
  const ac = document.getElementById(`mrAc-${rid}`);
  if (!ac) return;
  if (!suggestions.length) { ac.hidden = true; return; }
  ac.innerHTML = suggestions.map(s =>
    `<div class="mr-ac-item" data-ac-pick="${rid}" data-ac-val="${s}">${s}</div>`
  ).join('');
  ac.hidden = false;
}

function mrHideSuggestions(rid) {
  const ac = document.getElementById(`mrAc-${rid}`);
  if (ac) ac.hidden = true;
}

// ── Step 2 ────────────────────────────────────────────────────

function mrGoToStep2() {
  const shippingIds = mrGetShippingItems();

  // Seed items + checked state (once — preserve if already set)
  MR.recipients.forEach(r => {
    if (!MR.items[r.id]) {
      MR.items[r.id] = {};
      shippingIds.forEach(id => { MR.items[r.id][id] = ITEMS[id].qty; });
    }
    if (!MR.checked) MR.checked = {};
    if (!MR.checked[r.id]) {
      MR.checked[r.id] = {};
      shippingIds.forEach(id => { MR.checked[r.id][id] = true; });
    }
  });

  document.getElementById('mrStep1').hidden = true;
  document.getElementById('mrStep2').hidden = false;

  mrRenderAccordion();

  // In add mode, scroll so the first new recipient card is visible
  if (MR._addMode && MR._existingCount > 0) {
    const firstNewR = MR.recipients[MR._existingCount];
    if (firstNewR) {
      setTimeout(() => {
        const card = document.querySelector(`[data-accordion="${firstNewR.id}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50); // slight delay so the DOM is fully painted
    }
  }
}

function mrGoToStep1() {
  document.getElementById('mrStep2').hidden = true;
  document.getElementById('mrStep1').hidden = false;
  mrRenderForms();
  const mrBody = document.querySelector('#mrStep1 .mr-body');
  if (mrBody) mrBody.scrollTop = 0;
}

function mrRenderAccordion() {
  const list = document.getElementById('mrAccordionList');
  if (!list) return;
  const shippingIds = mrGetShippingItems();

  // Runs after innerHTML is set — called via setTimeout below
  const _afterRender = () => MR.recipients.forEach(r => mrUpdateSelectAll(r.id));
  setTimeout(_afterRender, 0);

  list.innerHTML = MR.recipients.map((r, i) => {
    // Add mode: only newly-added recipients open. Initial mode: first one open.
    const isOpen         = MR._addMode
      ? i >= (MR._existingCount || 0)
      : i === 0;
    const recipientItems = MR.items[r.id]    || {};
    const checkedItems   = MR.checked[r.id]  || {};

    const itemsHtml = shippingIds.map(itemId => {
      const item    = ITEMS[itemId];
      const domRow  = document.querySelector(`[data-item-id="${itemId}"]`);
      const imgSrc  = domRow?.querySelector('.cart-item__img img')?.src
                      || MR.itemMeta?.[itemId]?.imgSrc || '';
      const name    = domRow?.querySelector('.cart-item__name')?.textContent?.trim()
                      || MR.itemMeta?.[itemId]?.name   || '';
      const qty     = recipientItems[itemId] ?? item.qty;
      const checked = checkedItems[itemId] !== false; // default true
      return `
        <div class="mr-item-row ${!checked ? 'mr-item-row--unchecked' : ''}">
          <label class="mr-item-check">
            <input type="checkbox" class="mr-item-checkbox"
              data-mr-check="${r.id}" data-mr-item="${itemId}"
              ${checked ? 'checked' : ''}>
            <span class="mr-item-check__box"></span>
          </label>
          <div class="mr-item-thumb"><img src="${imgSrc}" alt="${name}"></div>
          <div class="mr-item-info">
            <div class="mr-item-name">${name}</div>
            <div class="mr-item-meta">15 oz · $${item.price}.00 each</div>
          </div>
          <div class="mr-item-qty ${!checked ? 'mr-item-qty--disabled' : ''}">
            <button class="mr-qty-btn" data-mr-dec="${r.id}" data-mr-item="${itemId}" ${(!checked || qty <= 1) ? 'disabled' : ''} aria-label="Decrease">
              <img src="assets/minus-thin.svg" alt="">
            </button>
            <span class="mr-qty-val" id="mrQty-${r.id}-${itemId}">${qty}</span>
            <button class="mr-qty-btn" data-mr-inc="${r.id}" data-mr-item="${itemId}" ${!checked ? 'disabled' : ''} aria-label="Increase">
              <img src="assets/plus-thin.svg" alt="">
            </button>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="mr-accordion-item ${isOpen ? 'is-open' : ''}" data-accordion="${r.id}">
        <button class="mr-accordion-header" data-accordion-toggle="${r.id}">
          <div class="mr-accordion-header__text">
            <span class="mr-accordion-label">RECIPIENT ${i + 1}</span>
            <span class="mr-accordion-name">${r.firstName} ${r.lastName}</span>
          </div>
          <svg class="mr-accordion-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="mr-accordion-body" ${isOpen ? 'style="height:auto"' : ''}>
          <div class="mr-accordion-body-inner">
            <button class="mr-select-all" data-select-all="${r.id}">Select All Items</button>
            ${itemsHtml}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Cart helpers for post-flow rendering ─────────────────────

function mrCartItemsHtml(rid, itemMeta) {
  const rItems   = MR.items[rid]   || {};
  const checked  = MR.checked[rid] || {};
  return Object.entries(rItems)
    .filter(([itemId, qty]) => qty > 0 && checked[itemId] !== false)
    .map(([itemId, qty]) => {
      const item = ITEMS[itemId];
      if (!item) return '';
      const { imgSrc = '', name = '' } = itemMeta[itemId] || {};
      return `
        <div class="cart-item">
          <div class="cart-item__img"><img src="${imgSrc}" alt="${name}"></div>
          <div class="cart-item__body">
            <div class="cart-item__info">
              <div class="cart-item__title-row">
                <span class="cart-item__name">${name}</span>
                <button class="cart-item__delete" aria-label="Remove item" data-mr-del-item="${itemId}">
                  <img src="assets/trash.svg" alt="">
                </button>
              </div>
              <div class="cart-item__meta">
                <span>#500310</span><span>15 oz</span>
              </div>
              <div class="cart-item__price-each">$${item.price}.00 each</div>
            </div>
            <div class="cart-item__actions">
              <div class="qty-selector">
                <button class="qty-btn"><img src="assets/minus-thin.svg" alt=""></button>
                <span class="qty-value">${qty}</span>
                <button class="qty-btn"><img src="assets/plus-thin.svg" alt=""></button>
              </div>
              <div class="cart-item__total">
                <span class="cart-item__total-label">Total</span>
                <span class="cart-item__total-price">$${item.price * qty}.00</span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
}

function mrCartThumbsHtml(rid, itemMeta) {
  const rItems   = MR.items[rid]   || {};
  const checked  = MR.checked[rid] || {};
  return Object.entries(rItems)
    .filter(([itemId, qty]) => qty > 0 && checked[itemId] !== false)
    .map(([itemId, qty]) => {
      const { imgSrc = '' } = itemMeta[itemId] || {};
      return `
        <div class="recipient-thumb">
          <img src="${imgSrc}" alt="">
          <span class="recipient-thumb__count">${qty}</span>
        </div>`;
    }).join('');
}

function mrCompleteFlow() {
  closeMrModal();

  const isAddMode     = MR._addMode;
  const existingCount = MR._existingCount || 0;
  // In add mode, only the newly-appended recipients are "new"
  const newRecipients = isAddMode
    ? MR.recipients.slice(existingCount)
    : MR.recipients;

  // Toast
  if (isAddMode) {
    const added = newRecipients.length;
    showToast(`${added} new recipient${added !== 1 ? 's' : ''} added!`);
  } else {
    const n = MR.recipients.length;
    showToast(`${n} recipient${n !== 1 ? 's' : ''} have been successfully added!`);
  }

  if (!isAddMode) {
    // First-time only: reveal "Save to All Recipients", hide top-level promo/gift
    document.getElementById('giftSaveAll')?.removeAttribute('hidden');
    document.querySelector('#shippingGroup > .promo-bar')?.setAttribute('hidden', '');
    document.getElementById('giftMessage')?.setAttribute('hidden', '');

    // Update the multi-recipient CTA section copy
    const mrSection = document.querySelector('.multi-recipient');
    if (mrSection) {
      const title = mrSection.querySelector('.multi-recipient__title');
      const desc  = mrSection.querySelector('.multi-recipient__desc');
      const btn   = mrSection.querySelector('#addRecipientBtn');
      if (title) title.textContent = 'Add or manage recipients';
      if (desc)  desc.hidden = true;
      if (btn)   btn.textContent  = 'ADD OR MANAGE RECIPIENTS';
    }
  }

  // ⚠️ Capture DOM data BEFORE any clearing.
  // In add mode the items are already inside recipient blocks without data-item-id,
  // so fall back to the metadata saved during the initial flow.
  const capturedIds = isAddMode ? (MR.shippingItemIds || []) : mrGetShippingItems();
  const itemMeta    = isAddMode ? (MR.itemMeta || {})        : {};
  if (!isAddMode) {
    capturedIds.forEach(itemId => {
      const row = document.querySelector(`[data-item-id="${itemId}"]`);
      itemMeta[itemId] = {
        imgSrc: row?.querySelector('.cart-item__img img')?.src || '',
        name:   row?.querySelector('.cart-item__name')?.textContent?.trim() || '',
      };
    });
    // Persist so add-mode runs can reuse them without DOM lookups
    MR.shippingItemIds = capturedIds;
    MR.itemMeta        = itemMeta;
  }

  const shippingItems = document.getElementById('shippingItems');
  if (!shippingItems) return;

  if (!isAddMode) {
    // First-time setup: save original HTML, flag group, disable links, clear container
    MR.savedItemsHtml  = shippingItems.innerHTML;
    MR.savedItemsClass = shippingItems.className;

    document.getElementById('shippingGroup')?.classList.add('is-multi-recipient');

    const pickupLink = document.getElementById('changeToPickup');
    const pickupWrap = document.getElementById('changeToPickupWrap');
    const pickupTip  = document.getElementById('changeToPickupTooltip');
    if (pickupLink && pickupWrap) {
      pickupLink.classList.add('fulfillment-header__action-link--disabled');
      pickupLink.removeAttribute('href');
      pickupWrap._tooltipEnabled = true;
      if (pickupTip) pickupTip.textContent = 'Switch to single shipment to change to pickup';
    }

    const shippingLink = document.getElementById('changeToShipping');
    const shippingWrap = document.getElementById('changeToShippingWrap');
    if (shippingLink && shippingWrap) {
      shippingLink.classList.add('fulfillment-header__action-link--disabled');
      shippingLink.removeAttribute('href');
      shippingWrap._tooltipEnabled = true;
    }

    shippingItems.classList.add('mr-multi-items');
    shippingItems.innerHTML = '';
  }

  // In add mode: append only new recipients. Initial mode: render all.
  const toRender  = isAddMode ? newRecipients : MR.recipients;
  const idxOffset = isAddMode ? existingCount : 0;

  toRender.forEach((r, j) => {
    const i      = idxOffset + j;
    const rItems    = MR.items[r.id]   || {};
    const rChecked  = MR.checked[r.id] || {};
    const total     = Object.entries(rItems).reduce(
      (sum, [id, qty]) =>
        rChecked[id] !== false ? sum + (ITEMS[id]?.price || 0) * qty : sum,
      0
    );

    const block = document.createElement('div');
    block.className    = 'mr-cart-block';
    block.dataset.cartRid = r.id;

    block.innerHTML = `
      <div class="co-recipient-header">
        <span class="co-recipient-header__label">RECIPIENT ${i + 1}</span>
        <button class="co-recipient-header__edit" aria-label="Edit recipient"
          data-cart-edit="${r.id}" data-recipient-num="${i + 1}">
          <img src="assets/icon-edit.svg" alt="" width="20" height="20">
        </button>
      </div>

      <div class="recipient-block__body">
        <p class="recipient-name">${r.firstName} ${r.lastName}</p>

        <div class="mr-promo-gift-box">
        <div class="promo-bar">
          <p class="promo-bar__text">
            Add <strong>$47.00</strong> for <span class="free">FREE</span> shipping on $80+
          </p>
          <div class="promo-bar__details">
            <div class="promo-bar__meta">
              <span class="promo-bar__meta-amount">$33.00 of $80.00</span>
              <a class="promo-bar__meta-link" href="#">Add Treats</a>
            </div>
            <div class="promo-bar__track"><div class="promo-bar__fill"></div></div>
          </div>
        </div>

        <div class="gift-message">
          <label class="gift-message__row">
            <div class="gift-message__icon">
              <img src="assets/Gift Icon.svg" alt="" width="20" height="20">
            </div>
            <span class="gift-message__label">This shipment is a gift</span>
            <input type="checkbox" class="gift-message__checkbox mr-gift-checkbox"
              data-gift-rid="${r.id}" aria-label="Mark as gift">
          </label>
          <p class="gift-message__hint">Add free gift message, send receipt without a price</p>
          <div class="gift-content" id="mrGiftContent-${r.id}" hidden>
            <div id="mrGiftEditing-${r.id}" class="gift-content__editing">
              <p class="gift-content__label">Add Free Gift Message</p>
              <textarea class="gift-content__textarea" id="mrGiftTextarea-${r.id}"
                maxlength="150" placeholder="Add a sweet note &amp; include your name."></textarea>
              <div class="gift-content__footer">
                <span class="gift-content__counter" id="mrGiftCounter-${r.id}">0/150</span>
              </div>
              <button class="gift-content__save" id="mrGiftSaveBtn-${r.id}" disabled>SAVE MESSAGE</button>
            </div>
            <div id="mrGiftSaved-${r.id}" hidden>
              <p class="gift-content__message-text" id="mrGiftSavedText-${r.id}"></p>
              <div class="gift-content__saved-actions">
                <button class="btn btn--primary" id="mrGiftEditBtn-${r.id}">EDIT MESSAGE</button>
                <button class="gift-content__remove-btn" id="mrGiftRemoveBtn-${r.id}">Remove Message</button>
              </div>
            </div>
          </div>
        </div>
        </div><!-- /mr-promo-gift-box -->

        <button class="recipient-total-row js-toggle-recipient"
          data-target-rid="${r.id}"
          aria-expanded="false">
          <span class="recipient-total-row__label">Recipient total</span>
          <span class="recipient-total-row__amount">$${total}.00</span>
          <svg class="recipient-total-row__chevron"
            width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="mr-recipient-thumbs" data-thumbs-rid="${r.id}">
          <div class="recipient-thumb-grid">
            ${mrCartThumbsHtml(r.id, itemMeta)}
          </div>
        </div>

        <div class="mr-recipient-items" data-items-rid="${r.id}" hidden>
          <div class="cart-items" style="padding: 0 0 4px">
            ${mrCartItemsHtml(r.id, itemMeta)}
          </div>
        </div>

        <button class="recipient-remove" data-cart-remove="${r.id}">Remove This Recipient</button>
      </div>`;

    shippingItems.appendChild(block);
  });

  // Scroll to shipping group on initial setup only
  if (!isAddMode) {
    setTimeout(() => {
      const shippingGroup = document.getElementById('shippingGroup');
      if (shippingGroup) {
        const top = shippingGroup.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 320);
  }
}

function revertToSingleShipment() {
  const shippingItems = document.getElementById('shippingItems');
  if (!shippingItems) return;

  // Restore original items HTML
  if (MR.savedItemsHtml !== undefined) {
    shippingItems.innerHTML = MR.savedItemsHtml;
    shippingItems.className = MR.savedItemsClass || '';
    MR.savedItemsHtml = undefined;
  }

  // Remove multi-recipient flag from shipping group
  document.getElementById('shippingGroup')?.classList.remove('is-multi-recipient');

  // Restore top-level promo bar + gift message
  document.querySelector('#shippingGroup > .promo-bar')?.removeAttribute('hidden');
  document.getElementById('giftMessage')?.removeAttribute('hidden');

  // Hide "Save to All Recipients"
  document.getElementById('giftSaveAll')?.setAttribute('hidden', '');

  // Re-enable "Change to Pickup"
  const pickupLink = document.getElementById('changeToPickup');
  const pickupWrap = document.getElementById('changeToPickupWrap');
  if (pickupLink && pickupWrap) {
    pickupLink.classList.remove('fulfillment-header__action-link--disabled');
    pickupLink.setAttribute('href', '#');
    pickupWrap._tooltipEnabled = false;
    pickupWrap.classList.remove('show-tooltip');
  }

  // Re-enable "Change to Shipping" on BOPIS header
  const shippingLink = document.getElementById('changeToShipping');
  const shippingWrap = document.getElementById('changeToShippingWrap');
  if (shippingLink && shippingWrap) {
    shippingLink.classList.remove('fulfillment-header__action-link--disabled');
    shippingLink.setAttribute('href', '#');
    shippingWrap._tooltipEnabled = false;
    shippingWrap.classList.remove('show-tooltip');
  }

  // Clear multi-recipient item cache so a fresh flow starts clean
  MR.shippingItemIds = undefined;
  MR.itemMeta        = undefined;

  // Restore multi-recipient CTA section to its original copy
  const mrSection = document.querySelector('.multi-recipient');
  if (mrSection) {
    const title = mrSection.querySelector('.multi-recipient__title');
    const desc  = mrSection.querySelector('.multi-recipient__desc');
    const btn   = mrSection.querySelector('#addRecipientBtn');
    if (title) title.textContent = 'Want to ship to multiple people?';
    if (desc)  desc.hidden = false;
    if (btn)   btn.textContent  = 'ADD ANOTHER RECIPIENT';
  }

  // Re-run lock check in case subscribed/gift state still applies
  renderSubscriptionLock();
  renderSummary();

  showToast('Switched back to single shipment');
}

// ── Switch-to-single confirmation (from inside mrModal) ──────

function openSwitchToSingleModal() {
  const n    = MR.recipients.length;
  const desc = document.getElementById('ssDesc');
  if (desc) {
    desc.textContent =
      `All ${n} recipient${n !== 1 ? 's' : ''} will be removed. ` +
      `Your items will be combined into a single order.`;
  }
  // Hide recipients modal first so confirmation renders on top
  document.getElementById('mrOverlay').classList.remove('is-open');
  document.getElementById('ssOverlay').classList.add('is-open');
  // body overflow stays hidden — we're still in a modal state
}

function closeSwitchToSingleModal() {
  document.getElementById('ssOverlay').classList.remove('is-open');
}

function keepMultipleRecipients() {
  // Dismiss confirmation and restore the recipients modal
  closeSwitchToSingleModal();
  document.getElementById('mrOverlay').classList.add('is-open');
}

function confirmSwitchToSingle() {
  closeSwitchToSingleModal();
  document.body.style.overflow = '';  // mrOverlay already closed above
  revertToSingleShipment();
}

// ── Multi-recipient cart helpers ─────────────────────────────

function mrRemoveRecipientBlock(rid) {
  const block = document.querySelector(`[data-cart-rid="${rid}"]`);
  if (!block) return;
  block.style.transition = 'opacity 0.2s ease';
  block.style.opacity    = '0';
  setTimeout(() => {
    block.remove();
    const remaining = document.querySelectorAll('#shippingItems [data-cart-rid]').length;
    if (remaining <= 1) revertToSingleShipment();
  }, 200);
}

function mrUpdateRecipientCartBlock(rid) {
  const block = document.querySelector(`[data-cart-rid="${rid}"]`);
  if (!block) return;

  const rItems   = MR.items[rid]   || {};
  const rChecked = MR.checked[rid] || {};
  const total    = Object.entries(rItems).reduce(
    (sum, [id, qty]) =>
      rChecked[id] !== false ? sum + (ITEMS[id]?.price || 0) * qty : sum,
    0
  );

  const totalEl = block.querySelector('.recipient-total-row__amount');
  if (totalEl) totalEl.textContent = `$${total}.00`;

  const thumbsGrid = block.querySelector('.recipient-thumb-grid');
  if (thumbsGrid && MR.itemMeta) {
    thumbsGrid.innerHTML = mrCartThumbsHtml(rid, MR.itemMeta);
  }
}

function mrRemoveCartItem(rid, itemId) {
  // Update state
  if (MR.items[rid])   delete MR.items[rid][itemId];
  if (MR.checked[rid]) MR.checked[rid][itemId] = false;

  // Find and fade out the row (scoped to this recipient's block)
  const block  = document.querySelector(`[data-cart-rid="${rid}"]`);
  const delBtn = block?.querySelector(`[data-mr-del-item="${itemId}"]`);
  const row    = delBtn?.closest('.cart-item');

  if (row) {
    row.style.transition = 'opacity 0.2s ease';
    row.style.opacity    = '0';
    setTimeout(() => {
      row.remove();

      // Count remaining active items for this recipient
      const remaining = Object.entries(MR.items[rid] || {}).filter(
        ([id, qty]) => qty > 0 && MR.checked[rid]?.[id] !== false
      ).length;

      if (remaining === 0) {
        // No items left — remove the whole recipient block
        mrRemoveRecipientBlock(rid);
      } else {
        mrUpdateRecipientCartBlock(rid);
      }
    }, 200);
  }
}

function removeItem(id) {
  const row = document.querySelector(`[data-item-id="${id}"]`);
  if (row) {
    // Capture group reference before removing the node
    const group          = row.closest('.fulfillment-group');
    const itemsContainer = row.closest('.cart-items');

    row.style.transition = 'opacity 0.2s ease';
    row.style.opacity = '0';
    setTimeout(() => {
      row.remove();
      delete ITEMS[id];

      // If no cart items remain in this section, hide the whole group
      if (group && itemsContainer) {
        const remaining = itemsContainer.querySelectorAll('.cart-item').length;
        if (remaining === 0) group.hidden = true;
      }

      renderSummary();
    }, 200);
  }
}

// ── Event wiring ─────────────────────────────────────────────
document.addEventListener('click', (e) => {

  // Qty decrement
  const decBtn = e.target.closest('[data-qty-dec]');
  if (decBtn) {
    const id = decBtn.dataset.qtyDec;
    if (ITEMS[id] && ITEMS[id].qty > 1) {
      ITEMS[id].qty -= 1;
      renderItem(id);
      renderSummary();
    }
    return;
  }

  // Qty increment
  const incBtn = e.target.closest('[data-qty-inc]');
  if (incBtn) {
    const id = incBtn.dataset.qtyInc;
    if (ITEMS[id]) {
      ITEMS[id].qty += 1;
      renderItem(id);
      renderSummary();
    }
    return;
  }

  // Delete item
  const delBtn = e.target.closest('[data-delete]');
  if (delBtn) {
    const id = delBtn.dataset.delete;
    removeItem(id);
    return;
  }

  // Fulfillment switch → open confirmation modal
  const switchBtn = e.target.closest('[data-change-to]');
  if (switchBtn) {
    const newMode = switchBtn.dataset.changeTo;
    const groupId = switchBtn.dataset.group;
    if (groupId) openFulfillmentModal(newMode, groupId);
    return;
  }

  // Confirm modal — confirm button
  if (e.target.closest('#confirmBtn')) {
    confirmFulfillmentSwitch();
    return;
  }

  // Confirm modal — cancel or close
  if (e.target.closest('#confirmCancelBtn') || e.target.closest('#confirmClose')) {
    closeFulfillmentModal();
    return;
  }

  // Confirm modal — click backdrop to dismiss
  if (e.target === document.getElementById('confirmOverlay')) {
    closeFulfillmentModal();
    return;
  }

  // Dismiss alert banner
  if (e.target.closest('#alertClose')) {
    dismissToast();
    return;
  }

  // "Switch to single shipment" link inside mrModal step 1
  if (e.target.closest('#mrSwitchToSingle')) {
    e.preventDefault();
    openSwitchToSingleModal();
    return;
  }

  // Switch-to-single confirmation modal
  if (e.target.closest('#ssConfirmBtn')) {
    confirmSwitchToSingle();
    return;
  }
  if (e.target.closest('#ssCancelBtn') || e.target.closest('#ssClose')) {
    keepMultipleRecipients();
    return;
  }
  if (e.target === document.getElementById('ssOverlay')) {
    keepMultipleRecipients();
    return;
  }

  // Open multi-recipient modal
  if (e.target.closest('#addRecipientBtn')) {
    openMrModal();
    return;
  }

  // ── Edit recipient modal events ───────────────────────────

  const editBtn = e.target.closest('[data-cart-edit]');
  if (editBtn) {
    openEditModal(editBtn.dataset.cartEdit, editBtn.dataset.recipientNum);
    return;
  }

  if (e.target.closest('#erClose') || e.target.closest('#erCancelBtn')) {
    closeEditModal();
    return;
  }

  if (e.target.closest('#erUpdateBtn')) {
    commitEditModal();
    return;
  }

  if (e.target === document.getElementById('erOverlay')) {
    closeEditModal();
    return;
  }

  // ── Multi-recipient modal events ──────────────────────────

  // Close modal (step 1)
  if (e.target.closest('#mrClose1') || e.target.closest('#mrCancelBtn')) {
    closeMrModal();
    return;
  }

  // Close modal (step 2) — X just dismisses, no commit
  if (e.target.closest('#mrClose2')) {
    closeMrModal();
    return;
  }

  // CONTINUE or "Assign items" breadcrumb → go to step 2
  if (e.target.closest('#mrContinueBtn') || e.target.closest('#mrBreadcrumbNext')) {
    mrGoToStep2();
    return;
  }

  // ADD NEW RECIPIENTS → confirm & inject cart blocks
  if (e.target.closest('#mrAddNewBtn')) {
    mrCompleteFlow();
    return;
  }

  // BACK → step 1 (edit names/addresses)
  if (e.target.closest('#mrBackBtn') || e.target.closest('#mrBreadcrumbBack')) {
    mrGoToStep1();
    return;
  }

  // Toggle recipient items expand/collapse (in cart)
  const toggleBtn = e.target.closest('.js-toggle-recipient');
  if (toggleBtn) {
    const rid = toggleBtn.dataset.targetRid;
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', !expanded);
    toggleBtn.querySelector('.recipient-total-row__chevron')?.classList.toggle('is-up', !expanded);
    const itemsEl  = document.querySelector(`[data-items-rid="${rid}"]`);
    const thumbsEl = document.querySelector(`[data-thumbs-rid="${rid}"]`);
    if (itemsEl)  itemsEl.hidden  =  expanded;
    if (thumbsEl) thumbsEl.hidden = !expanded;
    return;
  }

  // + ADD ANOTHER RECIPIENT — validate all existing forms first
  if (e.target.closest('#mrAddMoreBtn')) {
    const allFilled = MR.recipients.every(
      r => r.firstName.trim() && r.lastName.trim() && r.address.trim()
    );
    if (!allFilled) {
      // Mark each empty input with error state
      document.querySelectorAll('.mr-recipient-block').forEach(card => {
        const rid = card.dataset.rid;
        const r   = MR.recipients.find(x => x.id === rid);
        if (!r) return;
        card.querySelectorAll('.mr-input').forEach(input => {
          const field = input.dataset.field;
          const empty = field && !r[field]?.trim();
          input.classList.toggle('mr-input--error', empty);
        });
      });
      // Show hint below the button
      mrShowAddMoreError('Please fill in all recipient fields before adding another.');
      return;
    }
    mrClearAddMoreError();
    mrAddRecipient();

    const newR      = MR.recipients[MR.recipients.length - 1];
    const newIndex  = MR.recipients.length - 1;
    const showRemove = MR.recipients.length >= 3;

    // If crossing from 2→3, fade Remove links onto existing cards (no re-render)
    if (MR.recipients.length === 3) mrFadeInRemoveLinks();

    // Append only the new card — existing cards are untouched
    const list    = document.getElementById('mrFormList');
    const newCard = mrCreateCardElement(newR, newIndex, showRemove);
    list?.appendChild(newCard);

    mrUpdateAddMoreBtn();
    mrUpdateContinueBtn();

    // Start hidden, then animate in with double-rAF
    newCard.style.opacity   = '0';
    newCard.style.transform = 'translateY(20px)';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        newCard.style.transition = 'opacity 0.45s ease, transform 0.55s cubic-bezier(0.34, 1.4, 0.64, 1)';
        newCard.style.opacity    = '1';
        newCard.style.transform  = 'translateY(0)';
        newCard.addEventListener('transitionend', () => {
          newCard.style.transition = '';
        }, { once: true });
        setTimeout(() => {
          newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      });
    });
    return;
  }

  // Remove a recipient form
  const mrRemoveBtn = e.target.closest('[data-mr-remove]');
  if (mrRemoveBtn) {
    mrRemoveRecipient(mrRemoveBtn.dataset.mrRemove);
    return;
  }

  // Autocomplete suggestion pick
  const acItem = e.target.closest('[data-ac-pick]');
  if (acItem) {
    const rid = acItem.dataset.acPick;
    const val = acItem.dataset.acVal;
    const r = MR.recipients.find(r => r.id === rid);
    if (r) {
      r.address = val;
      mrHideSuggestions(rid);
      // Update the input value in the DOM
      const input = document.querySelector(`.mr-address-input[data-rid="${rid}"]`);
      if (input) input.value = val;
      mrUpdateContinueBtn();
    }
    return;
  }

  // Select All Items
  const selectAllBtn = e.target.closest('[data-select-all]');
  if (selectAllBtn) {
    const rid = selectAllBtn.dataset.selectAll;
    if (!MR.checked[rid]) MR.checked[rid] = {};
    mrGetShippingItems().forEach(itemId => { MR.checked[rid][itemId] = true; });
    document.querySelectorAll(`[data-mr-check="${rid}"]`).forEach(cb => {
      cb.checked = true;
      const row = cb.closest('.mr-item-row');
      row?.classList.remove('mr-item-row--unchecked');
      row?.querySelectorAll('.mr-qty-btn').forEach(b => b.disabled = false);
      row?.querySelector('.mr-item-qty')?.classList.remove('mr-item-qty--disabled');
    });
    mrUpdateSelectAll(rid);   // disable button — everything now selected
    return;
  }

  // Item checkbox toggle (step 2)
  const checkbox = e.target.closest('.mr-item-checkbox');
  if (checkbox) {
    const rid    = checkbox.dataset.mrCheck;
    const itemId = checkbox.dataset.mrItem;
    const on     = checkbox.checked;
    if (!MR.checked[rid]) MR.checked[rid] = {};
    MR.checked[rid][itemId] = on;
    const row = checkbox.closest('.mr-item-row');
    row?.classList.toggle('mr-item-row--unchecked', !on);
    row?.querySelectorAll('.mr-qty-btn').forEach(b => b.disabled = !on);
    row?.querySelector('.mr-item-qty')?.classList.toggle('mr-item-qty--disabled', !on);
    mrUpdateSelectAll(rid);   // re-enable button if something just got unchecked
    return;
  }

  // Accordion toggle (step 2)
  const accordionBtn = e.target.closest('[data-accordion-toggle]');
  if (accordionBtn) {
    const rid  = accordionBtn.dataset.accordionToggle;
    const item = document.querySelector(`[data-accordion="${rid}"]`);
    if (!item) return;
    const body = item.querySelector('.mr-accordion-body');
    if (!body) return;

    if (item.classList.contains('is-open')) {
      // Close: lock current height → animate to 0
      body.style.transition = 'none';
      body.style.height     = body.scrollHeight + 'px';
      body.offsetHeight;                                    // force reflow
      body.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      body.style.height     = '0';
      body.addEventListener('transitionend', () => {
        item.classList.remove('is-open');
        body.style.transition = '';
      }, { once: true });
    } else {
      // Open: measure natural height FIRST (set auto → read → reset to 0 → animate)
      item.classList.add('is-open');
      body.style.transition = 'none';
      body.style.height     = 'auto';           // reveal to measure
      const naturalH        = body.scrollHeight; // read real height
      body.style.height     = '0';               // snap back
      body.offsetHeight;                          // force reflow before transition
      body.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      body.style.height     = naturalH + 'px';  // animate up
      body.addEventListener('transitionend', () => {
        body.style.height     = 'auto';          // free-flowing after animation ends
        body.style.transition = '';
      }, { once: true });
    }
    return;
  }

  // Recipient item qty dec (step 2) — min 1
  const mrDecBtn = e.target.closest('[data-mr-dec]');
  if (mrDecBtn) {
    const rid    = mrDecBtn.dataset.mrDec;
    const itemId = mrDecBtn.dataset.mrItem;
    if (MR.items[rid] && MR.items[rid][itemId] > 1) {
      MR.items[rid][itemId]--;
      const el = document.getElementById(`mrQty-${rid}-${itemId}`);
      if (el) el.textContent = MR.items[rid][itemId];
      // Disable minus when hitting 1
      if (MR.items[rid][itemId] === 1) mrDecBtn.disabled = true;
    }
    return;
  }

  // Recipient item qty inc (step 2) — re-enable minus when going above 1
  const mrIncBtn2 = e.target.closest('[data-mr-inc]');
  if (mrIncBtn2) {
    const rid    = mrIncBtn2.dataset.mrInc;
    const itemId = mrIncBtn2.dataset.mrItem;
    if (MR.items[rid]) {
      MR.items[rid][itemId] = (MR.items[rid][itemId] || 1) + 1;
      const el = document.getElementById(`mrQty-${rid}-${itemId}`);
      if (el) el.textContent = MR.items[rid][itemId];
      // Re-enable minus now that qty > 1
      const decBtn = document.querySelector(`[data-mr-dec="${rid}"][data-mr-item="${itemId}"]`);
      if (decBtn) decBtn.disabled = false;
    }
    return;
  }

  // Whole-area click on gift-message in recipient blocks (mirrors single shipment behaviour)
  const mrGiftArea = e.target.closest('.mr-cart-block .gift-message');
  if (mrGiftArea) {
    if (e.target.closest('.gift-content'))           return; // inside expanded content — ignore
    if (e.target.closest('label.gift-message__row')) return; // label handles its own click
    if (e.target.type === 'checkbox')                return; // checkbox handles itself
    // Toggle the hidden checkbox and fire change
    const cb = mrGiftArea.querySelector('.mr-gift-checkbox');
    if (!cb) return;
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // Gift save in recipient block
  const mrGiftSave = e.target.closest('[id^="mrGiftSaveBtn-"]');
  if (mrGiftSave) {
    const rid  = mrGiftSave.id.replace('mrGiftSaveBtn-', '');
    const text = document.getElementById(`mrGiftTextarea-${rid}`)?.value?.trim();
    if (!text) return;
    const savedText = document.getElementById(`mrGiftSavedText-${rid}`);
    if (savedText) savedText.textContent = `"${text}"`;
    document.getElementById(`mrGiftEditing-${rid}`).hidden = true;
    document.getElementById(`mrGiftSaved-${rid}`).hidden   = false;
    return;
  }

  // Gift edit in recipient block
  const mrGiftEdit = e.target.closest('[id^="mrGiftEditBtn-"]');
  if (mrGiftEdit) {
    const rid = mrGiftEdit.id.replace('mrGiftEditBtn-', '');
    document.getElementById(`mrGiftEditing-${rid}`).hidden = false;
    document.getElementById(`mrGiftSaved-${rid}`).hidden   = true;
    return;
  }

  // Gift remove in recipient block
  const mrGiftRemove = e.target.closest('[id^="mrGiftRemoveBtn-"]');
  if (mrGiftRemove) {
    const rid = mrGiftRemove.id.replace('mrGiftRemoveBtn-', '');
    const ta  = document.getElementById(`mrGiftTextarea-${rid}`);
    if (ta) ta.value = '';
    document.getElementById(`mrGiftEditing-${rid}`).hidden = false;
    document.getElementById(`mrGiftSaved-${rid}`).hidden   = true;
    const cb = document.querySelector(`.mr-gift-checkbox[data-gift-rid="${rid}"]`);
    if (cb) { cb.checked = false; }
    const content = document.getElementById(`mrGiftContent-${rid}`);
    if (content) content.hidden = true;
    return;
  }

  // Delete a single item from a recipient cart block
  const mrDelItemBtn = e.target.closest('[data-mr-del-item]');
  if (mrDelItemBtn) {
    const itemId = mrDelItemBtn.dataset.mrDelItem;
    const rid    = mrDelItemBtn.closest('[data-cart-rid]')?.dataset.cartRid;
    if (rid && itemId) mrRemoveCartItem(rid, itemId);
    return;
  }

  // Remove recipient cart block
  const cartRemoveBtn = e.target.closest('[data-cart-remove]');
  if (cartRemoveBtn) {
    mrRemoveRecipientBlock(cartRemoveBtn.dataset.cartRemove);
    return;
  }

  // Click outside mr-overlay backdrop → close
  if (e.target === document.getElementById('mrOverlay')) {
    closeMrModal();
    return;
  }

  // Disabled "Change to Pickup" → show tooltip
  const pickupWrap = e.target.closest('#changeToPickupWrap');
  if (pickupWrap && pickupWrap._tooltipEnabled) {
    pickupWrap.classList.add('show-tooltip');
    clearTimeout(pickupWrap._tooltipTimer);
    pickupWrap._tooltipTimer = setTimeout(() => {
      pickupWrap.classList.remove('show-tooltip');
    }, 2500);
    return;
  }

  // Disabled "Change to Shipping" (BOPIS) → show tooltip
  const shippingWrap = e.target.closest('#changeToShippingWrap');
  if (shippingWrap && shippingWrap._tooltipEnabled) {
    shippingWrap.classList.add('show-tooltip');
    clearTimeout(shippingWrap._tooltipTimer);
    shippingWrap._tooltipTimer = setTimeout(() => {
      shippingWrap.classList.remove('show-tooltip');
    }, 2500);
    return;
  }

  // Subscribe & Save → activate subscribed state
  const subCta = e.target.closest('[data-subscribe]');
  if (subCta) {
    const id = subCta.dataset.subscribe;
    toggleSubscription(id);
    return;
  }

  // Unsubscribe → revert to default state
  const unsubBtn = e.target.closest('[data-unsub]');
  if (unsubBtn) {
    const id = unsubBtn.dataset.unsub;
    toggleSubscription(id);
    return;
  }
});

// ── Tooltip hover (desktop) ──────────────────────────────────
document.addEventListener('mouseover', (e) => {
  const wrap = e.target.closest('#changeToPickupWrap, #changeToShippingWrap');
  if (wrap && wrap._tooltipEnabled) {
    wrap.classList.add('show-tooltip');
  }
});

document.addEventListener('mouseout', (e) => {
  const wrap = e.target.closest('#changeToPickupWrap, #changeToShippingWrap');
  if (wrap) {
    wrap.classList.remove('show-tooltip');
    clearTimeout(wrap._tooltipTimer);
  }
});

// ── Init ────────────────────────────────────────────────────
(function init() {
  Object.keys(ITEMS).forEach(renderItem);
  renderSummary();

  // Gift checkbox
  const giftCb = document.getElementById('giftCheckbox');
  if (giftCb) {
    giftCb.addEventListener('change', toggleGift);
  }
  const giftTa = document.getElementById('giftTextarea');
  if (giftTa) giftTa.addEventListener('input', updateGiftCounter);

  document.getElementById('giftSaveBtn')  ?.addEventListener('click', saveGiftMessage);
  document.getElementById('giftEditBtn')  ?.addEventListener('click', editGiftMessage);
  document.getElementById('giftRemoveBtn')?.addEventListener('click', removeGiftMessage);

  // Entire gift-message block is clickable (excluding expanded content area)
  document.querySelectorAll('.gift-message').forEach(block => {
    block.addEventListener('click', (e) => {
      if (e.target.closest('.gift-content')) return;      // inside textarea etc — ignore
      if (e.target.closest('label.gift-message__row')) return; // label handles its own click
      if (e.target.type === 'checkbox') return;           // checkbox handles itself
      const cb = block.querySelector('.gift-message__checkbox');
      if (cb) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // Gift checkbox change in recipient cart blocks (delegated — works for dynamic elements)
  document.addEventListener('change', e => {
    const cb = e.target.closest('.mr-gift-checkbox');
    if (!cb) return;
    const rid     = cb.dataset.giftRid;
    const content = document.getElementById(`mrGiftContent-${rid}`);
    if (content) content.hidden = !cb.checked;
  });

  // Clean up shake class after animation
  document.getElementById('mrFormList')?.addEventListener('animationend', e => {
    e.target.closest('.mr-shake')?.classList.remove('mr-shake');
  });

  // ── Multi-recipient form input handling ──────────────────
  const mrOverlay = document.getElementById('mrOverlay');
  if (mrOverlay) {
    mrOverlay.addEventListener('input', (e) => {
      const input = e.target;
      if (!input.dataset.rid || !input.dataset.field) return;
      const rid   = input.dataset.rid;
      const field = input.dataset.field;
      const r = MR.recipients.find(r => r.id === rid);
      if (!r) return;

      r[field] = input.value;

  // Gift textarea counter in recipient blocks
  const mrGiftTa = e.target.closest('[id^="mrGiftTextarea-"]');
  if (mrGiftTa) {
    const rid     = mrGiftTa.id.replace('mrGiftTextarea-', '');
    const len     = mrGiftTa.value.length;
    const counter = document.getElementById(`mrGiftCounter-${rid}`);
    const saveBtn = document.getElementById(`mrGiftSaveBtn-${rid}`);
    if (counter) counter.textContent = `${len}/150`;
    if (saveBtn) saveBtn.disabled = len === 0;
    return;
  }

      // Clear error state on this input once user starts typing
      input.classList.remove('mr-input--error');
      if (MR.recipients.every(rec => rec.firstName.trim() && rec.lastName.trim() && rec.address.trim())) {
        mrClearAddMoreError();
      }

      if (field === 'address') {
        const suggestions = mrGetSuggestions(input.value);
        mrShowSuggestions(rid, suggestions);
      }

      mrUpdateContinueBtn();
    });

    // Hide autocomplete on focus-out (delay to allow click-on-item to fire first)
    mrOverlay.addEventListener('focusout', (e) => {
      const input = e.target;
      if (!input.classList.contains('mr-address-input')) return;
      const rid = input.dataset.rid;
      setTimeout(() => mrHideSuggestions(rid), 180);
    });
  }
})();
