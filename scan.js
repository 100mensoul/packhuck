// js/scan.js

let model;
const video = document.getElementById('video');
const scanBtn = document.getElementById('scan-btn');
const suggestionsEl = document.getElementById('suggestions');

// 1. カメラ映像を video タグにセット
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise(resolve => {
    video.onloadedmetadata = () => resolve(video);
  });
}

// 2. モデル読み込み
async function loadModel() {
  model = await cocoSsd.load();
  console.log('Model loaded');
}

// 3. PackHuck のリスト取得
function loadPackItems() {
  return JSON.parse(localStorage.getItem('packhuck_items')) || [];
}

// 4. 検出 → 指示生成
async function scanOnce() {
  const predictions = await model.detect(video);
  const items = loadPackItems();
  suggestionsEl.innerHTML = '';

  predictions.forEach(p => {
    const name = p.class;     // e.g. 'cup', 'laptop', 'cell phone'…
    const score = p.score;    // 信頼度
    if (score < 0.5) return;  // 閾値以下は無視

    // 簡易マッピング例 (要チューニング)
    const map = {
      'laptop': 'パソコン',
      'cell phone': 'スマホ',
      'book': '本',
      'backpack': 'バッグ',
      'bottle': '水筒／ペットボトル',
      // …必要に応じて増やす
    };
    const jp = map[name] || null;

    const li = document.createElement('li');
    if (jp) {
      // リストにあればチェック、なければ「追加を検討」
      const idx = items.findIndex(it => it.name === jp);
      if (idx > -1) {
        li.textContent = `✅ 「${jp}」を検出しました → チェックリストで✔を入れてください。`;
      } else {
        li.textContent = `⚠️ 「${jp}」（${name}）を検出しました → リストにないので追加を検討してください。`;
      }
    } else {
      li.textContent = `❓ 未知の物体「${name}」を検出しました → 手動で確認を。`;
    }
    suggestionsEl.appendChild(li);
  });

  if (suggestionsEl.children.length === 0) {
    suggestionsEl.innerHTML = '<li>何も検出できませんでした。対象物をカメラ枠に入れて再スキャンを。</li>';
  }
}

// 初期化
(async () => {
  await setupCamera();
  await loadModel();
  scanBtn.disabled = false;
  scanBtn.addEventListener('click', scanOnce);
})();