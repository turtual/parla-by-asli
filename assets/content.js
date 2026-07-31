/**
 * Parla By Aslı — Sayfa içeriği render katmanı
 *
 * Admin panelinden düzenlenen "site metinleri" (hero başlığı, hikâye vb.)
 * ve "sayfa içerikleri" (SSS, İletişim, yasal metinler) için ortak render
 * mantığı. Bu dosya tüm içerik sayfalarında (sss/, iletisim/, yasal/*) ve
 * anasayfada assets/data.js'ten SONRA yüklenir.
 *
 * Kullanım:
 *   const page = await PB_Data.getContentPage('sss');
 *   PB_renderContentBlocks(page.blocks, document.getElementById('legal-body'));
 *   window.PB_SaticiBilgi?.doldur(container); // [[token]] span'larını doldur
 */

(function () {
  'use strict';

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /**
   * Admin'in serbest metnine dar, güvenli bir biçimlendirme seti uygular.
   * Önce HTML-escape edilir, SONRA yalnız bu önceden tanımlı kalıplar
   * dönüştürülür — rastgele HTML asla geçmez.
   *
   *   **kalın**              → <strong>
   *   *italik*                → <em>
   *   `kod`                   → <code>
   *   [metin](url)             → <a href="url"> (yalnız / veya http(s):// ile başlayan url kabul edilir)
   *   [[mailto:eposta]]        → satıcının e-posta adresine mailto linki (legal-info.js doldurur)
   *   [[alan]]                 → <span data-satici="alan"> (legal-info.js doldurur)
   */
  function pbFormatInline(text) {
    let s = escapeHtml(text);

    s = s.replace(/\[\[mailto:([a-zA-Z]+)\]\]/g, (m, alan) =>
      `<a data-satici-mailto href="#"><span data-satici="${alan}"></span></a>`);

    s = s.replace(/\[\[([a-zA-Z]+)\]\]/g, (m, alan) =>
      `<span data-satici="${alan}"></span>`);

    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
      // Kök-göreli (/yol), üst dizin-göreli (../yol, ./yol) veya http(s):// kabul
      // edilir — javascript:/data: gibi tehlikeli şemalar # 'e düşer.
      const guvenliMi = /^(\/|\.\.?\/|https?:\/\/)/.test(url);
      return `<a href="${guvenliMi ? url : '#'}">${label}</a>`;
    });

    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return s;
  }

  /**
   * Blok dizisini (heading/subheading/paragraph/list/table/note) legal-body
   * HTML'ine çevirip verilen container'a basar. Mevcut .legal-table/.legal-note
   * CSS sınıflarını kullanır — böylece admin ne yazarsa yazsın sayfa hep aynı
   * düzende kalır.
   */
  function renderContentBlocks(blocks, container) {
    if (!container) return;

    const html = (blocks || []).map(b => {
      if (b.type === 'heading') return `<h2>${pbFormatInline(b.text)}</h2>`;
      if (b.type === 'subheading') return `<h3>${pbFormatInline(b.text)}</h3>`;
      if (b.type === 'paragraph') return `<p>${pbFormatInline(b.text)}</p>`;

      if (b.type === 'list') {
        const tag = b.ordered ? 'ol' : 'ul';
        const items = (b.items || []).map(i => `<li>${pbFormatInline(i)}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }

      if (b.type === 'table') {
        const rows = (b.rows || []).map(r =>
          `<tr><th>${pbFormatInline(r[0])}</th><td>${pbFormatInline(r[1])}</td></tr>`
        ).join('');
        return `<div class="legal-table-wrap"><table class="legal-table"><tbody>${rows}</tbody></table></div>`;
      }

      if (b.type === 'note') return `<div class="legal-note"><p>${pbFormatInline(b.text)}</p></div>`;

      return '';
    }).join('');

    container.innerHTML = html;

    // [[alan]] token'larından üretilen [data-satici] span'larını doldur,
    // [[mailto:alan]]'dan üretilen <a data-satici-mailto> linkini kur
    if (window.PB_SaticiBilgi) {
      window.PB_SaticiBilgi.doldur(container);
      window.PB_SaticiBilgi.mailtoBagla();
    }
  }

  window.PB_renderContentBlocks = renderContentBlocks;
  window.pbFormatInline = pbFormatInline;
})();
