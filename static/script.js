import * as pdfjsLib from "https://mozilla.github.io/pdf.js/build/pdf.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://mozilla.github.io/pdf.js/build/pdf.worker.mjs";

const focusFirstInput = (container) => {
  const el = container.querySelector('input, textarea, button, [tabindex]:not([tabindex="-1"])');
  if (el) el.focus();
};

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  const showModalBtn = document.getElementById('show-modal-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const createPdfBtn = document.getElementById('create-pdf-btn');
  const pdfFileInput = document.getElementById('pdf-file-input');
  const scanQrBtn = document.getElementById('scan-qr-btn');

  const dataModal = document.getElementById('data-modal');
  const scannerModal = document.getElementById('scanner-modal');
  const pdfExtractionModal = document.getElementById('pdf-extraction-modal');
  const confirmModal = document.getElementById('confirm-modal');

  const closeButtons = document.querySelectorAll('.close-btn');
  const materialForm = document.getElementById('material-form');
  const qrCodeContainer = document.getElementById('qr-code-container');
  const emptyStateContainer = document.getElementById('empty-state-container');

  const editIdField = document.createElement('input');
  editIdField.type = 'hidden';
  editIdField.id = 'edit-id';
  materialForm.appendChild(editIdField);

  const formLayout = [
    [
      {id: 'fornecedor', label: 'Fornecedor', type: 'text', required: true},
      {id: 'cnpj-entregador', label: 'CNPJ do Entregador', type: 'text', required: false}
    ],
    [
      {id: 'denominacao', label: 'Denominação', type: 'text', required: true},
      {id: 'cod-peca', label: 'Cód. Peça', type: 'text', required: true}
    ],
    [
      {id: 'item', label: 'Item', type: 'text', required: true},
      {id: 'operador', label: 'Operador', type: 'text', required: true}
    ],
    [
      {id: 'data-rec', label: 'Data Rec.', type: 'date', required: true},
      {id: 'qtd-recebida', label: 'Qtd Recebida', type: 'number', required: true}
    ],
    [
      {id: 'qtd-amarrados', label: 'Qtd Amarrados', type: 'number', required: true},
      {id: 'corrida', label: 'Corrida', type: 'text', required: true}
    ],
    [
      {id: 'lote', label: 'Lote', type: 'text', required: true},
      {id: 'localizacao-ninho', label: 'Localização do Ninho', type: 'text', required: true}
    ],
    [{id: 'descricao-produto', label: 'Descrição do Produto', type: 'textarea', rows: 3}],
    [{id: 'observacao', label: 'Observações', type: 'textarea', rows: 3}],
  ];

  let formHtml = '';
  formLayout.forEach(row => {
    formHtml += '<div class="form-row">';
    row.forEach(field => {
      formHtml += `<div class="form-group" id="group-${field.id}">`;
      formHtml += `<label for="${field.id}">${field.label}</label>`;
      if (field.type === 'textarea') {
        formHtml += `<textarea id="${field.id}" rows="${field.rows || 3}"></textarea>`;
      } else {
        formHtml += `<input type="${field.type}" id="${field.id}" ${field.required ? 'required' : ''} ${field.type === 'number' ? 'min="1"' : ''} />`;
      }
      formHtml += '</div>';
    });
    formHtml += '</div>';
  });
  materialForm.innerHTML += formHtml + `<button type="submit">Salvar Material</button>`;

  // Toast
  const showToast = (message, type = 'info') => {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
      success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
      error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
      info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };
    toast.innerHTML = `<div class="toast-icon">${icons[type]}</div><div class="toast-message">${message}</div>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.5s forwards';
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  };

  // Confirm
  const showConfirmModal = (title, text, onConfirm) => {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-text').textContent = text;
    openModal(confirmModal);

    const yesBtn = document.getElementById('confirm-btn-yes');
    const noBtn = document.getElementById('confirm-btn-no');

    const confirmHandler = () => { try { onConfirm(); } catch(e){ console.error(e); } closeModal(confirmModal); };
    const cancelHandler = () => { closeModal(confirmModal); };

    yesBtn.addEventListener('click', confirmHandler, { once:true });
    noBtn.addEventListener('click', cancelHandler, { once:true });
  };

  // Storage
  const getMaterials = () => JSON.parse(localStorage.getItem('materials')) || [];
  const saveMaterials = (materials) => localStorage.setItem('materials', JSON.stringify(materials));

  // Render
  const renderQrCodes = () => {
    const materials = getMaterials();
    const mainTitle = document.querySelector('main h2');

    if (materials.length === 0) {
      qrCodeContainer.style.display = 'none';
      mainTitle.style.display = 'none';
      emptyStateContainer.style.display = 'block';
      return;
    }

    qrCodeContainer.style.display = 'grid';
    mainTitle.style.display = 'block';
    emptyStateContainer.style.display = 'none';
    qrCodeContainer.innerHTML = '';

    materials.forEach((material, index) => {
      const qrItem = document.createElement('div');
      qrItem.className = 'qr-item';
      qrItem.dataset.id = material.id;
      qrItem.style.animationDelay = `${index * 50}ms`;

      const qrCodeImgDiv = document.createElement('div');
      qrCodeImgDiv.className = 'qr-code-img';

      const denomination = document.createElement('p');
      denomination.textContent = material.denominacao;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'action-btn edit-btn';
      editBtn.title = 'Editar';
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
      editBtn.onclick = (e) => { e.stopPropagation(); editMaterial(material.id); };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn delete-btn';
      deleteBtn.title = 'Excluir';
      deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
      deleteBtn.onclick = (e) => { e.stopPropagation(); deleteMaterial(material.id, material.denominacao); };

      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);
      qrItem.appendChild(actionsDiv);
      qrItem.appendChild(qrCodeImgDiv);
      qrItem.appendChild(denomination);
      qrItem.addEventListener('click', () => showMaterialDetails(material));
      qrCodeContainer.appendChild(qrItem);

      new QRCode(qrCodeImgDiv, { text: material.id, width: 150, height: 150, colorDark: "#1e293b", colorLight: "#ffffff" });
    });
  };

  // Modais
  const openModal = (modal) => {
    modal.style.display = 'flex';
    focusFirstInput(modal);
  };
  const closeModal = (modal) => {
    modal.style.display = 'none';
    if (modal.id === 'scanner-modal') stopScanner();
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = [...document.querySelectorAll('.modal')].find(m => m.style.display === 'flex');
      if (open) closeModal(open);
    }
  });

  // Eventos UI
  showModalBtn.addEventListener('click', () => {
    materialForm.reset();
    document.getElementById('edit-id').value = '';
    document.querySelectorAll('#material-form input, #material-form textarea').forEach(el => el.className = '');
    openModal(dataModal);
  });

  scanQrBtn.addEventListener('click', async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia não suportado');
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      openModal(scannerModal);
      startScanner();
    } catch (err) {
      console.error('Permissão/Dispositivo de câmera indisponível:', err);
      showToast("Câmera não encontrada ou permissão negada.", "error");
    }
  });

  closeButtons.forEach(btn => btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal'))));
  window.addEventListener('click', (event) => { if (event.target.classList.contains('modal')) closeModal(event.target); });

  // CRUD
  materialForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const existingId = document.getElementById('edit-id').value;
    const formData = {};
    formLayout.flat().forEach(f => {
      const key = f.id.replace(/-(\w)/g, (_, p1) => p1.toUpperCase());
      formData[key] = document.getElementById(f.id).value.trim();
    });

    const requiredIds = formLayout.flat().filter(f=>f.required).map(f=>f.id);
    let invalid = false;
    requiredIds.forEach(id=>{
      const el = document.getElementById(id);
      if (!el.value.trim()) { el.classList.add('invalid'); invalid = true; }
      else el.classList.remove('invalid');
    });
    if (invalid) { showToast('Preencha os campos obrigatórios.', 'error'); return; }

    const materials = getMaterials();

    if (existingId) {
      const index = materials.findIndex(m => m.id === existingId);
      if (index !== -1) materials[index] = { id: existingId, ...formData };
      showToast('Material atualizado com sucesso!', 'success');
    } else {
      formData.id = `mat_${Date.now()}`;
      materials.push(formData);
      showToast('Material criado com sucesso!', 'success');
    }

    saveMaterials(materials);
    renderQrCodes();
    closeModal(dataModal);
    materialForm.reset();
  });

  const editMaterial = (id) => {
    const materials = getMaterials();
    const material = materials.find(m => m.id === id);
    if (material) {
      document.querySelectorAll('#material-form input, #material-form textarea').forEach(el => el.className = '');
      document.getElementById('edit-id').value = material.id;

      formLayout.flat().forEach(field => {
        const el = document.getElementById(field.id);
        const key = field.id.replace(/-(\w)/g, (_, p1) => p1.toUpperCase());
        if (el && material[key] !== undefined) el.value = material[key];
      });
      openModal(dataModal);
    }
  };

  const deleteMaterial = (id, name) => {
    showConfirmModal(
      'Excluir Material',
      `Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`,
      () => {
        let materials = getMaterials();
        materials = materials.filter(m => m.id !== id);
        saveMaterials(materials);
        renderQrCodes();
        showToast('Material excluído com sucesso.', 'success');
      }
    );
  };

  const showMaterialDetails = (material) => editMaterial(material.id);

  // Scanner
  const html5QrCode = new Html5Qrcode("qr-reader");
  let isScannerRunning = false;

  const stopScanner = async () => {
    if (isScannerRunning) {
      try { await html5QrCode.stop(); }
      catch (err) { console.error("Falha ao parar scanner:", err); }
      finally { isScannerRunning = false; }
    }
  };

  const startScanner = () => {
    if (isScannerRunning) return;
    const config = { fps: 15, qrbox: { width: 280, height: 280 } };
    isScannerRunning = true;

    html5QrCode.start({ facingMode: "environment" }, config, async (decodedText) => {
      const qrReaderEl = document.getElementById('qr-reader');
      qrReaderEl.classList.add('scan-success');

      await stopScanner();

      setTimeout(() => {
        const materials = getMaterials();
        const materialData = materials.find(m => m.id === decodedText);

        if (materialData) {
          showToast(`QR Code lido: ${materialData.denominacao}`, 'success');
          closeModal(scannerModal);
          showMaterialDetails(materialData);
        } else {
          showToast("Material não encontrado.", "error");
          closeModal(scannerModal);
        }

        qrReaderEl.classList.remove('scan-success');
      }, 400);

    }).catch(err => {
      console.error("Não foi possível iniciar o scanner.", err);
      showToast("Câmera não encontrada ou permissão negada.", "error");
      isScannerRunning = false;
      closeModal(scannerModal);
    });
  };

  // Export CSV
  exportCsvBtn.addEventListener('click', () => {
    const materials = getMaterials();
    if (materials.length === 0) {
      showToast('Nenhum material para exportar.', 'info');
      return;
    }

    const headers = formLayout.flat().map(field => field.label);
    let csvContent = headers.join(',') + '\r\n';

    materials.forEach(material => {
      const row = formLayout.flat().map(field => {
        const key = field.id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
        let value = material[key] ?? '';
        value = String(value).replace(/"/g,'""').replace(/\r?\n/g, ' ');
        if (value.includes(',')) value = `"${value}"`;
        return value;
      });
      csvContent += row.join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "materiais_exportados.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Exportação concluída!', 'success');
    }
  });

  // PDF/Imagem -> Preview + Extração
  createPdfBtn.addEventListener('click', () => pdfFileInput.click());

  pdfFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    openModal(pdfExtractionModal);
    openModal(dataModal); // Abre o modal de dados para preenchimento

    const statusEl = document.getElementById('pdf-processing-status');
    const canvas = document.getElementById('pdf-preview-canvas');
    statusEl.parentElement.style.display = 'block';
    canvas.style.display = 'none';

    statusEl.textContent = 'Renderizando pré-visualização...';
    try {
      await renderPreview(file);
      canvas.style.display = 'block';
    } catch (e) {
      console.error('Falha ao renderizar preview:', e);
      showToast('Falha ao renderizar pré-visualização.', 'error');
      closeModal(pdfExtractionModal);
      closeModal(dataModal);
      pdfFileInput.value = '';
      return;
    }

    statusEl.textContent = 'Extraindo dados com IA...';
    try {
      const extractedData = await extractDataWithGemini(file, statusEl);
      populateFormWithSuggestions(extractedData);
      closeModal(pdfExtractionModal);
      showToast('Extração de dados concluída!', 'success');
    } catch (error) {
      console.error("Falha na extração:", error);
      showToast(error.message || 'Falha na extração dos dados.', 'error');
      closeModal(pdfExtractionModal);
      closeModal(dataModal);
    } finally {
      pdfFileInput.value = '';
    }
  });

  async function renderPreview(file) {
    const canvas = document.getElementById('pdf-preview-canvas');
    const ctx = canvas.getContext('2d');

    if (file.type.startsWith('image/')) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = () => {
          const maxW = 900;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
      });
      return;
    }

    if (file.type !== "application/pdf") {
      throw new Error('Arquivo não é PDF nem imagem suportada.');
    }

    const fileReader = new FileReader();
    await new Promise((resolve, reject) => {
      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });

          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: ctx, viewport }).promise;
          resolve();
        } catch (e) { reject(e); }
      };
      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(file);
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        try {
          const base64String = String(reader.result).split(',')[1];
          resolve(base64String);
        } catch (e) { reject(e); }
      };
      reader.onerror = error => reject(error);
    });
  }

  async function extractDataWithGemini(file, statusEl) {
    statusEl.textContent = 'Preparando documento para análise...';
    const base64Data = await fileToBase64(file);

    // --- CORREÇÃO ---
    // A API key deve ser "" (vazia) para que o ambiente forneça a chave.
    const apiKey = "AIzaSyAUUVIiAus6e0xmK_eAF-tnuFqZsn250BU"; 
    // Usando o modelo flash mais recente recomendado para esta tarefa.
    const model = "gemini-2.5-flash-preview-09-2025";
    // --- FIM DA CORREÇÃO ---
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Analise este documento (nota fiscal, certificado de material ou romaneio) e extraia as seguintes informações no formato JSON. Se não encontrar, use null. Campos: fornecedor, cnpjEntregador, denominacao, codPeca, item, operador, dataRec (AAAA-MM-DD), qtdRecebida (número), qtdAmarrados (número), corrida, lote, localizacaoNinho, descricaoProduto, observacao.`;

    const schema = {
      type: "OBJECT",
      properties: {
        fornecedor: { type: "STRING" },
        cnpjEntregador: { type: "STRING" },
        denominacao: { type: "STRING" },
        codPeca: { type: "STRING" },
        item: { type: "STRING" },
        operador: { type: "STRING" },
        dataRec: { type: "STRING", description: "Formato AAAA-MM-DD" },
        qtdRecebida: { type: "NUMBER" },
        qtdAmarrados: { type: "NUMBER" },
        corrida: { type: "STRING" },
        lote: { type: "STRING" },
        localizacaoNinho: { type: "STRING" },
        descricaoProduto: { type: "STRING" },
        observacao: { type: "STRING" }
      }
    };

    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: file.type, data: base64Data } }
        ]
      }],
      generation_config: {
        response_mime_type: "application/json",
        response_schema: schema
      }
    };

    statusEl.textContent = 'Consultando IA do Gemini...';
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (networkErr) {
      console.error("Erro de rede ao chamar IA:", networkErr);
      throw new Error("Falha de rede/CORS ao comunicar com a IA.");
    }

    if (!response.ok) {
      let errorBody = {};
      try { errorBody = await response.json(); } catch {}
      console.error("API Error:", errorBody);
      throw new Error("Erro na resposta da IA.");
    }

    statusEl.textContent = 'Processando resposta da IA...';
    const result = await response.json();

    const candidate = result?.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (!part) {
      console.error("Resposta inválida da IA:", result);
      throw new Error("A IA não retornou dados extraídos.");
    }

    if (part.text) {
      try { return JSON.parse(part.text); }
      catch (e) {
        console.error("Erro ao parsear JSON:", e, "Texto bruto:", part.text);
        throw new Error("A IA retornou texto não parseável como JSON.");
      }
    }

    console.error("Formato inesperado:", part);
    throw new Error("Formato de resposta inesperado da IA.");
  }

  function populateFormWithSuggestions(suggestions) {
    materialForm.reset();
    document.getElementById('edit-id').value = '';

    Object.keys(suggestions).forEach(key => {
      // O 'key' aqui é o que vem do JSON da IA (ex: 'cnpjEntregador')
      const camelCaseKey = key;
      // Converte camelCase para kebab-case (ex: 'cnpjEntregador' -> 'cnpj-entregador')
      const kebabKey = camelCaseKey.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
      
      const el = document.getElementById(kebabKey);
      
      if (el && suggestions[key] !== null && suggestions[key] !== undefined) {
        el.value = suggestions[key];
      }
    });

    // Marca obrigatórios vazios
    document.querySelectorAll('[required]').forEach(el=>{
      if (!el.value.trim()) el.classList.add('invalid'); else el.classList.remove('invalid');
    });
  }

  // Inicial
  renderQrCodes();
}
