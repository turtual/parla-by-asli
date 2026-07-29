/**
 * Parla By Aslı — Sana özel stüdyo
 *
 * Kullanım:
 *   PB_Studio.openModal(slug)             — Modal olarak açar (ürün kartı tıklamasında)
 *   PB_Studio.renderStandalone(slug)      — Sayfa olarak render eder (sana-ozel/X/index.html)
 *
 * Customization tipleri:
 *   - 'name-text'   → Metin alanı + font seçimi + materyal seçimi
 *   - 'color-only'  → Sadece materyal/renk seçimi
 *
 * Yeni tip eklemek için:
 *   1. products.js'de ürünün customization.type alanını yeni tipe ayarla
 *   2. Bu dosyaya STUDIO_RENDERERS objesine yeni anahtar ekle
 */

const PB_Studio = (function () {
  'use strict';

  /* ──────────── Gösterim fontları (talep üzerine yüklenir) ──────────── */

  /*
   * Bu altı font yalnızca stüdyodaki isim önizlemesinde kullanılıyor.
   * Önceden her sayfanın <head>'inde, diğer dörtle birlikte tek bir
   * render-bloklayan istekte yükleniyorlardı — yani ürünlere bakan ama
   * stüdyoyu hiç açmayan ziyaretçi de bedelini ödüyordu.
   * Artık ilk stüdyo açılışında yükleniyorlar.
   */
  const STUDIO_FONTS_URL =
    'https://fonts.googleapis.com/css2' +
    '?family=Fredoka:wght@600;700' +
    '&family=Baloo+2:wght@800' +
    '&family=Sniglet:wght@800' +
    '&family=Mali:wght@700' +
    '&family=Caveat+Brush' +
    '&family=Pacifico' +
    '&display=swap';

  let studioFontsPromise = null;

  /**
   * Stüdyo font stylesheet'ini bir kez ekler; CSS indiğinde çözülür.
   * Yükleme başarısız olursa da çözülür — font gelmese bile stüdyo
   * çalışmaya devam etmeli, yedek fontla render edilir.
   *
   * Dikkat: bu yalnızca @font-face kurallarını getirir. Tarayıcı asıl
   * font dosyalarını ancak o yazı tipi kullanıldığında indirir, bu yüzden
   * warmStudioFonts() ile önden ısıtıyoruz.
   */
  function ensureStudioFonts() {
    if (studioFontsPromise) return studioFontsPromise;

    studioFontsPromise = new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = STUDIO_FONTS_URL;
      link.addEventListener('load', resolve);
      link.addEventListener('error', resolve);
      document.head.appendChild(link);
    });

    return studioFontsPromise;
  }

  /**
   * Ürünün sunduğu yazı tiplerini arka planda indirtir.
   *
   * Beklemeden döner: stüdyo hemen açılsın, fontlar kullanıcı seçim
   * yapana kadar inmiş olsun. Böylece ne açılış gecikiyor ne de font
   * seçilince yazı bir an yedek fontla görünüyor.
   */
  function warmStudioFonts(customization) {
    if (!document.fonts || !customization || !Array.isArray(customization.fonts)) return;

    customization.fonts.forEach(f => {
      if (!f || !f.cssFont) return;
      // cssFont "Pacifico, cursive" biçiminde — ilk aile adını al
      const aile = f.cssFont.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
      const agirlik = f.weight || 400;
      try {
        document.fonts.load(`${agirlik} 32px "${aile}"`);
      } catch (e) {
        /* Desteklenmeyen tarayıcıda sessizce geç — yedek font devreye girer */
      }
    });
  }

  /* ──────────── Public API ──────────── */

  async function openModal(slug) {
    // Fontları ürün verisiyle paralel indir — böylece bekleme üst üste binmiyor
    const fontsReady = ensureStudioFonts();

    const product = (typeof getProductBySlug === 'function') ? await getProductBySlug(slug) : null;
    if (!product) {
      alert('Ürün bulunamadı.');
      return;
    }
    if (!product.customizable || !product.customization) {
      alert('Bu ürün kişiselleştirilemez.');
      return;
    }
    const renderer = STUDIO_RENDERERS[product.customization.type];
    if (!renderer) {
      alert('Bu ürün tipi desteklenmiyor: ' + product.customization.type);
      return;
    }

    // @font-face kuralları gelsin, sonra fontları arka planda ısıt
    await fontsReady;
    warmStudioFonts(product.customization);

    // Modal shell oluştur (yoksa)
    let modal = document.getElementById('studio-modal');
    if (!modal) {
      modal = buildStudioModal();
      document.body.appendChild(modal);
    }

    // İçeriği render et
    const previewWrap = modal.querySelector('[data-studio-preview]');
    const controlsWrap = modal.querySelector('[data-studio-controls]');
    const titleEls = modal.querySelectorAll('[data-studio-title]');
    const descEls = modal.querySelectorAll('[data-studio-desc]');
    const priceEl = modal.querySelector('[data-studio-price]');
    const addBtn = modal.querySelector('[data-studio-add]');
    const breakdownEl = modal.querySelector('[data-studio-breakdown]');
    const validationEl = modal.querySelector('[data-studio-validation]');

    titleEls.forEach(el => el.textContent = product.name);
    descEls.forEach(el => el.textContent = product.description || '');

    // Diyaloğa isim ver — önceden isimsizdi, ekran okuyucu sadece
    // "iletişim kutusu" diyordu
    modal.setAttribute('aria-label', product.name + ' — tasarla');

    const state = renderer.initState(product);

    function refresh() {
      renderer.renderPreview(previewWrap, product, state);
      priceEl.textContent = formatPrice(getFinalPrice(product, state));
      renderBreakdown(breakdownEl, product, state);
      updateValidity(addBtn, validationEl, product, state);
    }

    renderer.renderControls(controlsWrap, product, state, refresh);
    refresh();

    // Sepete ekle
    addBtn.onclick = () => {
      if (!validateState(product, state)) {
        // Buton zaten pasif; buraya yalnızca beklenmedik bir durumda düşülür
        updateValidity(addBtn, validationEl, product, state);
        return;
      }
      addBtn.disabled = true;
      addBtn.textContent = 'EKLENİYOR…';
      captureStudioPreview(modal).then(previewImageDataUrl => {
        addToCart(product, state, previewImageDataUrl);
      }).catch(() => {
        addToCart(product, state, null);
      });
    };

    PB_Modal.open('studio-modal');
  }

  async function renderStandalone(slug) {
    const fontsReady = ensureStudioFonts();

    const product = (typeof getProductBySlug === 'function') ? await getProductBySlug(slug) : null;
    if (!product || !product.customizable || !product.customization) {
      showStandaloneNotFound();
      return;
    }
    const renderer = STUDIO_RENDERERS[product.customization.type];
    if (!renderer) {
      showStandaloneNotFound('Bu ürün tipi henüz desteklenmiyor.');
      return;
    }

    await fontsReady;
    warmStudioFonts(product.customization);

    document.title = product.name + ' — Tasarla · Parla By Aslı';

    document.querySelectorAll('[data-studio-product-name]').forEach(el => el.textContent = product.name);
    document.querySelectorAll('[data-studio-product-desc]').forEach(el => el.textContent = product.description || '');

    const previewWrap = document.getElementById('studio-preview');
    const controlsWrap = document.getElementById('studio-controls');
    const priceEl = document.getElementById('studio-price');
    const addBtn = document.getElementById('studio-add');

    const state = renderer.initState(product);

    // Fiyat dökümü ve doğrulama mesajı için yer aç. Bağımsız sayfaların
    // HTML'inde bu kutular yok; sekiz dosyayı ayrı ayrı düzenlemek yerine
    // burada bir kez oluşturuluyorlar.
    let breakdownEl = null;
    let validationEl = null;

    if (priceEl) {
      priceEl.setAttribute('aria-live', 'polite');
      breakdownEl = PB_h('div', { class: 'studio-breakdown', hidden: '' });
      const fiyatSatiri = priceEl.closest('.studio-price-row') || priceEl;
      fiyatSatiri.parentNode.insertBefore(breakdownEl, fiyatSatiri);
    }

    if (addBtn) {
      validationEl = PB_h('p', { class: 'studio-validation', role: 'status', hidden: '' });
      addBtn.parentNode.insertBefore(validationEl, addBtn);
    }

    function refresh() {
      renderer.renderPreview(previewWrap, product, state);
      if (priceEl) priceEl.textContent = formatPrice(getFinalPrice(product, state));
      renderBreakdown(breakdownEl, product, state);
      if (addBtn) updateValidity(addBtn, validationEl, product, state);
    }

    renderer.renderControls(controlsWrap, product, state, refresh);
    refresh();

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (!validateState(product, state)) {
          updateValidity(addBtn, validationEl, product, state);
          return;
        }
        addBtn.disabled = true;
        addBtn.textContent = 'EKLENİYOR…';
        captureStudioPreview(document).then(url => {
          addToCart(product, state, url);
        }).catch(() => {
          addToCart(product, state, null);
        });
      });
    }
  }

  /* ──────────── Modal shell ──────────── */

  function buildStudioModal() {
    const modal = PB_h('div', {
      class: 'modal',
      id: 'studio-modal',
      role: 'dialog',
      'aria-modal': 'true',
      hidden: ''
    });

    modal.innerHTML = `
      <div class="modal-card studio-modal-card">
        <button class="modal-close" data-modal-close aria-label="Kapat">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 2 L12 12 M12 2 L2 12"/>
          </svg>
        </button>

        <div class="studio-modal-body">
          <div class="studio-modal-preview-pane">
            <div class="studio-modal-head-mobile">
              <span class="eyebrow">Sana özel · Tasarla</span>
              <h2 class="h2" data-studio-title></h2>
            </div>
            <div data-studio-preview class="studio-preview"></div>
            <p class="studio-preview-note">Önizleme · Gerçek ürün biraz farklı görünür</p>
          </div>

          <div class="studio-modal-controls-pane">
            <header class="studio-modal-head-desktop">
              <span class="eyebrow">Sana özel · Tasarla</span>
              <h2 class="h1" data-studio-title></h2>
              <p class="studio-desc" data-studio-desc></p>
            </header>

            <div data-studio-controls></div>

            <div class="studio-summary">
              <div class="studio-breakdown" data-studio-breakdown></div>
              <div class="studio-price-row">
                <span class="eyebrow">Toplam</span>
                <span class="studio-price" data-studio-price aria-live="polite">—</span>
              </div>
              <p class="studio-validation" data-studio-validation role="status" hidden></p>
              <button type="button" class="btn btn-bakir btn-block" data-studio-add>
                SEPETE EKLE
              </button>
              <p class="studio-meta">
                El emeği üretim · 5-10 iş günü teslim<br>
                <a href="${PB_imgPath('yasal/iade-iptal/')}" target="_blank" rel="noopener">Sana özel ürünlerde cayma hakkı yoktur</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('[data-modal-close]')) {
        PB_Modal.close('studio-modal');
      }
    });

    return modal;
  }

  /* ──────────── Tip-spesifik renderer'lar ──────────── */

  const STUDIO_RENDERERS = {

    'name-text': {
      initState(p) {
        const c = p.customization;
        return {
          text: '',
          fontId: c.fonts[0].id,
          materialId: c.materials[0].id
        };
      },

      renderControls(wrap, p, state, onChange) {
        const c = p.customization;
        wrap.innerHTML = '';

        // 1. Metin
        const textGroup = controlGroup(c.textLabel || 'Metin');
        const textInput = PB_h('input', {
          type: 'text',
          class: 'input',
          placeholder: c.textPlaceholder || '',
          maxlength: c.maxLength,
          value: state.text,
          oninput: e => {
            state.text = e.target.value;
            onChange();
            counterEl.textContent = `${state.text.length} / ${c.maxLength}`;
          }
        });
        const counterEl = PB_h('div', { class: 'studio-counter' }, `0 / ${c.maxLength}`);
        textGroup.append(textInput, counterEl);
        wrap.append(textGroup);

        // 2. Font
        wrap.append(buildFontPicker(c.fonts, state, onChange, f =>
          `font-family:${escapeXml(f.cssFont)}; font-style:${escapeXml(f.style || 'normal')};`));

        // 3. Materyal
        wrap.append(buildMaterialPicker(p, state, onChange));
      },

      renderPreview(wrap, p, state) {
        const c = p.customization;
        const font = c.fonts.find(f => f.id === state.fontId);
        const material = c.materials.find(m => m.id === state.materialId);
        wrap.innerHTML = '';

        const stage = PB_h('div', { class: 'studio-stage', 'data-studio-stage': '' });
        const text = state.text.trim() || c.textPlaceholder || 'Metin';
        const stroke = material.color;
        const fill = state.text.trim() ? material.color : 'rgba(20,17,14,0.25)';

        stage.innerHTML = `
          <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" class="studio-preview-svg">
            ${getPreviewShape(p, stroke)}
            <text x="160" y="180"
                  text-anchor="middle"
                  font-family="${font.cssFont}"
                  font-style="${font.style}"
                  font-size="${getFontSize(state.text)}"
                  fill="${fill}"
                  letter-spacing="0.02em">${escapeXml(text)}</text>
          </svg>
        `;

        const caption = PB_h('div', { class: 'studio-preview-caption' });
        caption.innerHTML = `
          <span class="studio-material-swatch" style="background:${material.color}"></span>
          <span>${material.name}</span>
        `;

        wrap.append(stage, caption);
      }
    },

    'color-only': {
      initState(p) {
        return {
          materialId: p.customization.materials[0].id
        };
      },

      renderControls(wrap, p, state, onChange) {
        wrap.innerHTML = '';
        const helpText = PB_h('p', { class: 'studio-help' },
          'Bu ürün hazır tasarımıyla gelir. Sadece rengini seçmen yeterli.');
        wrap.append(helpText);
        wrap.append(buildMaterialPicker(p, state, onChange));
      },

      renderPreview(wrap, p, state) {
        const material = p.customization.materials.find(m => m.id === state.materialId);
        wrap.innerHTML = '';
        const stage = PB_h('div', { class: 'studio-stage', 'data-studio-stage': '' });
        stage.innerHTML = `
          <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" class="studio-preview-svg">
            ${getPreviewShape(p, material.color)}
          </svg>
        `;
        const caption = PB_h('div', { class: 'studio-preview-caption' });
        caption.innerHTML = `
          <span class="studio-material-swatch" style="background:${material.color}"></span>
          <span>${material.name}</span>
        `;
        wrap.append(stage, caption);
      }
    },

    /**
     * 'keychain' tipi: İsim anahtarlığı
     * - Metin alanı (isim)
     * - Font seçimi (kalın yuvarlak çocuksu fontlar)
     * - Plak rengi seçimi (çift renkli baskı için 1. renk)
     * - Yazı rengi seçimi (çift renkli baskı için 2. renk)
     */
    'keychain': {
      initState(p) {
        const c = p.customization;
        return {
          text: '',
          fontId: c.fonts[0].id,
          sizePercent: 80, // varsayılan %80, slider ile 60-100 arası
          plateColorId: c.plateColors[0].id,
          textColorId: c.textColors[0].id
        };
      },

      renderControls(wrap, p, state, onChange) {
        const c = p.customization;
        wrap.innerHTML = '';

        // 1. İsim
        const textGroup = controlGroup(c.textLabel || 'İsim');
        const textInput = PB_h('input', {
          type: 'text',
          class: 'input',
          placeholder: c.textPlaceholder || 'Örn. Sam',
          maxlength: c.maxLength || 12,
          value: state.text,
          oninput: e => {
            state.text = e.target.value;
            onChange();
            counterEl.textContent = `${state.text.length} / ${c.maxLength || 12}`;
          }
        });
        const counterEl = PB_h('div', { class: 'studio-counter' }, `0 / ${c.maxLength || 12}`);
        textGroup.append(textInput, counterEl);
        wrap.append(textGroup);

        // 2. Font
        wrap.append(buildFontPicker(c.fonts, state, onChange, f =>
          `font-family:${escapeXml(f.cssFont)}; font-weight:${escapeXml(String(f.weight || 400))};`));

        // 3. Yazı boyutu slider'ı
        const sizeGroup = controlGroup('Yazı boyutu');
        const sizeRow = PB_h('div', { class: 'studio-slider-row' });
        const sizeSlider = PB_h('input', {
          type: 'range',
          class: 'studio-slider',
          min: '60',
          max: '100',
          step: '5',
          value: state.sizePercent,
          oninput: e => {
            state.sizePercent = parseInt(e.target.value);
            sizeValue.textContent = `%${state.sizePercent}`;
            onChange();
          }
        });
        const sizeValue = PB_h('span', { class: 'studio-slider-value' }, `%${state.sizePercent}`);
        sizeRow.append(sizeSlider, sizeValue);
        sizeGroup.append(sizeRow);
        wrap.append(sizeGroup);

        // 4. Plak rengi
        wrap.append(buildColorPicker('Plak rengi', c.plateColors, state, 'plateColorId', onChange));

        // 5. Yazı rengi
        wrap.append(buildColorPicker('Yazı rengi', c.textColors, state, 'textColorId', onChange));
      },

      renderPreview(wrap, p, state) {
        const c = p.customization;
        const font = c.fonts.find(f => f.id === state.fontId);
        const plateColor = c.plateColors.find(m => m.id === state.plateColorId);
        const textColor = c.textColors.find(m => m.id === state.textColorId);

        wrap.innerHTML = '';
        const stage = PB_h('div', { class: 'studio-stage', 'data-studio-stage': '' });
        const text = state.text.trim() || c.textPlaceholder || 'İsim';
        const isPlaceholder = !state.text.trim();

        // Plak yatay dikdörtgen + sol delik (anahtarlık halkası)
        // Yazı: ortada büyük, kalın
        stage.innerHTML = `
          <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" class="studio-preview-svg" preserveAspectRatio="xMidYMid meet">
            <!-- Plak gölgesi -->
            <rect x="42" y="62" width="240" height="86" rx="20" fill="rgba(20,17,14,0.08)"/>
            <!-- Plak -->
            <path d="M 60 60
                     L 280 60
                     Q 300 60 300 80
                     L 300 120
                     Q 300 140 280 140
                     L 60 140
                     Q 50 140 45 132
                     L 30 130
                     Q 20 125 20 115
                     Q 20 105 25 100
                     Q 20 95 20 85
                     Q 20 75 30 70
                     L 45 68
                     Q 50 60 60 60 Z"
                  fill="${plateColor.color}"
                  stroke="rgba(20,17,14,0.18)"
                  stroke-width="0.5"/>
            <!-- Halka deliği -->
            <circle cx="32" cy="100" r="5" fill="${plateColor.color === '#FFFFFF' || plateColor.color === '#F4E5C9' ? 'rgba(20,17,14,0.15)' : 'rgba(255,255,255,0.3)'}"/>
            <!-- İsim yazısı -->
            <text x="170" y="105"
                  text-anchor="middle"
                  font-family="${font.cssFont}"
                  font-weight="${font.weight || 400}"
                  font-size="${getKeychainFontSize(text, state.sizePercent)}"
                  fill="${isPlaceholder ? 'rgba(20,17,14,0.25)' : textColor.color}"
                  dominant-baseline="middle">${escapeXml(text)}</text>
          </svg>
        `;

        const caption = PB_h('div', { class: 'studio-preview-caption' });
        caption.innerHTML = `
          <span class="studio-material-swatch" style="background:${plateColor.color}"></span>
          <span>${plateColor.name}</span>
          <span style="margin: 0 6px; opacity: 0.4;">+</span>
          <span class="studio-material-swatch" style="background:${textColor.color}"></span>
          <span>${textColor.name}</span>
        `;

        wrap.append(stage, caption);
      }
    }
  };

  /* ──────────── Yardımcılar ──────────── */

  function controlGroup(label) {
    const group = PB_h('div', { class: 'studio-group' });
    group.append(PB_h('label', { class: 'eyebrow' }, label));
    return group;
  }

  /**
   * Erişilebilir tek-seçimli grup (renk, yazı tipi vb.).
   *
   * Neden düz buton değil: kullanıcı burada bir komut çalıştırmıyor,
   * seçenekler arasından SEÇİM yapıyor. Önceden hepsi sıradan <button>
   * olduğu için ekran okuyucu hangisinin seçili olduğunu söyleyemiyordu
   * ve klavyeyle gezinmek her seçeneğe ayrı ayrı Tab basmayı gerektiriyordu.
   *
   * radiogroup semantiği ile: durum "seçili" olarak duyuruluyor, gruba tek
   * Tab ile giriliyor ve ok tuşlarıyla geziliyor (dolaşan tabindex).
   *
   * @param {Object}   ayar
   * @param {Array}    ayar.ogeler      - { id, ad, ekBilgi?, icerikHTML }
   * @param {string}   ayar.seciliId
   * @param {string}   ayar.gridSinifi
   * @param {string}   ayar.ogeSinifi
   * @param {Function} ayar.onSelect    - (id) => void
   * @returns {{ grid: HTMLElement, secimiUygula: Function }}
   */
  function buildRadioGroup({ grupAdi, ogeler, seciliId, gridSinifi, ogeSinifi, onSelect }) {
    const grid = PB_h('div', {
      class: gridSinifi,
      role: 'radiogroup',
      'aria-label': grupAdi
    });

    const butonlar = [];

    function secimiUygula(yeniId, odaklan) {
      butonlar.forEach(b => {
        const secili = b.dataset.ogeId === yeniId;
        b.classList.toggle('is-active', secili);
        b.setAttribute('aria-checked', secili ? 'true' : 'false');
        // Dolaşan tabindex: gruba Tab ile girince seçili öğeye düşülür
        b.tabIndex = secili ? 0 : -1;
        if (secili && odaklan) b.focus();
      });
    }

    ogeler.forEach((oge, i) => {
      const secili = oge.id === seciliId;
      const btn = PB_h('button', {
        type: 'button',
        class: ogeSinifi + (secili ? ' is-active' : ''),
        role: 'radio',
        'aria-checked': secili ? 'true' : 'false',
        'aria-label': oge.ekBilgi ? `${oge.ad}, ${oge.ekBilgi}` : oge.ad,
        tabindex: secili ? 0 : -1,
        'data-oge-id': oge.id,
        onclick: () => {
          secimiUygula(oge.id, false);
          onSelect(oge.id);
        },
        onkeydown: e => {
          const yon = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          let hedef = null;
          if (yon) hedef = (i + yon + ogeler.length) % ogeler.length;
          else if (e.key === 'Home') hedef = 0;
          else if (e.key === 'End') hedef = ogeler.length - 1;
          if (hedef === null) return;
          e.preventDefault();
          secimiUygula(ogeler[hedef].id, true);
          onSelect(ogeler[hedef].id);
        }
      });
      btn.innerHTML = oge.icerikHTML;
      butonlar.push(btn);
      grid.append(btn);
    });

    return { grid, secimiUygula };
  }

  /**
   * Yazı tipi seçici. İki renderer da (name-text, keychain) aynı yapıyı
   * kuruyordu; fark yalnızca önizleme harfine uygulanan stilde.
   *
   * @param {Function} stilUret - (font) => inline style dizgisi
   */
  function buildFontPicker(fonts, state, onChange, stilUret) {
    const group = controlGroup('Yazı tipi');

    const { grid } = buildRadioGroup({
      grupAdi: 'Yazı tipi',
      gridSinifi: 'studio-font-grid',
      ogeSinifi: 'studio-font-option',
      seciliId: state.fontId,
      ogeler: fonts.map(f => ({
        id: f.id,
        ad: f.name,
        icerikHTML:
          `<span class="studio-font-preview" style="${stilUret(f)}" aria-hidden="true">Aa</span>` +
          `<span class="studio-font-name">${escapeXml(f.name)}</span>`
      })),
      onSelect: id => {
        state.fontId = id;
        onChange();
      }
    });

    group.append(grid);
    return group;
  }

  function buildMaterialPicker(p, state, onChange) {
    const group = controlGroup('Renk · Malzeme');
    const materyaller = p.customization.materials;

    const { grid } = buildRadioGroup({
      grupAdi: 'Renk ve malzeme',
      gridSinifi: 'studio-swatch-grid',
      ogeSinifi: 'studio-swatch',
      seciliId: state.materialId,
      ogeler: materyaller.map(m => ({
        id: m.id,
        ad: m.name,
        // Ek ücret erişilebilir ada giriyor: renk körü veya ekran okuyucu
        // kullanan biri de fiyat farkını seçmeden önce duyabilsin
        ekBilgi: m.priceModifier > 0 ? `${formatPrice(m.priceModifier)} ek ücret` : 'ek ücret yok',
        icerikHTML: `<span class="studio-swatch-color" style="background:${escapeXml(m.color)}"></span>`
      })),
      onSelect: id => {
        state.materialId = id;
        updateLabel();
        onChange();
      }
    });

    const label = PB_h('div', { class: 'studio-swatch-label' });

    function updateLabel() {
      const mat = materyaller.find(x => x.id === state.materialId);
      const priceText = mat.priceModifier > 0 ? ` (+${formatPrice(mat.priceModifier)})` : '';
      label.textContent = mat.name + priceText;
    }
    updateLabel();

    group.append(grid, label);
    return group;
  }

  /**
   * Genel renk seçici (keychain için iki ayrı renk paneli)
   * State içindeki herhangi bir property'i (örn. plateColorId, textColorId) güncelleyebilir.
   */
  function buildColorPicker(label, colors, state, stateKey, onChange) {
    const group = controlGroup(label);

    const { grid } = buildRadioGroup({
      grupAdi: label,
      gridSinifi: 'studio-swatch-grid',
      ogeSinifi: 'studio-swatch',
      seciliId: state[stateKey],
      ogeler: colors.map(c => ({
        id: c.id,
        ad: c.name,
        icerikHTML: `<span class="studio-swatch-color" style="background:${escapeXml(c.color)}"></span>`
      })),
      onSelect: id => {
        state[stateKey] = id;
        updateLbl();
        onChange();
      }
    });

    const lbl = PB_h('div', { class: 'studio-swatch-label' });
    function updateLbl() {
      const c = colors.find(x => x.id === state[stateKey]);
      lbl.textContent = c ? c.name : '';
    }
    updateLbl();

    group.append(grid, lbl);
    return group;
  }

  function getKeychainFontSize(text, sizePercent) {
    const len = text.length;
    let baseSize;
    if (len <= 3) baseSize = 56;
    else if (len <= 5) baseSize = 46;
    else if (len <= 7) baseSize = 38;
    else if (len <= 9) baseSize = 30;
    else if (len <= 11) baseSize = 26;
    else baseSize = 22;
    // sizePercent (60-100): kullanıcının ince ayarı
    const factor = (sizePercent || 80) / 80; // 80 baz değer, %80'de 1x
    return Math.round(baseSize * factor);
  }

  function validateState(p, state) {
    const type = p.customization.type;
    if (type === 'name-text') {
      return state.text.trim().length > 0 && state.fontId && state.materialId;
    }
    if (type === 'color-only') {
      return !!state.materialId;
    }
    if (type === 'keychain') {
      return state.text.trim().length > 0 && state.fontId && state.plateColorId && state.textColorId;
    }
    return true;
  }

  /**
   * Fiyatın nereden geldiğini satır satır gösterir.
   *
   * Önceden yalnızca "Toplam: 600 ₺" yazıyordu. Altın kaplamayı seçen
   * müşteri fiyatın 480'den 600'e neden çıktığını göremiyordu; bu hem
   * güven kırıyor hem de sepette sürprize dönüşüyordu.
   */
  function renderBreakdown(el, p, state) {
    if (!el) return;
    el.innerHTML = '';

    const satirlar = [{ ad: 'Ürün', tutar: p.price }];

    const mat = p.customization.materials?.find(m => m.id === state.materialId);
    if (mat && mat.priceModifier > 0) {
      satirlar.push({ ad: mat.name, tutar: mat.priceModifier, ek: true });
    }

    // Tek satır varsa döküm göstermenin bir faydası yok
    if (satirlar.length < 2) { el.hidden = true; return; }
    el.hidden = false;

    satirlar.forEach(s => {
      const satir = PB_h('div', { class: 'studio-breakdown-row' });
      satir.append(
        PB_h('span', {}, s.ek ? s.ad : s.ad),
        PB_h('span', {}, (s.ek ? '+' : '') + formatPrice(s.tutar))
      );
      el.append(satir);
    });
  }

  /**
   * Sepete ekle butonunun durumunu ve eksik alan uyarısını günceller.
   *
   * Önceden buton her zaman aktifti ve eksik alanla tıklanınca tarayıcının
   * alert() kutusu çıkıyordu: premium bir markada yabancı duran, ekranı
   * kilitleyen bir çözüm. Artık buton eksikken pasif ve gerekçe alanın
   * hemen üstünde yazılı duruyor.
   */
  function updateValidity(addBtn, mesajEl, p, state) {
    const gecerli = validateState(p, state);
    addBtn.disabled = !gecerli;

    if (!mesajEl) return;
    if (gecerli) {
      mesajEl.hidden = true;
      mesajEl.textContent = '';
      return;
    }

    const type = p.customization.type;
    const metinGerekli = (type === 'name-text' || type === 'keychain') && !state.text.trim();
    mesajEl.textContent = metinGerekli
      ? (p.customization.textLabel ? p.customization.textLabel + ' alanını doldur' : 'Yazdırılacak metni gir')
      : 'Devam etmek için seçimlerini tamamla';
    mesajEl.hidden = false;
  }

  function getFinalPrice(p, state) {
    if (p.customization.type === 'keychain') {
      // Keychain'de renk modifier'ı yok, sadece base price
      return p.price;
    }
    const mat = p.customization.materials?.find(m => m.id === state.materialId);
    return p.price + (mat?.priceModifier || 0);
  }

  function addToCart(product, state, previewImageDataUrl) {
    PB_Cart.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: getFinalPrice(product, state),
      quantity: 1,
      image: product.image,
      customization: {
        type: product.customization.type,
        ...state,
        previewImage: previewImageDataUrl
      }
    });
    showAddedSuccess(product);
  }

  function getPreviewShape(p, color) {
    const shapes = {
      kolye: `
        <path d="M 60 60 Q 160 110 260 60" stroke="${color}" stroke-width="1.5" fill="none"/>
        <line x1="160" y1="80" x2="160" y2="130" stroke="${color}" stroke-width="0.8"/>
        <circle cx="160" cy="135" r="6" fill="none" stroke="${color}" stroke-width="1"/>
        <path d="M 160 240 C 130 230 110 200 115 180 C 120 165 135 170 160 190 C 185 170 200 165 205 180 C 210 200 190 230 160 240 Z" fill="none" stroke="${color}" stroke-width="1.2"/>`,
      charm: `
        <circle cx="160" cy="80" r="10" fill="none" stroke="${color}" stroke-width="1.5"/>
        <line x1="160" y1="90" x2="160" y2="115" stroke="${color}" stroke-width="0.8"/>
        <rect x="115" y="115" width="90" height="120" rx="10" fill="none" stroke="${color}" stroke-width="1.5"/>`,
      yuzuk: `
        <circle cx="160" cy="170" r="80" fill="none" stroke="${color}" stroke-width="3"/>
        <circle cx="160" cy="170" r="55" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.5"/>
        <path d="M 145 70 L 160 50 L 175 70 Z" fill="none" stroke="${color}" stroke-width="1.2"/>`,
      kupe: `
        <circle cx="120" cy="90" r="6" fill="none" stroke="${color}" stroke-width="1"/>
        <line x1="120" y1="96" x2="120" y2="125" stroke="${color}" stroke-width="0.8"/>
        <path d="M 120 130 Q 80 175 120 220 Q 160 175 120 130 Z" fill="none" stroke="${color}" stroke-width="1.2"/>
        <circle cx="200" cy="90" r="6" fill="none" stroke="${color}" stroke-width="1"/>
        <line x1="200" y1="96" x2="200" y2="125" stroke="${color}" stroke-width="0.8"/>
        <path d="M 200 130 Q 160 175 200 220 Q 240 175 200 130 Z" fill="none" stroke="${color}" stroke-width="1.2"/>`,
      bileklik: `
        <ellipse cx="160" cy="160" rx="90" ry="105" fill="none" stroke="${color}" stroke-width="1.5"/>
        <ellipse cx="160" cy="160" rx="72" ry="88" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.5"/>`,
      obje: `
        <path d="M 110 70 L 210 70 L 200 100 Q 250 130 240 200 Q 230 260 160 270 Q 90 260 80 200 Q 70 130 120 100 Z" fill="none" stroke="${color}" stroke-width="1.5"/>`
    };
    return shapes[p.category] || shapes.kolye;
  }

  function getFontSize(text) {
    const len = text.length;
    if (len <= 4) return 38;
    if (len <= 7) return 32;
    if (len <= 10) return 26;
    if (len <= 14) return 22;
    return 18;
  }

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function captureStudioPreview(scope) {
    return new Promise((resolve, reject) => {
      const root = scope || document;
      const stage = root.querySelector('[data-studio-stage]');
      if (!stage) return reject('stage yok');
      const svg = stage.querySelector('svg');
      if (!svg) return reject('svg yok');

      const svgStr = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(unescape(encodeURIComponent(svgStr)));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FAF6F1';
        ctx.fillRect(0, 0, 800, 800);
        ctx.drawImage(img, 0, 0, 800, 800);
        try {
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + svg64;
    });
  }

  function showAddedSuccess(product) {
    const studioModal = document.getElementById('studio-modal');
    if (studioModal && studioModal.classList.contains('is-open')) {
      PB_Modal.close('studio-modal');
    }

    let modal = document.getElementById('studio-success-modal');
    if (!modal) {
      modal = PB_h('div', { class: 'modal', id: 'studio-success-modal', role: 'dialog', 'aria-modal': 'true', hidden: '' });
      modal.innerHTML = `
        <div class="modal-card studio-success-card">
          <div class="studio-success-icon">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="24" cy="24" r="22"/>
              <path d="M14 24l8 8 14-14"/>
            </svg>
          </div>
          <h2 class="h2">Sepete eklendi</h2>
          <p data-success-product></p>
          <div class="studio-success-actions">
            <button type="button" class="btn btn-primary" data-modal-close>Tamam</button>
          </div>
        </div>
      `;
      modal.addEventListener('click', e => {
        if (e.target === modal || e.target.closest('[data-modal-close]')) {
          PB_Modal.close('studio-success-modal');
        }
      });
      document.body.appendChild(modal);
    }
    modal.querySelector('[data-success-product]').textContent = product.name + ' kişiselleştirilmiş halde sepete eklendi.';
    setTimeout(() => PB_Modal.open('studio-success-modal'), 250);
  }

  function showStandaloneNotFound(msg) {
    const main = document.querySelector('main') || document.body;
    main.innerHTML = `
      <div class="container" style="padding: var(--space-3xl) 0; text-align: center;">
        <h1 class="h1">Ürün bulunamadı</h1>
        <p style="color: var(--c-toprak); margin-top: var(--space-md);">${msg || 'Aradığın ürün mevcut değil.'}</p>
        <a href="../../index.html" class="btn btn-primary" style="margin-top: var(--space-lg); display:inline-flex;">Anasayfaya dön</a>
      </div>
    `;
  }

  /* ──────────── Auto-init for standalone pages ──────────── */

  document.addEventListener('DOMContentLoaded', () => {
    if (window.PB_STUDIO_SLUG) {
      renderStandalone(window.PB_STUDIO_SLUG);
    }
  });

  return { openModal, renderStandalone };
})();

// Backwards compat — ui.js'in çağırdığı global isim
function PB_openStudioModal(slug) {
  return PB_Studio.openModal(slug);
}
