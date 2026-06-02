const ELEMENT_IDS = [
  'themeToggle',
  'dropzone',
  'fileInput',
  'dropzoneContent',
  'editorLayout',
  'beforePreview',
  'afterPreview',
  'afterPlaceholder',
  'formatSelect',
  'formatHelp',
  'qualityInput',
  'qualityValue',
  'qualityHelp',
  'losslessInput',
  'matteField',
  'matteColorInput',
  'matteTextInput',
  'replaceButton',
  'convertButton',
  'downloadButton',
  'statusNote',
  'errorNote',
];

export function createUI(handlers) {
  const elements = Object.fromEntries(
    ELEMENT_IDS.map((id) => [id, document.getElementById(id)])
  );

  bindThemeToggle(elements.themeToggle);
  bindFileInput(elements, handlers);
  bindControls(elements, handlers);

  return {
    render(state) {
      renderFormats(elements, state);
      renderSource(elements, state);
      renderResult(elements, state);
      renderControls(elements, state);
      renderStatus(elements, state);
    },
  };
}

function bindThemeToggle(button) {
  button.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    button.setAttribute('aria-label', nextTheme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
    button.title = button.getAttribute('aria-label');
    try {
      localStorage.setItem('image-shift-theme', nextTheme);
    } catch {
      // Ignore storage errors; the visual toggle can still work for this page.
    }
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.content = nextTheme === 'dark' ? '#101725' : '#2563ff';
    }
  });
}

function bindFileInput(elements, handlers) {
  elements.fileInput.addEventListener('change', () => {
    const [file] = elements.fileInput.files || [];
    if (file) {
      handlers.onFileSelected(file);
    }
  });

  elements.dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    elements.dropzone.classList.add('dragover');
  });

  elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('dragover');
  });

  elements.dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove('dragover');
    const [file] = event.dataTransfer.files || [];
    if (file) {
      handlers.onFileSelected(file);
    }
  });

  elements.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      elements.fileInput.click();
    }
  });

  elements.replaceButton.addEventListener('click', () => {
    elements.fileInput.click();
  });
}

function bindControls(elements, handlers) {
  elements.formatSelect.addEventListener('change', () => {
    handlers.onOptionsChanged({ outputType: elements.formatSelect.value });
  });

  elements.qualityInput.addEventListener('input', () => {
    handlers.onOptionsChanged({ quality: Number(elements.qualityInput.value) });
  });

  elements.losslessInput.addEventListener('change', () => {
    handlers.onOptionsChanged({ lossless: elements.losslessInput.checked });
  });

  elements.matteColorInput.addEventListener('input', () => {
    handlers.onOptionsChanged({ matteColor: elements.matteColorInput.value });
  });

  elements.matteTextInput.addEventListener('change', () => {
    const normalized = normalizeHex(elements.matteTextInput.value);
    elements.matteTextInput.value = normalized;
    handlers.onOptionsChanged({ matteColor: normalized });
  });

  elements.convertButton.addEventListener('click', () => {
    handlers.onConvertRequested();
  });

  elements.downloadButton.addEventListener('click', () => {
    handlers.onDownloadRequested();
  });
}

function renderFormats(elements, state) {
  if (state.supportedFormats.length === 0) {
    elements.formatSelect.innerHTML = '<option value="">検出中</option>';
    elements.formatSelect.disabled = true;
    return;
  }

  elements.formatSelect.disabled = state.isBusy;
  elements.formatSelect.innerHTML = state.supportedFormats
    .map((format) => `<option value="${format.mime}">${format.label}</option>`)
    .join('');
  elements.formatSelect.value = state.options.outputType;
}

function renderSource(elements, state) {
  const hasSource = Boolean(state.source);
  elements.dropzone.classList.toggle('hidden', hasSource);
  elements.editorLayout.classList.toggle('hidden', !hasSource);

  if (!state.source) {
    elements.beforePreview.removeAttribute('src');
    return;
  }

  elements.beforePreview.src = state.source.previewUrl;
}

function renderResult(elements, state) {
  if (!state.result) {
    elements.afterPreview.classList.add('hidden');
    elements.afterPreview.removeAttribute('src');
    elements.afterPlaceholder.classList.remove('hidden');
    return;
  }

  elements.afterPreview.src = state.result.previewUrl;
  elements.afterPreview.classList.remove('hidden');
  elements.afterPlaceholder.classList.add('hidden');
}

function renderControls(elements, state) {
  const selectedFormat = state.selectedFormat;
  const canUseQuality = Boolean(selectedFormat?.supportsQuality && !state.options.lossless);
  const shouldShowMatte = Boolean(selectedFormat && !selectedFormat.supportsAlpha);

  elements.qualityInput.value = String(state.options.quality);
  elements.qualityInput.disabled = state.isBusy || !canUseQuality;
  elements.qualityValue.textContent = `${state.options.quality}%`;
  elements.qualityHelp.textContent = state.options.lossless
    ? 'Lossless モード中は品質スライダーを使いません。非Lossless形式は品質100%で書き出します。'
    : selectedFormat?.supportsQuality
      ? `${selectedFormat.label} の画質とファイルサイズのバランスを調整します。`
      : `${selectedFormat?.label || 'この形式'} はブラウザAPI上では品質指定がありません。`;

  elements.losslessInput.checked = state.options.lossless;
  elements.losslessInput.disabled = state.isBusy;
  elements.matteField.classList.toggle('hidden', !shouldShowMatte);
  elements.matteColorInput.value = state.options.matteColor;
  elements.matteTextInput.value = state.options.matteColor;

  elements.formatHelp.textContent = selectedFormat?.lossless
    ? `${selectedFormat.label} はLossless書き出しとして扱えます。`
    : `${selectedFormat?.label || '選択形式'} はブラウザ標準APIではLossless保証がありません。`;

  elements.replaceButton.disabled = state.isBusy;
  elements.convertButton.disabled = state.isBusy || !state.source || !selectedFormat;
  elements.downloadButton.disabled = state.isBusy || !state.result;
}

function renderStatus(elements, state) {
  elements.statusNote.textContent = state.status;
  elements.errorNote.textContent = state.error || '';
  elements.errorNote.classList.toggle('hidden', !state.error);
}

function normalizeHex(value) {
  const trimmed = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  return '#ffffff';
}
