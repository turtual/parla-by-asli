/**
 * Parla By Aslı — Taşın renginden türeyen değerler
 *
 * Taşların fotoğrafı olmayabiliyor; o durumda kart ve kapak, taşın KENDİ
 * renginden bir zeminle görünüyor. Ayrıca "rengine göre keşfet" şeridi de
 * buradan besleniyor.
 *
 * Kaynak: taşın kimlik kartındaki "Renk" satırı — yani uydurma değil,
 * ansiklopedinin kendi verisi.
 *
 * Bu dosya iki üretici tarafından da kullanılıyor (taslar-uret.js ve
 * taslar-listesi-uret.js). Önceden sözlük ikisine de kopyalanmıştı; birini
 * güncelleyip diğerini unutmak kart rengiyle keşif rengini ayrıştırıyordu.
 */

/* [kalıp, kart rengi, keşif renk grubu] */
const RENK_SOZLUGU = [
  [/lacivert|koyu mavi/i, '#2A3D6B', 'mavi'],
  [/gök mavi|açık mavi|mavi-yeşil|turkuaz/i, '#6FA8B5', 'mavi'],
  [/mavi/i, '#4A6FA5', 'mavi'],
  [/mor|lila|eflatun/i, '#7D6493', 'mor'],
  [/pembe|gül/i, '#C58B93', 'pembe'],
  [/kırmızı|kızıl/i, '#8E3B34', 'kirmizi'],
  [/turuncu|amber|bal/i, '#B4763C', 'toprak'],
  [/sarı|altın/i, '#B79A4E', 'sari'],
  [/yeşil/i, '#4F7358', 'yesil'],
  [/siyah|antrasit/i, '#2B2B2E', 'siyah'],
  [/beyaz|krem|süt/i, '#D9CFC2', 'beyaz'],
  [/gri|gümüş/i, '#8A8A8F', 'siyah'],
  [/kahve|bej|toprak/i, '#8A6F55', 'toprak'],
  [/şeffaf|renksiz|berrak/i, '#C3C9CC', 'beyaz']
];

function renkSatiri(tas) {
  const metin = (tas.kimlik && (tas.kimlik['Renk'] || tas.kimlik['renk'])) || '';
  return RENK_SOZLUGU.find(([kalip]) => kalip.test(metin)) || null;
}

/** Kart/kapak zemini için hex renk. Eşleşme yoksa nötr taş tonu. */
function renkBul(tas) {
  const satir = renkSatiri(tas);
  return satir ? satir[1] : '#9A8B7A';
}

/** "Rengine göre keşfet" için grup anahtarı; eşleşme yoksa null. */
function renkGrubuBul(tas) {
  const satir = renkSatiri(tas);
  return satir ? satir[2] : null;
}

module.exports = { RENK_SOZLUGU, renkBul, renkGrubuBul };
