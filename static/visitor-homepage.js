// Removidos: pdfjsLib imports (PDF extraction)

const focusFirstInput = (container) => {
  const el = container.querySelector('input, textarea, button, [tabindex]:not([tabindex="-1"])');
  if (el) el.focus();
};

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // Elementos de edição e extração removidos
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const scanQrBtn = document.getElementById('scan-qr-btn');

  // Modais de edição e extração removidos
  const scannerModal = document.getElementById('scanner-modal');
  const confirmModal = document.getElementById('confirm-modal');
  const materialDetailsModal = document.getElementById('material-details-modal'); // Novo modal read-only
  
  const closeButtons = document.querySelectorAll('.close-btn');

  const qrCodeContainerPendente = document.getElementById('qr-code-container-pendente');
  const qrCodeContainerFinalizado = document.getElementById('qr-code-container-finalizado');
  const qrCodeContainerEncerrado = document.getElementById('qr-code-container-encerrado');
  const emptyStatePendente = document.getElementById('empty-state-pendente');
  const emptyStateFinalizado = document.getElementById('empty-state-finalizado');
  const emptyStateEncerrado = document.getElementById('empty-state-encerrado');

  // Removido: toda a lógica de construção e submissão do formulário de material

  // Toast (Mantido)
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

  // Removido: showConfirmModal (pois delete/archive foram removidos)

  // Storage (Mantido apenas getMaterials)
  const getMaterials = () => JSON.parse(localStorage.getItem('materials')) || [];

  function createQrItem(material, index) {
    const qrItem = document.createElement('div');
    qrItem.className = 'qr-item';
    qrItem.dataset.id = material.id;
    qrItem.style.animationDelay = `${index * 50}ms`;

    const statusDot = document.createElement('div');
    let statusClass = 'status-pendente';
    if (material.status === 'finalizado') statusClass = 'status-finalizado';
    if (material.status === 'encerrado') statusClass = 'status-encerrado';
    
    statusDot.className = `status-dot ${statusClass}`;
    qrItem.appendChild(statusDot);

    const qrCodeImgDiv = document.createElement('div');
    qrCodeImgDiv.className = 'qr-code-img';

    const denomination = document.createElement('p');
    denomination.textContent = material.denominacao;

    // Removido: actionsDiv, editBtn, deleteBtn (Não há ações de edição/exclusão para o visitante)

    qrItem.appendChild(qrCodeImgDiv);
    qrItem.appendChild(denomination);
    
    if (material.status === 'encerrado') {
      qrItem.classList.add('encerrado');
    }
    
    // O item é clicável para ver detalhes (read-only)
    qrItem.addEventListener('click', () => showMaterialReadOnlyDetails(material));
    
    new QRCode(qrCodeImgDiv, { text: material.id, width: 150, height: 150, colorDark: "#1e293b", colorLight: "#ffffff" });
    
    return qrItem;
  }

  const renderQrCodes = () => {
    const materials = getMaterials();
    
    const pendentes = materials.filter(m => m.status === 'pendente' || !m.status);
    const finalizados = materials.filter(m => m.status === 'finalizado');
    const encerrados = materials.filter(m => m.status === 'encerrado');

    qrCodeContainerPendente.innerHTML = '';
    qrCodeContainerFinalizado.innerHTML = '';
    qrCodeContainerEncerrado.innerHTML = '';

    if (pendentes.length === 0) {
      qrCodeContainerPendente.style.display = 'none';
      emptyStatePendente.style.display = 'block';
    } else {
      qrCodeContainerPendente.style.display = 'grid';
      emptyStatePendente.style.display = 'none';
      pendentes.forEach((material, index) => {
        qrCodeContainerPendente.appendChild(createQrItem(material, index));
      });
    }

    if (finalizados.length === 0) {
      qrCodeContainerFinalizado.style.display = 'none';
      emptyStateFinalizado.style.display = 'block';
    } else {
      qrCodeContainerFinalizado.style.display = 'grid';
      emptyStateFinalizado.style.display = 'none';
      finalizados.forEach((material, index) => {
        qrCodeContainerFinalizado.appendChild(createQrItem(material, index));
      });
    }
    
    if (encerrados.length === 0) {
      qrCodeContainerEncerrado.style.display = 'none';
      emptyStateEncerrado.style.display = 'block';
    } else {
      qrCodeContainerEncerrado.style.display = 'grid';
      emptyStateEncerrado.style.display = 'none';
      encerrados.forEach((material, index) => {
        qrCodeContainerEncerrado.appendChild(createQrItem(material, index));
      });
    }
  };

  // Modais (Mantido e ajustado)
  const openModal = (modal) => {
    modal.style.display = 'block';
    focusFirstInput(modal);
    const resultTextEl = document.getElementById('qr-reader-result-text');
    if (resultTextEl) resultTextEl.style.display = 'none';
  };
  const closeModal = (modal) => {
    modal.style.display = 'none';
    if (modal.id === 'scanner-modal') stopScanner();
  };

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
  });

  window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target);
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = [...document.querySelectorAll('.modal')].find(m => m.style.display === 'block');
      if (open) closeModal(open);
    }
  });
  
  const pageTitle = document.getElementById('page-title');
  const activeContainer = document.getElementById('active-materials-container');
  const archivedContainer = document.getElementById('archived-materials-container');
  const actionGroup = document.querySelector('.action-group');
  const navItems = document.querySelectorAll('.nav-item');

  function switchTab(tabName) {
    navItems.forEach(item => item.classList.remove('active'));
    
    if (tabName === 'materiais') {
      document.querySelector('.nav-item[data-nav="materiais"]').classList.add('active');
      pageTitle.textContent = 'Materiais';
      activeContainer.style.display = 'block';
      archivedContainer.style.display = 'none';
      actionGroup.style.display = 'block';
    } else if (tabName === 'encerrados') {
      document.querySelector('.nav-item[data-nav="encerrados"]').classList.add('active');
      pageTitle.textContent = 'Materiais Encerrados';
      activeContainer.style.display = 'none';
      archivedContainer.style.display = 'block';
      actionGroup.style.display = 'block';
    }
  }

  document.querySelector('.nav-item[data-nav="materiais"]').addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('materiais');
  });
  document.querySelector('.nav-item[data-nav="encerrados"]').addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('encerrados');
  });

  // CSV Export (Mantido)
  function convertToCsv(materials) {
    if (materials.length === 0) return '';
    const headers = Object.keys(materials[0]).join(';');
    const rows = materials.map(m => Object.values(m).map(val => {
        let strVal = String(val || '').replace(/"/g, '""');
        if (strVal.includes(';') || strVal.includes('\n')) {
            strVal = `"${strVal}"`;
        }
        return strVal;
    }).join(';'));
    return [headers, ...rows].join('\n');
  }

  exportCsvBtn.addEventListener('click', () => {
    const materials = getMaterials();
    if (materials.length === 0) {
      showToast('Nenhum material para exportar.', 'info');
      return;
    }
    const csvContent = convertToCsv(materials);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'materiais_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exportação CSV iniciada.', 'success');
  });
  
  // FUNÇÃO READ-ONLY PARA DETALHES DO MATERIAL (NOVO)
  const showMaterialReadOnlyDetails = (material) => {
    const detailsContainer = document.getElementById('material-details-content');
    const titleEl = document.getElementById('material-details-title');
    detailsContainer.innerHTML = '';
    
    if (!material) {
        titleEl.textContent = 'Material Não Encontrado';
        detailsContainer.innerHTML = '<p style="text-align:center;">Os detalhes deste material não puderam ser carregados.</p>';
        openModal(materialDetailsModal);
        return;
    }

    titleEl.textContent = `Detalhes: ${material.denominacao}`;

    // Lista de campos para exibição (a ordem é importante)
    const fields = [
      { id: 'id', label: 'ID do Material', isSpecial: true },
      { id: 'fornecedor', label: 'Fornecedor' },
      { id: 'cnpj-entregador', label: 'CNPJ do Entregador' },
      { id: 'denominacao', label: 'Denominação' },
      { id: 'cod-peca', label: 'Cód. Peça' },
      { id: 'item', label: 'Item' },
      { id: 'operador', label: 'Operador (Recebimento)' },
      { id: 'data-rec', label: 'Data de Emissão' },
      { id: 'qtd-recebida', label: 'Qtd Recebida (Nota)' },
      { id: 'qtd-recebida-real', label: 'Qtd. Recebida Real' },
      { id: 'qtd-amarrados', label: 'Qtd Amarrados (Auto)' },
      { id: 'corrida', label: 'Corrida' },
      { id: 'lote', label: 'Lote' },
      { id: 'localizacao-ninho', label: 'Almoxarifado' },
      { id: 'descricao-produto', label: 'Descrição do Produto', isLarge: true },
      { id: 'observacao', label: 'Observações', isLarge: true },
      { id: 'autorizado-por', label: 'Autorizado Por (Etapa 2)' },
      { id: 'status', label: 'Status' }
    ];

    const getDisplayValue = (fieldId, value) => {
        if (!value) return '-';
        if (fieldId === 'status') {
             return value.charAt(0).toUpperCase() + value.slice(1);
        }
        return value;
    };

    fields.forEach(field => {
        const keyInObject = field.id.replace(/-/g, '');
        const value = material[keyInObject] || material[field.id] || '';

        // Exibe apenas campos com valor preenchido ou o ID
        if (value.trim() !== '' || field.id === 'id') {
            const row = document.createElement('div');
            row.className = 'form-row';
            row.style.marginBottom = '1rem';
            
            let valueHtml;
            if (field.id === 'id') {
                 valueHtml = `<input type="text" value="${value}" readonly style="width:100%; padding:0.5rem; border:1px solid #e2e8f0; background:#f9fafb; border-radius:0.375rem; color: var(--primary-color); font-weight: 600;">`;
            } else {
                valueHtml = `<p style="margin:0.5rem 0 0; background:#f4f4f4; padding:0.5rem; border-radius:0.375rem; white-space: pre-wrap; color: var(--text-color);">${getDisplayValue(field.id, value)}</p>`;
            }

            row.innerHTML = `
                <div class="form-group" style="grid-column: span ${field.isLarge ? 2 : 1};">
                    <label style="font-weight: 500; color: var(--text-light); font-size: 0.875rem;">${field.label}</label>
                    ${valueHtml}
                </div>
            `;
            detailsContainer.appendChild(row);
        }
    });

    openModal(materialDetailsModal);
  };
  
  // Removido: editMaterial, deleteMaterial

  // Scanner (Mantido e ajustado para usar a função read-only)
  let html5QrCode;
  let isScanning = false;
  const qrReaderEl = document.getElementById('qr-reader');
  const qrStatusEl = document.getElementById('qr-reader-status');
  
  const stopScanner = () => {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(ignore => {
            isScanning = false;
            if(qrStatusEl) qrStatusEl.textContent = 'Leitura interrompida.';
        }).catch(err => {
            console.error('Erro ao parar scanner:', err);
        });
    }
  };

  const startScanner = (config = { facingMode: "environment" }) => {
    if (html5QrCode && isScanning) return; 
    
    Html5Qrcode.getCameras().then(devices => {
      let cameraId = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('traseira'))?.id;

      if (!cameraId && devices.length > 0) {
          cameraId = devices[0].id;
      }

      if (cameraId) {
        if (qrStatusEl) qrStatusEl.textContent = 'Iniciando câmera...';
        html5QrCode.start(
          cameraId, 
          config, 
          handleQrCodeScan, 
          (errorMessage) => { 
            /* Erros em tempo real */ 
          }
        ).then(() => {
            isScanning = true;
            if (qrStatusEl) qrStatusEl.textContent = 'Câmera iniciada. Aponte para o QR Code.';
        }).catch(err => {
            console.error("Não foi possível iniciar o scanner:", err);
            if (qrStatusEl) qrStatusEl.textContent = 'Erro ao iniciar a câmera: ' + err.message;
            showToast("Câmera não encontrada ou permissão negada.", "error");
        });
      } else {
        showToast("Nenhuma câmera encontrada.", "error");
        if (qrStatusEl) qrStatusEl.textContent = 'Nenhuma câmera encontrada.';
      }
    }).catch(err => {
        console.error("Erro ao listar câmeras:", err);
        showToast("Erro ao acessar câmeras.", "error");
    });
  };

  const handleQrCodeScan = (decodedText, decodedResult) => {
    stopScanner(); 
    if (qrReaderEl) qrReaderEl.classList.add('scan-success');
    
    setTimeout(() => {
      const resultTextEl = document.getElementById('qr-reader-result-text');
      
      // --- TRATAMENTO DE LOCALIZAÇÃO (Mantido) ---
      const gavetaRegex = /^([A-Z]\d{1,3})[_-](\d{1,3})[_-](\d+)$/i;
      const match = decodedText.match(gavetaRegex);

      if (match) {
        const [_, colunaElinha, numeracao, nivel] = match;
        const coluna = colunaElinha.substring(0, 1).toUpperCase();
        const linha = colunaElinha.substring(1);
        const infoText = ` Localização lida: **${decodedText}** - **Coluna**: ${coluna} - **Numeração (Linha)**: ${linha} - **Número do Nível**: ${nivel} `;
        
        if (resultTextEl) {
          resultTextEl.innerHTML = infoText.replace(/\n/g, '<br>');
          resultTextEl.style.display = 'block';
        }
        showToast(`Localização de Gaveta lida: ${decodedText}`, 'info');

        setTimeout(() => {
          if (resultTextEl) resultTextEl.style.display = 'none';
          startScanner();
        }, 5000);
      } else {
        // --- TRATAMENTO DE MATERIAL (Ajustado para read-only) ---
        const materials = getMaterials();
        const materialData = materials.find(m => m.id === decodedText);

        if (materialData) {
          showToast(`QR Code lido: ${materialData.denominacao}`, 'success');
          closeModal(scannerModal);
          showMaterialReadOnlyDetails(materialData); // FUNÇÃO READ-ONLY
        } else {
          showToast("Material/Localização não encontrado(a).", "error");
          closeModal(scannerModal);
        }
      }
      qrReaderEl.classList.remove('scan-success');
    }, 400);
  };
  
  if (qrReaderEl) {
    // A biblioteca Html5Qrcode precisa de um ID de elemento
    html5QrCode = new Html5Qrcode("qr-reader");
  }

  scanQrBtn.addEventListener('click', () => {
    openModal(scannerModal);
    startScanner();
  });
  
  // Removidos: PDF extraction logic/functions
  
  // Inicializa a renderização dos códigos QR
  renderQrCodes();
}