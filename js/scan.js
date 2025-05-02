// js/scan.js

let model;
const video = document.getElementById('video');
const scanBtn = document.getElementById('scan-btn');
const suggestionsEl = document.getElementById('suggestions');

// 1. カメラ映像を video タグにセット＆再生
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await new Promise(resolve => video.onloadedmetadata = resolve);
  await video.play();  // iOS Safari の自動再生制限対策
  return video;
}

// 2. coco-ssd モデルを読み込み
async function loadModel() {
  model = await cocoSsd.load();
  scanBtn.disabled = false;  // モデル準備完了でボタン有効化
  console.log('Model loaded');
}

// 3. PackHuck のリストを localStorage から読み込み
function loadPackItems() {
  return JSON.parse(localStorage.getItem('packhuck_items')) || [];
}

// 4. 物体検出＆指示生成
async function scanOnce() {
  suggestionsEl.innerHTML = '<li>スキャン中…</li>';
  const predictions = await model.detect(video);
  const items = loadPackItems();
  suggestionsEl.innerHTML = '';

  // 簡易マッピング辞書
  const map = {
    'laptop': 'パソコン',
    'cell phone': 'スマホ',
    'book': '本',
    'backpack': 'バッグ',
    'bottle': '水筒/ペットボトル',
    // 必要に応じて追加…
  };

  predictions.forEach(p => {
    if (p.score < 0.5) return; // 信頼度が低いものは無視
    const detected = p.class;           // 英語クラス名
    const jp = map[detected] || null;   // 日本語マッピング
    const li = document.createElement('li');

    if (jp) {
      const idx = items.findIndex(it => it.name === jp);
      if (idx > -1) {
        li.textContent = `✅ 「${jp}」を検出しました → チェックリストで✔を入れてください。`;
      } else {
        li.textContent = `⚠️ 「${jp}」（${detected}）を検出しました → リストにないので追加を検討してください。`;
      }
    } else {
      li.textContent = `❓ 未知の物体「${detected}」を検出しました → 手動で確認を。`;
    }
    suggestionsEl.appendChild(li);
  });

  if (!suggestionsEl.children.length) {
    suggestionsEl.innerHTML = '<li>何も検出できませんでした。カメラ枠に対象物を入れて再スキャンを。</li>';
  }
}

// 初期化（カメラ＋モデル）＆ボタンイベント登録
(async () => {
  try {
    await setupCamera();
    await loadModel();
    scanBtn.addEventListener('click', scanOnce);
  } catch (e) {
    console.error(e);
    suggestionsEl.innerHTML = `<li>カメラの起動に失敗しました: ${e.message}</li>`;
  }
})();