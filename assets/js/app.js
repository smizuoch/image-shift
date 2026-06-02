import { formatBytes } from './bytes.js';
import { convertImage } from './converter.js';
import { buildOutputName, downloadBlob } from './download.js';
import { detectSupportedOutputFormats, findFormat } from './formats.js';
import { loadImageSource, revokeObjectUrl } from './image-io.js';
import { createUI } from './ui.js';

let state = {
  source: null,
  result: null,
  supportedFormats: [],
  selectedFormat: null,
  options: {
    outputType: '',
    quality: 92,
    lossless: false,
    matteColor: '#ffffff',
  },
  isBusy: false,
  status: '画像を読み込むと、ここに変換状況を表示します。',
  error: '',
};

const ui = createUI({
  onFileSelected: handleFileSelected,
  onOptionsChanged: handleOptionsChanged,
  onConvertRequested: handleConvertRequested,
  onDownloadRequested: handleDownloadRequested,
});

render();
initializeFormats();

async function initializeFormats() {
  try {
    const supportedFormats = await detectSupportedOutputFormats();
    const defaultFormat = supportedFormats.find((format) => format.mime === 'image/webp') || supportedFormats[0] || null;
    updateState({
      supportedFormats,
      selectedFormat: defaultFormat,
      options: {
        ...state.options,
        outputType: defaultFormat?.mime || '',
      },
      status: supportedFormats.length
        ? `このブラウザでは ${supportedFormats.map((format) => format.label).join(' / ')} に変換できます。`
        : 'このブラウザでは画像の書き出し形式を検出できませんでした。',
    });
  } catch (error) {
    updateState({
      error: `対応形式の検出に失敗しました: ${error.message}`,
      status: '対応形式を検出できませんでした。',
    });
  }
}

async function handleFileSelected(file) {
  clearResultUrl();
  clearSourceUrl();
  updateState({
    source: null,
    result: null,
    isBusy: true,
    error: '',
    status: '画像を読み込んでいます。',
  });

  try {
    const source = await loadImageSource(file);
    updateState({
      source,
      result: null,
      isBusy: false,
      status: `${source.typeLabel} を読み込みました。寸法は ${source.width} x ${source.height}px のまま変換します。`,
    });
  } catch (error) {
    updateState({
      source: null,
      result: null,
      isBusy: false,
      error: error.message,
      status: '画像の読み込みに失敗しました。',
    });
  }
}

function handleOptionsChanged(patch) {
  const options = {
    ...state.options,
    ...patch,
  };
  const selectedFormat = findFormat(state.supportedFormats, options.outputType);
  if (selectedFormat && selectedFormat.mime !== options.outputType) {
    options.outputType = selectedFormat.mime;
  }

  clearResultUrl();
  updateState({
    options,
    selectedFormat,
    result: null,
    error: '',
    status: state.source
      ? '設定を変更しました。変換を開始すると新しい結果を作成します。'
      : state.status,
  });
}

async function handleConvertRequested() {
  if (!state.source) {
    updateState({ error: '先に画像を読み込んでください。' });
    return;
  }
  if (!state.selectedFormat) {
    updateState({ error: '出力形式を選択してください。' });
    return;
  }

  clearResultUrl();
  updateState({
    result: null,
    isBusy: true,
    error: '',
    status: `${state.selectedFormat.label} へ変換しています。`,
  });

  try {
    const result = await convertImage(state.source, {
      format: state.selectedFormat,
      quality: state.options.quality,
      lossless: state.options.lossless,
      matteColor: state.options.matteColor,
    });
    updateState({
      result,
      isBusy: false,
      status: buildResultMessage(state.source, result),
    });
  } catch (error) {
    updateState({
      result: null,
      isBusy: false,
      error: error.message,
      status: '変換に失敗しました。',
    });
  }
}

function handleDownloadRequested() {
  if (!state.result || !state.source) {
    updateState({ error: '先に変換を実行してください。' });
    return;
  }
  downloadBlob(state.result.blob, buildOutputName(state.source.name, state.result.outputType));
}

function buildResultMessage(source, result) {
  const parts = [
    `${result.outputTypeLabel} へ変換しました。`,
    `寸法は ${result.width} x ${result.height}px のままです。`,
    `出力サイズは ${formatBytes(result.outputSize)} です。`,
  ];
  if (result.losslessApplied) {
    parts.push('Lossless モードで書き出しました。');
  } else if (result.losslessRequested) {
    parts.push('選択形式はブラウザ標準API上でLossless保証がないため、品質100%の通常書き出しとして処理しました。');
  }
  if (result.matteApplied) {
    parts.push(`元画像の透過部分は ${state.options.matteColor} で合成しました。`);
  }
  if (source.type === result.outputType) {
    parts.push('同じ形式への再書き出しのため、ファイルサイズが変わることがあります。');
  }
  return parts.join(' ');
}

function updateState(patch) {
  state = {
    ...state,
    ...patch,
  };
  render();
}

function render() {
  ui.render(state);
}

function clearSourceUrl() {
  if (state.source?.previewUrl) {
    revokeObjectUrl(state.source.previewUrl);
  }
}

function clearResultUrl() {
  if (state.result?.previewUrl) {
    revokeObjectUrl(state.result.previewUrl);
  }
}

window.addEventListener('beforeunload', () => {
  clearResultUrl();
  clearSourceUrl();
});
