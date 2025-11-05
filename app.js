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
  // menu
  const menuToggle = $('#menuToggle');
  const menuOverlay = $('#menuOverlay');
  const menuClose = $('#menuClose');
  // navigation
  const navigationSection = $('#navigation');
  const navDestination = $('#navDestination');
  const navQuickBtns = $$('.nav-quick-btn');
  const navStatus = $('#navStatus');
  const navStatusDest = $('#navStatusDest');
  const navEstTime = $('#navEstTime');
  const navStopBtn = $('#navStopBtn');
  const navMapContainer = $('#navMap');
  const navMapZoomIn = $('#navMapZoomIn');
  const navMapZoomOut = $('#navMapZoomOut');
  const navMapCenter = $('#navMapCenter');
  const navVoiceBtn = $('#navVoiceBtn');
  let navInterval = null;
  let navMap = null;
  let navMapMarkers = {
    start: null,
    destination: null
  };
  let navMapRoute = null;
  let currentLocation = { lat: 25.0330, lng: 121.5654 }; // 默认台北市中心
  let recognition = null;
  let isListening = false;
  // experience sharing
  const experienceSection = $('#experience');
  const shareExperienceBtn = $('#shareExperienceBtn');
  const shareExperienceModal = $('#shareExperienceModal');
  const shareExperienceForm = $('#shareExperienceForm');
  const experienceType = $('#experienceType');
  const experienceTitle = $('#experienceTitle');
  const experienceLocation = $('#experienceLocation');
  const experienceContent = $('#experienceContent');
  const charCount = $('#charCount');
  const cancelShareBtn = $('#cancelShareBtn');
  const submitShareBtn = $('#submitShareBtn');
  const experienceList = $('#experienceList');
  const filterBtns = $$('.filter-btn');
  let currentFilter = 'all';
  // traffic rules
  const trafficRulesSection = $('#traffic-rules');
  const trafficCountrySelect = $('#trafficCountrySelect');
  const trafficRulesContent = $('#trafficRulesContent');
  const trafficRulesEmpty = $('#trafficRulesEmpty');
  const trafficSignsGrid = $('#trafficSignsGrid');
  const trafficRulesList = $('#trafficRulesList');
  const trafficNotesList = $('#trafficNotesList');
  // language
  const languageModal = $('#languageModal');
  const languageItems = $$('.language-item');
  const closeLanguageModal = $('#closeLanguageModal');
  let currentLanguage = localStorage.getItem('appLanguage') || 'zh-TW';

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
    
    // menu toggle
    menuToggle.addEventListener('click', () => {
      menuOverlay.hidden = false;
      menuToggle.classList.add('active');
    });
    menuClose.addEventListener('click', closeMenu);
    menuOverlay.addEventListener('click', (e) => {
      if (e.target === menuOverlay) closeMenu();
    });
    // menu items navigation
    $$('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const action = item.dataset.action;
        handleMenuAction(action);
        closeMenu();
      });
    });

    // navigation handlers
    navDestination.addEventListener('input', () => {
      const startNavBtnFooter = $('#startNavBtnFooter');
      if (startNavBtnFooter) {
        startNavBtnFooter.disabled = !navDestination.value.trim();
      }
      // 如果输入了地点，可以搜索并更新地图
      if (navDestination.value.trim()) {
        const quickBtn = navQuickBtns.find(btn => btn.dataset.dest === navDestination.value.trim());
        if (quickBtn) {
          const lat = parseFloat(quickBtn.dataset.lat);
          const lng = parseFloat(quickBtn.dataset.lng);
          if (!isNaN(lat) && !isNaN(lng)) {
            updateMapDestination(lat, lng, quickBtn.dataset.dest);
          }
        }
      }
    });

    navQuickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        navQuickBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        navDestination.value = btn.dataset.dest;
        const startNavBtnFooter = $('#startNavBtnFooter');
        if (startNavBtnFooter) {
          startNavBtnFooter.disabled = false;
        }
        // 更新地图标记
        const lat = parseFloat(btn.dataset.lat);
        const lng = parseFloat(btn.dataset.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          updateMapDestination(lat, lng, btn.dataset.dest);
        }
      });
    });

    navMapZoomIn.addEventListener('click', () => {
      if (navMap) navMap.zoomIn();
    });
    navMapZoomOut.addEventListener('click', () => {
      if (navMap) navMap.zoomOut();
    });
    navMapCenter.addEventListener('click', () => {
      if (navMap && navMapMarkers.destination) {
        navMap.setView([navMapMarkers.destination.getLatLng().lat, navMapMarkers.destination.getLatLng().lng], 15);
      } else if (navMap) {
        navMap.setView(currentLocation, 13);
      }
    });

    navStopBtn.addEventListener('click', stopNavigation);

    // 语音输入功能
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = 'zh-TW'; // 默认使用繁体中文
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        navDestination.value = transcript;
        // 触发输入事件，以便更新地图
        navDestination.dispatchEvent(new Event('input'));
        updateVoiceButtonState(false);
      };

      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        updateVoiceButtonState(false);
        if (event.error === 'not-allowed') {
          showMessage('語音輸入', '請允許瀏覽器使用麥克風權限');
        } else if (event.error === 'no-speech') {
          showMessage('語音輸入', '未檢測到語音，請重試');
        }
      };

      recognition.onend = () => {
        updateVoiceButtonState(false);
      };

      if (navVoiceBtn) {
        navVoiceBtn.addEventListener('click', () => {
          if (isListening) {
            recognition.stop();
            updateVoiceButtonState(false);
          } else {
            try {
              recognition.start();
              updateVoiceButtonState(true);
            } catch (error) {
              console.error('启动语音识别失败:', error);
              updateVoiceButtonState(false);
            }
          }
        });
      }
    } else {
      // 浏览器不支持语音识别
      if (navVoiceBtn) {
        navVoiceBtn.style.display = 'none';
      }
    }

    // experience sharing handlers
    shareExperienceBtn.addEventListener('click', () => {
      shareExperienceModal.hidden = false;
      experienceContent.value = '';
      experienceTitle.value = '';
      experienceLocation.value = '';
      experienceType.value = '';
      charCount.textContent = '0';
    });

    cancelShareBtn.addEventListener('click', () => {
      shareExperienceModal.hidden = true;
      shareExperienceForm.reset();
      charCount.textContent = '0';
    });

    shareExperienceModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        shareExperienceModal.hidden = true;
        shareExperienceForm.reset();
        charCount.textContent = '0';
      }
    });

    experienceContent.addEventListener('input', () => {
      charCount.textContent = experienceContent.value.length;
    });

    shareExperienceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleShareExperience();
    });

    // filter buttons
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        filterExperiences();
      });
    });

    // like buttons
    $$('.like-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleLike(btn);
      });
    });

    // traffic rules handlers
    trafficCountrySelect.addEventListener('change', () => {
      const country = trafficCountrySelect.value;
      if (country) {
        loadTrafficRules(country);
      } else {
        trafficRulesContent.hidden = true;
        trafficRulesEmpty.hidden = false;
      }
    });

    // language handlers
    languageItems.forEach(item => {
      item.addEventListener('click', () => {
        const lang = item.dataset.lang;
        changeLanguage(lang);
      });
    });

    closeLanguageModal.addEventListener('click', () => {
      languageModal.hidden = true;
    });

    languageModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        languageModal.hidden = true;
      }
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

  function closeMenu() {
    menuOverlay.hidden = true;
    menuToggle.classList.remove('active');
  }

  function handleMenuAction(action) {
    const footer = document.querySelector('.app-footer');
    switch(action) {
      case 'rental':
        // 切换到租车预订页面
        onboardingSection.hidden = true;
        contentSection.hidden = false;
        navigationSection.hidden = true;
        experienceSection.hidden = true;
        trafficRulesSection.hidden = true;
        appHeaderTitle.textContent = '租車';
        footer.innerHTML = '<button id="searchBtn" class="primary" disabled>查看可租車款</button>';
        // 重新绑定事件
        const newSearchBtn = $('#searchBtn');
        newSearchBtn.addEventListener('click', showSummary);
        newSearchBtn.disabled = true;
        validateForm();
        break;
      case 'navigation':
        // 切换到即时导航页面
        onboardingSection.hidden = true;
        contentSection.hidden = true;
        navigationSection.hidden = false;
        experienceSection.hidden = true;
        trafficRulesSection.hidden = true;
        appHeaderTitle.textContent = '即時導航';
        footer.innerHTML = '<button id="startNavBtnFooter" class="primary" disabled>開始導航</button>';
        // 重新绑定事件
        const startNavBtnFooter = $('#startNavBtnFooter');
        startNavBtnFooter.addEventListener('click', startNavigation);
        startNavBtnFooter.disabled = !navDestination.value.trim();
        // 更新语音识别语言（根据当前语言设置）
        if (recognition) {
          const langMap = {
            'zh-TW': 'zh-TW',
            'en': 'en-US',
            'ja': 'ja-JP',
            'ko': 'ko-KR'
          };
          recognition.lang = langMap[currentLanguage] || 'zh-TW';
        }
        // 初始化地图（延迟以确保容器已渲染）
        setTimeout(() => {
          initNavigationMap();
        }, 100);
        break;
      case 'experience':
        // 切换到驾驶经验分享页面
        onboardingSection.hidden = true;
        contentSection.hidden = true;
        navigationSection.hidden = true;
        experienceSection.hidden = false;
        trafficRulesSection.hidden = true;
        appHeaderTitle.textContent = '駕駛經驗分享';
        footer.innerHTML = '';
        break;
      case 'traffic-rules':
        // 切换到交通号誌及規則页面
        onboardingSection.hidden = true;
        contentSection.hidden = true;
        navigationSection.hidden = true;
        experienceSection.hidden = true;
        trafficRulesSection.hidden = false;
        appHeaderTitle.textContent = '當地交通號誌及規則';
        footer.innerHTML = '';
        break;
      case 'orders':
        showMessage('我的訂單', '此功能僅為Demo展示');
        break;
      case 'favorites':
        showMessage('收藏車款', '此功能僅為Demo展示');
        break;
      case 'profile':
        showMessage('個人資料', '此功能僅為Demo展示');
        break;
      case 'language':
        // 打开语言选择模态框
        languageModal.hidden = false;
        updateLanguageCheck();
        break;
      case 'settings':
        showMessage('設定', '此功能僅為Demo展示');
        break;
      case 'about':
        showMessage('關於我們', '這是租車App的Demo版本');
        break;
    }
  }

  function showMessage(title, message) {
    summaryEl.innerHTML = `<div>${message}</div>`;
    $('#summaryTitle').textContent = title;
    modal.hidden = false;
  }

  function initNavigationMap() {
    if (navMap) {
      navMap.remove();
      navMap = null;
      navMapMarkers.start = null;
      navMapMarkers.destination = null;
      navMapRoute = null;
    }

    // 初始化地图，默认显示台北市中心
    navMap = L.map('navMap', {
      zoomControl: false,
      attributionControl: false
    }).setView(currentLocation, 13);

    // 添加OpenStreetMap图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(navMap);

    // 添加当前位置标记
    navMapMarkers.start = L.marker(currentLocation, {
      icon: L.divIcon({
        className: 'nav-map-start-marker',
        html: '<div style="background: #16a34a; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(navMap);

    // 允许地图交互
    navMap.on('click', (e) => {
      // 点击地图可以设置目的地（如果还没有开始导航）
      if (!navStatus.hidden) return;
      const { lat, lng } = e.latlng;
      updateMapDestination(lat, lng, `位置 (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      navDestination.value = `位置 (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      const startNavBtnFooter = $('#startNavBtnFooter');
      if (startNavBtnFooter) {
        startNavBtnFooter.disabled = false;
      }
    });
  }

  function updateMapDestination(lat, lng, destName) {
    if (!navMap) return;

    // 移除旧的目的地标记
    if (navMapMarkers.destination) {
      navMap.removeLayer(navMapMarkers.destination);
    }
    if (navMapRoute) {
      navMap.removeLayer(navMapRoute);
    }

    // 添加目的地标记
    navMapMarkers.destination = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'nav-map-dest-marker',
        html: '<div style="background: #3d6cff; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px;">📍</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(navMap);

    // 添加路线（模拟）
    const routePoints = [
      [currentLocation.lat, currentLocation.lng],
      [currentLocation.lat + (lat - currentLocation.lat) * 0.3, currentLocation.lng + (lng - currentLocation.lng) * 0.3],
      [currentLocation.lat + (lat - currentLocation.lat) * 0.7, currentLocation.lng + (lng - currentLocation.lng) * 0.7],
      [lat, lng]
    ];

    navMapRoute = L.polyline(routePoints, {
      color: '#3d6cff',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10'
    }).addTo(navMap);

    // 调整地图视野以包含起点和终点
    const bounds = L.latLngBounds([currentLocation, [lat, lng]]);
    navMap.fitBounds(bounds, { padding: [40, 40] });
  }

  function startNavigation() {
    const dest = navDestination.value.trim();
    if (!dest) return;

    navStatusDest.textContent = dest;
    navStatus.hidden = false;
    const startNavBtnFooter = $('#startNavBtnFooter');
    if (startNavBtnFooter) {
      startNavBtnFooter.disabled = true;
      startNavBtnFooter.textContent = '導航中...';
    }
    navDestination.disabled = true;
    navQuickBtns.forEach(btn => btn.disabled = true);

    // 如果地图上有目的地标记，确保路线显示
    if (navMapMarkers.destination) {
      const destLat = navMapMarkers.destination.getLatLng().lat;
      const destLng = navMapMarkers.destination.getLatLng().lng;
      updateMapDestination(destLat, destLng, dest);
    }

    // 模拟计算预计时间
    const estTime = Math.floor(Math.random() * 30) + 15; // 15-45分钟
    navEstTime.textContent = estTime;

    // 模拟导航状态更新和移动
    let timeLeft = estTime;
    let progress = 0;
    navInterval = setInterval(() => {
      timeLeft--;
      progress = (estTime - timeLeft) / estTime;
      
      // 模拟移动起点标记（沿着路线移动）
      if (navMapMarkers.start && navMapRoute) {
        const latlngs = navMapRoute.getLatLngs();
        if (Array.isArray(latlngs) && latlngs.length > 0) {
          const totalPoints = latlngs.length;
          const currentIndex = Math.floor(progress * (totalPoints - 1));
          const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);
          const currentPoint = latlngs[currentIndex];
          const nextPoint = latlngs[nextIndex];
          const localProgress = (progress * (totalPoints - 1)) - currentIndex;
          
          if (currentPoint && nextPoint) {
            const newLat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * localProgress;
            const newLng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * localProgress;
            navMapMarkers.start.setLatLng([newLat, newLng]);
          }
        }
      }

      if (timeLeft <= 0) {
        navEstTime.textContent = '即將到達';
        clearInterval(navInterval);
        navInterval = null;
      } else {
        navEstTime.textContent = timeLeft;
      }
    }, 1000);
  }

  function stopNavigation() {
    if (navInterval) {
      clearInterval(navInterval);
      navInterval = null;
    }
    navStatus.hidden = true;
    const startNavBtnFooter = $('#startNavBtnFooter');
    if (startNavBtnFooter) {
      startNavBtnFooter.disabled = !navDestination.value.trim();
      startNavBtnFooter.textContent = '開始導航';
    }
    navDestination.disabled = false;
    navQuickBtns.forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('active');
    });
    
    // 重置起点标记到原始位置
    if (navMapMarkers.start) {
      navMapMarkers.start.setLatLng(currentLocation);
    }
    
    navDestination.value = '';
    navEstTime.textContent = '--';
  }

  function updateVoiceButtonState(listening) {
    isListening = listening;
    if (!navVoiceBtn) return;
    if (listening) {
      navVoiceBtn.classList.add('listening');
      navVoiceBtn.title = '點擊停止錄音';
    } else {
      navVoiceBtn.classList.remove('listening');
      navVoiceBtn.title = '語音輸入';
    }
  }

  function handleShareExperience() {
    const type = experienceType.value;
    const title = experienceTitle.value.trim();
    const location = experienceLocation.value.trim();
    const content = experienceContent.value.trim();

    if (!type || !title || !content) {
      return;
    }

    // 创建新的分享卡片
    const typeLabels = {
      experience: '駕駛經驗',
      attraction: '推薦景點',
      tip: '實用小提醒'
    };

    const avatars = ['🚗', '🌴', '⚡', '🏔️', '🌊', '🚙', '🗺️', '💡'];
    const names = ['王小明', '李美麗', '張實用', '陳旅行', '林探索', '黃冒險'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    const randomName = names[Math.floor(Math.random() * names.length)];

    const newCard = document.createElement('div');
    newCard.className = 'experience-card';
    newCard.dataset.type = type;
    newCard.innerHTML = `
      <div class="experience-card-header">
        <div class="experience-author">
          <span class="author-avatar">${randomAvatar}</span>
          <span class="author-name">${randomName}</span>
        </div>
        <span class="experience-type-badge type-${type}">${typeLabels[type]}</span>
      </div>
      <div class="experience-card-content">
        <h3 class="experience-card-title">${title}</h3>
        <p class="experience-card-text">${content}</p>
      </div>
      <div class="experience-card-footer">
        <span class="experience-location">📍 ${location || '通用提醒'}</span>
        <span class="experience-date">剛剛</span>
      </div>
      <div class="experience-card-actions">
        <button class="action-btn like-btn" data-liked="false">👍 <span>0</span></button>
        <button class="action-btn comment-btn">💬 <span>0</span></button>
      </div>
    `;

    // 绑定点赞事件
    const likeBtn = newCard.querySelector('.like-btn');
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLike(likeBtn);
    });

    // 插入到列表最前面
    experienceList.insertBefore(newCard, experienceList.firstChild);

    // 关闭模态框并重置表单
    shareExperienceModal.hidden = true;
    shareExperienceForm.reset();
    charCount.textContent = '0';

    // 应用当前过滤器
    filterExperiences();

    // 显示成功提示
    showMessage('分享成功', '您的經驗已成功分享！');
  }

  function filterExperiences() {
    const cards = $$('.experience-card');
    cards.forEach(card => {
      if (currentFilter === 'all' || card.dataset.type === currentFilter) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  function handleLike(btn) {
    const isLiked = btn.dataset.liked === 'true';
    const countSpan = btn.querySelector('span');
    let count = parseInt(countSpan.textContent) || 0;

    if (isLiked) {
      btn.dataset.liked = 'false';
      count--;
      btn.style.opacity = '1';
    } else {
      btn.dataset.liked = 'true';
      count++;
      btn.style.opacity = '0.7';
    }

    countSpan.textContent = count;
  }

  // Traffic rules data
  const trafficRulesData = {
    japan: {
      signs: [
        { icon: '🛑', name: '停止標誌', desc: '必須完全停止，確認安全後再行駛' },
        { icon: '⚠️', name: '注意標誌', desc: '提醒駕駛注意前方路況' },
        { icon: '🚫', name: '禁止進入', desc: '禁止車輛進入該路段' },
        { icon: '⛔', name: '禁止停車', desc: '禁止在該區域停車' },
        { icon: '🚸', name: '注意行人', desc: '注意前方有行人穿越' },
        { icon: '🔄', name: '單行道', desc: '只能單向行駛' }
      ],
      rules: [
        '日本為右駕國家，車輛靠左行駛',
        '高速公路需使用ETC卡，過路費較高',
        '市區限速通常為30-50公里/小時',
        '禁止酒駕，血液酒精濃度0.03%即違法',
        '必須繫安全帶，後座乘客也需繫安全帶',
        '禁止使用手機（包括免持）',
        '雨天需開啟頭燈'
      ],
      notes: [
        '需要國際駕照及日文譯本',
        '租車時需確認是否有ETC卡',
        '注意高速公路休息站的油價',
        '部分地區有雪地駕駛限制',
        '沖繩等地區有特殊交通規則',
        '建議購買租車保險'
      ]
    },
    korea: {
      signs: [
        { icon: '🛑', name: '停止標誌', desc: '必須完全停止' },
        { icon: '⚠️', name: '注意標誌', desc: '注意前方路況' },
        { icon: '🚫', name: '禁止進入', desc: '禁止車輛進入' },
        { icon: '⛔', name: '禁止停車', desc: '禁止停車區域' },
        { icon: '🚸', name: '注意行人', desc: '注意行人穿越' },
        { icon: '🔄', name: '單行道', desc: '單向行駛' }
      ],
      rules: [
        '韓國為右駕國家，車輛靠左行駛',
        '市區限速通常為50-60公里/小時',
        '高速公路限速100-110公里/小時',
        '禁止酒駕，酒精濃度0.05%即違法',
        '必須繫安全帶',
        '禁止使用手機',
        '夜間行車需開啟頭燈'
      ],
      notes: [
        '需要國際駕照及韓文譯本',
        '首爾市區交通繁忙，建議避開尖峰時段',
        '高速公路需使用Hi-pass電子收費',
        '注意韓國的左轉專用車道',
        '部分地區有外國車輛限制'
      ]
    },
    thailand: {
      signs: [
        { icon: '🛑', name: '停止標誌', desc: '必須完全停止' },
        { icon: '⚠️', name: '注意標誌', desc: '注意前方路況' },
        { icon: '🚫', name: '禁止進入', desc: '禁止車輛進入' },
        { icon: '⛔', name: '禁止停車', desc: '禁止停車' },
        { icon: '🚸', name: '注意行人', desc: '注意行人' },
        { icon: '🔄', name: '單行道', desc: '單向行駛' }
      ],
      rules: [
        '泰國為左駕國家，車輛靠右行駛',
        '市區限速通常為50-60公里/小時',
        '高速公路限速120公里/小時',
        '禁止酒駕，酒精濃度0.05%即違法',
        '必須繫安全帶（前座）',
        '摩托車騎士需戴安全帽',
        '禁止使用手機'
      ],
      notes: [
        '需要國際駕照',
        '曼谷市區交通擁擠，建議使用大眾運輸',
        '注意摩托車和嘟嘟車的交通習慣',
        '部分地區有左轉限制',
        '建議購買完整保險',
        '注意行駛方向與台灣相反'
      ]
    },
    usa: {
      signs: [
        { icon: '🛑', name: 'STOP', desc: '必須完全停止3秒' },
        { icon: '⚠️', name: 'YIELD', desc: '讓路給其他車輛' },
        { icon: '🚫', name: 'NO ENTRY', desc: '禁止進入' },
        { icon: '⛔', name: 'NO PARKING', desc: '禁止停車' },
        { icon: '🚸', name: 'PEDESTRIAN CROSSING', desc: '注意行人' },
        { icon: '🔄', name: 'ONE WAY', desc: '單行道' }
      ],
      rules: [
        '美國為左駕國家，車輛靠右行駛',
        '市區限速通常為25-35英里/小時（約40-56公里/小時）',
        '高速公路限速65-75英里/小時（約105-120公里/小時）',
        '禁止酒駕，血液酒精濃度0.08%即違法（各州不同）',
        '必須繫安全帶',
        '禁止使用手機（各州規定不同）',
        '右轉紅燈需完全停止後確認安全才可行駛'
      ],
      notes: [
        '需要國際駕照或台灣駕照（部分州承認）',
        '各州交通規則略有不同，需注意',
        '高速公路需遵守車道規則，超車請走左側',
        '注意STOP標誌必須完全停止',
        '部分州允許右轉紅燈（需確認）',
        '建議購買完整保險'
      ]
    },
    europe: {
      signs: [
        { icon: '🛑', name: 'STOP', desc: '必須完全停止' },
        { icon: '⚠️', name: 'ATTENTION', desc: '注意前方路況' },
        { icon: '🚫', name: 'INTERDICTION', desc: '禁止進入' },
        { icon: '⛔', name: 'STATIONNEMENT INTERDIT', desc: '禁止停車' },
        { icon: '🚸', name: 'PASSAGE PIÉTON', desc: '注意行人' },
        { icon: '🔄', name: 'SENS UNIQUE', desc: '單行道' }
      ],
      rules: [
        '歐洲為左駕國家，車輛靠右行駛',
        '市區限速通常為50公里/小時',
        '高速公路限速120-130公里/小時（各國不同）',
        '禁止酒駕，酒精濃度0.05%即違法（各國不同）',
        '必須繫安全帶',
        '禁止使用手機',
        '部分國家有日間行車燈強制規定'
      ],
      notes: [
        '需要國際駕照',
        '申根區內可自由通行',
        '注意各國的環保標章要求（如法國）',
        '高速公路需購買通行證（部分國家）',
        '注意各國的停車規定',
        '建議購買完整保險',
        '注意部分城市有低排放區限制'
      ]
    },
    australia: {
      signs: [
        { icon: '🛑', name: 'STOP', desc: '必須完全停止' },
        { icon: '⚠️', name: 'CAUTION', desc: '注意前方路況' },
        { icon: '🚫', name: 'NO ENTRY', desc: '禁止進入' },
        { icon: '⛔', name: 'NO PARKING', desc: '禁止停車' },
        { icon: '🚸', name: 'PEDESTRIAN CROSSING', desc: '注意行人' },
        { icon: '🔄', name: 'ONE WAY', desc: '單行道' }
      ],
      rules: [
        '澳洲為右駕國家，車輛靠左行駛',
        '市區限速通常為50-60公里/小時',
        '高速公路限速100-110公里/小時',
        '禁止酒駕，血液酒精濃度0.05%即違法',
        '必須繫安全帶',
        '禁止使用手機',
        '長途駕駛需每2小時休息'
      ],
      notes: [
        '需要國際駕照',
        '注意與台灣相反的駕駛方向',
        '注意野生動物（袋鼠、駱駝等）',
        '長途駕駛需注意疲勞',
        '部分地區有沙塵暴風險',
        '建議購買完整保險'
      ]
    },
    uk: {
      signs: [
        { icon: '🛑', name: 'STOP', desc: '必須完全停止' },
        { icon: '⚠️', name: 'GIVE WAY', desc: '讓路給其他車輛' },
        { icon: '🚫', name: 'NO ENTRY', desc: '禁止進入' },
        { icon: '⛔', name: 'NO PARKING', desc: '禁止停車' },
        { icon: '🚸', name: 'PEDESTRIAN CROSSING', desc: '注意行人' },
        { icon: '🔄', name: 'ONE WAY', desc: '單行道' }
      ],
      rules: [
        '英國為右駕國家，車輛靠左行駛',
        '市區限速通常為30英里/小時（約48公里/小時）',
        '高速公路限速70英里/小時（約113公里/小時）',
        '禁止酒駕，血液酒精濃度0.08%即違法',
        '必須繫安全帶',
        '禁止使用手機',
        '注意環形交叉路口（Roundabout）'
      ],
      notes: [
        '需要國際駕照',
        '注意與台灣相反的駕駛方向',
        '熟悉環形交叉路口的規則',
        '注意窄路會車規則',
        '部分地區有收費道路',
        '建議購買完整保險',
        '注意倫敦的擁擠費（Congestion Charge）'
      ]
    }
  };

  function loadTrafficRules(country) {
    const data = trafficRulesData[country];
    if (!data) {
      trafficRulesContent.hidden = true;
      trafficRulesEmpty.hidden = false;
      return;
    }

    // 顯示交通號誌
    trafficSignsGrid.innerHTML = data.signs.map(sign => `
      <div class="traffic-sign-card">
        <div class="traffic-sign-icon">${sign.icon}</div>
        <div class="traffic-sign-name">${sign.name}</div>
        <div class="traffic-sign-desc">${sign.desc}</div>
      </div>
    `).join('');

    // 顯示交通規則
    trafficRulesList.innerHTML = data.rules.map(rule => `
      <div class="traffic-rule-item">
        <span class="rule-bullet">•</span>
        <span class="rule-text">${rule}</span>
      </div>
    `).join('');

    // 顯示注意事項
    trafficNotesList.innerHTML = data.notes.map(note => `
      <div class="traffic-rule-item">
        <span class="rule-bullet">⚠️</span>
        <span class="rule-text">${note}</span>
      </div>
    `).join('');

    trafficRulesContent.hidden = false;
    trafficRulesEmpty.hidden = true;
  }

  // Translation data
  const translations = {
    'zh-TW': {
      menu: '選單',
      rental: '租車預訂',
      navigation: '即時導航',
      experience: '駕駛經驗分享',
      trafficRules: '當地交通號誌及規則',
      orders: '我的訂單',
      favorites: '收藏車款',
      profile: '個人資料',
      language: '多語言',
      settings: '設定',
      about: '關於我們',
      languageTitle: '選擇語言',
      confirm: '確定',
      close: '關閉',
      back: '返回',
      cancel: '取消',
      submit: '提交',
      search: '搜尋',
      start: '開始',
      stop: '停止',
      loading: '載入中...',
      error: '錯誤',
      success: '成功',
      empty: '無資料'
    },
    'en': {
      menu: 'Menu',
      rental: 'Car Rental',
      navigation: 'Navigation',
      experience: 'Experience Sharing',
      trafficRules: 'Traffic Rules',
      orders: 'My Orders',
      favorites: 'Favorites',
      profile: 'Profile',
      language: 'Language',
      settings: 'Settings',
      about: 'About Us',
      languageTitle: 'Select Language',
      confirm: 'Confirm',
      close: 'Close',
      back: 'Back',
      cancel: 'Cancel',
      submit: 'Submit',
      search: 'Search',
      start: 'Start',
      stop: 'Stop',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      empty: 'No Data'
    },
    'ja': {
      menu: 'メニュー',
      rental: 'レンタカー予約',
      navigation: 'ナビゲーション',
      experience: '運転経験共有',
      trafficRules: '交通標識と規則',
      orders: 'マイオーダー',
      favorites: 'お気に入り',
      profile: 'プロフィール',
      language: '言語',
      settings: '設定',
      about: '私たちについて',
      languageTitle: '言語を選択',
      confirm: '確認',
      close: '閉じる',
      back: '戻る',
      cancel: 'キャンセル',
      submit: '送信',
      search: '検索',
      start: '開始',
      stop: '停止',
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
      empty: 'データなし'
    },
    'ko': {
      menu: '메뉴',
      rental: '렌터카 예약',
      navigation: '내비게이션',
      experience: '운전 경험 공유',
      trafficRules: '교통 표지 및 규칙',
      orders: '내 주문',
      favorites: '즐겨찾기',
      profile: '프로필',
      language: '언어',
      settings: '설정',
      about: '회사 소개',
      languageTitle: '언어 선택',
      confirm: '확인',
      close: '닫기',
      back: '뒤로',
      cancel: '취소',
      submit: '제출',
      search: '검색',
      start: '시작',
      stop: '중지',
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
      empty: '데이터 없음'
    }
  };

  function updateLanguageCheck() {
    languageItems.forEach(item => {
      const check = item.querySelector('.language-check');
      if (item.dataset.lang === currentLanguage) {
        check.style.display = 'inline-block';
        item.classList.add('active');
      } else {
        check.style.display = 'none';
        item.classList.remove('active');
      }
    });
  }

  function changeLanguage(lang) {
    if (lang === currentLanguage) {
      languageModal.hidden = true;
      return;
    }

    currentLanguage = lang;
    localStorage.setItem('appLanguage', lang);
    updateLanguageCheck();
    applyTranslations();
    
    // 更新语音识别语言
    if (recognition) {
      const langMap = {
        'zh-TW': 'zh-TW',
        'en': 'en-US',
        'ja': 'ja-JP',
        'ko': 'ko-KR'
      };
      recognition.lang = langMap[lang] || 'zh-TW';
    }
    
    languageModal.hidden = true;
  }

  function applyTranslations() {
    const t = translations[currentLanguage];
    if (!t) return;

    // 更新菜单项
    $$('.menu-text').forEach((text, index) => {
      const menuItem = text.closest('.menu-item');
      if (menuItem) {
        const action = menuItem.dataset.action;
        if (action && t[action]) {
          text.textContent = t[action];
        }
      }
    });

    // 更新菜单标题
    const menuHeader = document.querySelector('.menu-header h2');
    if (menuHeader) {
      menuHeader.textContent = t.menu;
    }

    // 更新语言选择模态框
    const languageTitle = $('#languageTitle');
    if (languageTitle) {
      languageTitle.textContent = t.languageTitle;
    }

    const closeBtn = $('#closeLanguageModal');
    if (closeBtn) {
      closeBtn.textContent = t.confirm;
    }

    // 更新其他常见文本
    const closeModalBtn = $('#closeModal');
    if (closeModalBtn) {
      closeModalBtn.textContent = t.back;
    }

    const cancelShareBtn = $('#cancelShareBtn');
    if (cancelShareBtn) {
      cancelShareBtn.textContent = t.cancel;
    }

    const submitShareBtn = $('#submitShareBtn');
    if (submitShareBtn) {
      submitShareBtn.textContent = currentLanguage === 'zh-TW' ? '發布' : 
                                    currentLanguage === 'en' ? 'Publish' :
                                    currentLanguage === 'ja' ? '公開' :
                                    '게시';
    }

    const confirmBtn = $('#confirmBtn');
    if (confirmBtn) {
      confirmBtn.textContent = currentLanguage === 'zh-TW' ? '前往下一步（示意）' : 
                                 currentLanguage === 'en' ? 'Continue (Demo)' :
                                 currentLanguage === 'ja' ? '次へ進む（デモ）' :
                                 '다음 단계로（데모）';
    }

    // 更新搜索按钮
    const searchBtn = $('#searchBtn');
    if (searchBtn) {
      searchBtn.textContent = currentLanguage === 'zh-TW' ? '查看可租車款' : 
                               currentLanguage === 'en' ? 'View Available Cars' :
                               currentLanguage === 'ja' ? '利用可能な車を表示' :
                               '예약 가능한 차량 보기';
    }

    // 更新导航相关按钮
    const startNavBtnFooter = $('#startNavBtnFooter');
    if (startNavBtnFooter) {
      startNavBtnFooter.textContent = currentLanguage === 'zh-TW' ? '開始導航' : 
                                       currentLanguage === 'en' ? 'Start Navigation' :
                                       currentLanguage === 'ja' ? 'ナビゲーション開始' :
                                       '내비게이션 시작';
    }

    const navStopBtn = $('#navStopBtn');
    if (navStopBtn) {
      navStopBtn.textContent = t.stop;
    }

    // 更新分享经验按钮
    const shareExperienceBtn = $('#shareExperienceBtn');
    if (shareExperienceBtn) {
      shareExperienceBtn.textContent = currentLanguage === 'zh-TW' ? '分享經驗' : 
                                        currentLanguage === 'en' ? 'Share Experience' :
                                        currentLanguage === 'ja' ? '経験を共有' :
                                        '경험 공유';
    }

    // 更新标题
    const shareExperienceTitle = $('#shareExperienceTitle');
    if (shareExperienceTitle) {
      shareExperienceTitle.textContent = currentLanguage === 'zh-TW' ? '分享經驗' : 
                                          currentLanguage === 'en' ? 'Share Experience' :
                                          currentLanguage === 'ja' ? '経験を共有' :
                                          '경험 공유';
    }

    // 更新App标题
    if (appHeaderTitle) {
      const currentTitle = appHeaderTitle.textContent;
      // 根据当前标题更新
      if (currentTitle === '租車' || currentTitle === 'Car Rental' || currentTitle === 'レンタカー予約' || currentTitle === '렌터카 예약') {
        appHeaderTitle.textContent = t.rental;
      } else if (currentTitle === '即時導航' || currentTitle === 'Navigation' || currentTitle === 'ナビゲーション' || currentTitle === '내비게이션') {
        appHeaderTitle.textContent = t.navigation;
      } else if (currentTitle === '駕駛經驗分享' || currentTitle === 'Experience Sharing' || currentTitle === '運転経験共有' || currentTitle === '운전 경험 공유') {
        appHeaderTitle.textContent = t.experience;
      } else if (currentTitle === '當地交通號誌及規則' || currentTitle === 'Traffic Rules' || currentTitle === '交通標識と規則' || currentTitle === '교통 표지 및 규칙') {
        appHeaderTitle.textContent = t.trafficRules;
      } else if (currentTitle === '旅遊設定' || currentTitle === 'Travel Settings' || currentTitle === '旅行設定' || currentTitle === '여행 설정') {
        appHeaderTitle.textContent = currentLanguage === 'zh-TW' ? '旅遊設定' : 
                                       currentLanguage === 'en' ? 'Travel Settings' :
                                       currentLanguage === 'ja' ? '旅行設定' :
                                       '여행 설정';
      }
    }
  }

  // bootstrap
  setStatusTimeNow();
  setInterval(setStatusTimeNow, 30_000);
  // initial flow: show onboarding first
  appHeaderTitle.textContent = '旅遊設定';
  contentSection.hidden = true;
  navigationSection.hidden = true;
  experienceSection.hidden = true;
  trafficRulesSection.hidden = true;
  onboardingSection.hidden = false;

  initDates();
  setDropoffVisibility();
  attachEvents();
  validateForm();
  // 初始化语言
  updateLanguageCheck();
  applyTranslations();
})();


