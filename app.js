(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const pickupLocationEl = $('#pickupLocation');
  const sameDropoffEl = $('#sameDropoff');
  const dropoffWrapEl = $('#dropoffWrap');
  const dropoffLocationEl = $('#dropoffLocation');
  const pickupDateEl = $('#pickupDate');
  const pickupTimeEl = $('#pickupTime');
  const dropoffDateEl = $('#dropoffDate');
  const dropoffTimeEl = $('#dropoffTime');
  const carCards = $$('.car-card');
  const searchBtn = $('#searchBtn');
  const modal = $('#summaryModal');
  const summaryEl = $('#summary');
  const closeModalBtn = $('#closeModal');
  const confirmBtn = $('#confirmBtn');
  const statusTime = $('#statusTime');
  // onboarding
  const onboardingSection = $('#onboarding');
  const contentSection = $('#content');
  const countrySelect = $('#countrySelect');
  const peopleCount = $('#peopleCount');
  const startBtn = $('#startBtn');
  const appHeaderTitle = document.querySelector('.app-header h1');

  function pad2(n) { return n.toString().padStart(2, '0'); }

  function setStatusTimeNow() {
    const now = new Date();
    statusTime.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }

  function toDateInputValue(date) {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    return `${y}-${m}-${d}`;
  }

  function toTimeInputValue(date) {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

  function initDates() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const start = new Date(now.getTime() + 60 * 60 * 1000); // +1h
    const end = new Date(start.getTime() + 48 * 60 * 60 * 1000); // +2d

    pickupDateEl.value = toDateInputValue(start);
    pickupTimeEl.value = toTimeInputValue(start);
    dropoffDateEl.value = toDateInputValue(end);
    dropoffTimeEl.value = toTimeInputValue(start);

    // min
    const minDate = toDateInputValue(now);
    pickupDateEl.min = minDate;
    dropoffDateEl.min = minDate;
  }

  function setDropoffVisibility() {
    const show = !sameDropoffEl.checked;
    dropoffWrapEl.hidden = !show;
    if (!show) {
      dropoffLocationEl.value = '';
    }
  }

  function getSelectedCar() {
    const el = carCards.find(c => c.classList.contains('active'));
    if (!el) return null;
    return { name: el.dataset.car, price: el.dataset.price };
  }

  function validateForm() {
    const pickupOk = pickupLocationEl.value !== '';
    const carOk = !!getSelectedCar();
    const dropoffPlaceOk = sameDropoffEl.checked || dropoffLocationEl.value !== '';

    const start = new Date(`${pickupDateEl.value}T${pickupTimeEl.value}`);
    const end = new Date(`${dropoffDateEl.value}T${dropoffTimeEl.value}`);
    const timeOk = isFinite(start) && isFinite(end) && end > start;

    searchBtn.disabled = !(pickupOk && dropoffPlaceOk && carOk && timeOk);
  }

  function attachEvents() {
    // onboarding validation
    [countrySelect, peopleCount].forEach(el => el && el.addEventListener('input', () => {
      const ok = countrySelect.value !== '' && peopleCount.value !== '';
      startBtn.disabled = !ok;
    }));

    // start flow
    startBtn.addEventListener('click', () => {
      const preferences = {
        country: countrySelect.value,
        people: Number(peopleCount.value)
      };
      // store for later use in summary
      window.demoPrefs = preferences;

      onboardingSection.hidden = true;
      contentSection.hidden = false;
      appHeaderTitle.textContent = '租車';
      validateForm();
    });

    sameDropoffEl.addEventListener('change', () => { setDropoffVisibility(); validateForm(); });
    [pickupLocationEl, dropoffLocationEl, pickupDateEl, pickupTimeEl, dropoffDateEl, dropoffTimeEl]
      .forEach(el => el.addEventListener('input', validateForm));

    carCards.forEach(card => {
      card.addEventListener('click', () => {
        carCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        validateForm();
      });
    });

    searchBtn.addEventListener('click', showSummary);
    $('#helpBtn').addEventListener('click', showQuickTips);
    closeModalBtn.addEventListener('click', () => modal.hidden = true);
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) modal.hidden = true;
    });
    confirmBtn.addEventListener('click', () => {
      confirmBtn.textContent = '已示意 — 完成';
      setTimeout(() => modal.hidden = true, 500);
    });
  }

  function showSummary() {
    const car = getSelectedCar();
    const pickupPlace = pickupLocationEl.value;
    const dropoffPlace = sameDropoffEl.checked ? pickupPlace : (dropoffLocationEl.value || '—');
    const startStr = `${pickupDateEl.value} ${pickupTimeEl.value}`;
    const endStr = `${dropoffDateEl.value} ${dropoffTimeEl.value}`;

    const days = Math.max(1, Math.ceil((new Date(`${dropoffDateEl.value}T${dropoffTimeEl.value}`) - new Date(`${pickupDateEl.value}T${pickupTimeEl.value}`)) / (24*60*60*1000)));

    const prefs = window.demoPrefs || { country: '—', people: '—' };

    summaryEl.innerHTML = [
      `<div><strong>目的地</strong>：${prefs.country}｜<strong>人數</strong>：${prefs.people}</div>`,
      `<div><strong>車款</strong>：${car?.name}（${car?.price}）</div>`,
      `<div><strong>取車</strong>：${pickupPlace}｜${startStr}</div>`,
      `<div><strong>還車</strong>：${dropoffPlace}｜${endStr}</div>`,
      `<div><strong>預估天數</strong>：${days} 天</div>`
    ].join('');
    modal.hidden = false;
  }

  function showQuickTips() {
    summaryEl.innerHTML = [
      '<div>這是報告用 Demo：</div>',
      '<ul style="margin:6px 0 0 18px; padding:0;">',
      '<li>選車卡片可點選</li>',
      '<li>同地還車可切換</li>',
      '<li>填妥後下方按鈕啟用</li>',
      '<li>點擊可顯示租車摘要</li>',
      '</ul>'
    ].join('');
    $('#summaryTitle').textContent = '快速提示';
    modal.hidden = false;
  }

  // bootstrap
  setStatusTimeNow();
  setInterval(setStatusTimeNow, 30_000);
  // initial flow: show onboarding first
  appHeaderTitle.textContent = '旅遊設定';
  contentSection.hidden = true;
  onboardingSection.hidden = false;

  initDates();
  setDropoffVisibility();
  attachEvents();
  validateForm();
})();


