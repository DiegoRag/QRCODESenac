// Dependência PDF.js (para preview de PDF)
import * as pdfjsLib from "https://mozilla.github.io/pdf.js/build/pdf.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://mozilla.github.io/pdf.js/build/pdf.worker.mjs";

// Foca no primeiro input de um container (útil para modais)
const focusFirstInput = (container) => {
  const el = container.querySelector(
    "input, textarea, button, [tabindex]:not([tabindex='-1'])"
  );
  if (el) el.focus();
};

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

function initializeApp() {
  // --- Seletores de Elementos ---
  const showModalBtn = document.getElementById("show-modal-btn");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const createPdfBtn = document.getElementById("create-pdf-btn");
  const pdfFileInput = document.getElementById("pdf-file-input");
  const scanQrBtn = document.getElementById("scan-qr-btn");

  const dataModal = document.getElementById("data-modal");
  const scannerModal = document.getElementById("scanner-modal");
  const pdfExtractionModal = document.getElementById("pdf-extraction-modal");
  const confirmModal = document.getElementById("confirm-modal");

  const closeButtons = document.querySelectorAll(".close-btn");
  const materialForm = document.getElementById("material-form");

  const qrCodeContainerPendente = document.getElementById(
    "qr-code-container-pendente"
  );
  const qrCodeContainerFinalizado = document.getElementById(
    "qr-code-container-finalizado"
  );
  const qrCodeContainerEncerrado = document.getElementById(
    "qr-code-container-encerrado"
  );
  const emptyStatePendente = document.getElementById("empty-state-pendente");
  const emptyStateFinalizado = document.getElementById("empty-state-finalizado");
  const emptyStateEncerrado = document.getElementById("empty-state-encerrado");

  // --- Definição do Layout do Formulário ---
  const formLayout = [
    [
      { id: "fornecedor", label: "Fornecedor", type: "text", required: true },
      {
        id: "cnpj-entregador",
        label: "CNPJ do Entregador",
        type: "text",
        required: false,
      },
    ],
    [
      { id: "denominacao", label: "Denominação", type: "text", required: true },
      { id: "cod-peca", label: "Cód. Peça", type: "text", required: true },
    ],
    [
      { id: "item", label: "Item", type: "text", required: true },
      {
        id: "operador",
        label: "Operador (Recebimento)",
        type: "text",
        required: true,
      },
    ],
    [
      {
        id: "data-rec",
        label: "Data de Emissão",
        type: "date",
        required: true,
      },
      {
        id: "qtd-recebida",
        label: "Qtd Recebida (Nota)",
        type: "number",
        required: true,
      },
    ],
    [
      {
        id: "qtd-recebida-real",
        label: "Qtd. Recebida Real",
        type: "number",
        required: false,
      },
      {
        id: "qtd-amarrados",
        label: "Qtd Amarrados (Auto)",
        type: "number",
        required: false,
      },
    ],
    [
      { id: "corrida", label: "Corrida", type: "text", required: true },
      { id: "lote", label: "Lote", type: "text", required: true },
    ],
    [
      {
        id: "localizacao-ninho",
        label: "Almoxarifado",
        type: "text",
        required: false,
      },
    ],
    [
      {
        id: "descricao-produto",
        label: "Descrição do Produto",
        type: "textarea",
        rows: 3,
        required: false,
      },
    ],
    [
      {
        id: "observacao",
        label: "Observações",
        type: "textarea",
        rows: 3,
        required: false,
      },
    ],
    [
      {
        id: "autorizado-por",
        label: "Material Autorizado Por (Etapa 2)",
        type: "text",
        required: false,
      },
    ],
  ];

  // --- Geração Dinâmica do Formulário (com correção do hidden edit-id) ---
  let formHtml = "";

  formLayout.forEach((row) => {
    formHtml += '<div class="form-row">';
    row.forEach((field) => {
      const isAuthField = field.id === "autorizado-por";
      const isLocalizacao = field.id === "localizacao-ninho";

      formHtml += `<div class="form-group" id="group-${field.id}" style="${
        isAuthField ? "display: none;" : ""
      } ${isLocalizacao ? "position: relative;" : ""}">`;
      formHtml += `<label for="${field.id}">${field.label}</label>`;

      if (field.type === "textarea") {
        formHtml += `<textarea id="${field.id}" rows="${
          field.rows || 3
        }" ${field.required ? "required" : ""}></textarea>`;
      } else {
        formHtml += `<input type="${field.type}" id="${field.id}" ${
          field.required ? "required" : ""
        } ${field.type === "number" ? 'min="1"' : ""} ${
          isLocalizacao ? 'autocomplete="off"' : ""
        } />`;
      }

      if (isLocalizacao) {
        formHtml += '<div id="autocomplete-list"></div>';
      }

      formHtml += "</div>";
    });
    formHtml += "</div>";
  });

  formHtml += `<button type="submit">Salvar Material</button>`;

  // agora preenche o formulário dinamicamente
  materialForm.innerHTML = formHtml;

  // cria o campo hidden *depois* de setar innerHTML (corrigindo o bug)
  const editIdField = document.createElement("input");
  editIdField.type = "hidden";
  editIdField.id = "edit-id";
  materialForm.prepend(editIdField);

  // --- Lógica de Cálculo de Amarrados ---
  const qtdAmarradosInput = document.getElementById("qtd-amarrados");
  if (qtdAmarradosInput) {
    qtdAmarradosInput.readOnly = true;
    qtdAmarradosInput.style.backgroundColor = "#eef2ff";
  }
  const qtdRecebidaInput = document.getElementById("qtd-recebida");
  const qtdRecebidaRealInput = document.getElementById("qtd-recebida-real");

  const calcularAmarrados = () => {
    const pesoBase = 500;
    const qtdRealVal = qtdRecebidaRealInput
      ? parseFloat(qtdRecebidaRealInput.value)
      : 0;
    const qtdNotaVal = qtdRecebidaInput
      ? parseFloat(qtdRecebidaInput.value)
      : 0;
    const valorCalculo = (qtdRealVal || 0) > 0 ? qtdRealVal || 0 : qtdNotaVal || 0;

    if (valorCalculo > 0 && pesoBase > 0 && qtdAmarradosInput) {
      const resultado = valorCalculo / pesoBase;
      qtdAmarradosInput.value = Math.ceil(resultado).toString();
    } else if (qtdAmarradosInput) {
      qtdAmarradosInput.value = "";
    }
  };

  if (qtdRecebidaInput)
    qtdRecebidaInput.addEventListener("input", calcularAmarrados);
  if (qtdRecebidaRealInput)
    qtdRecebidaRealInput.addEventListener("input", calcularAmarrados);

  // --- Sistema de Notificação (Toast) ---
  const showToast = (message, type = "info") => {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icons = {
      success:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      error:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
      info:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    };
    toast.innerHTML = `<div class="toast-icon">${icons[type]}</div><div class="toast-message">${message}</div>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "fadeOut 0.5s forwards";
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  };

  // --- Modal de Confirmação ---
  const showConfirmModal = (
    title,
    text,
    onConfirm,
    confirmText = "Confirmar"
  ) => {
    document.getElementById("confirm-modal-title").textContent = title;
    document.getElementById("confirm-modal-text").textContent = text;
    const yesBtn = document.getElementById("confirm-btn-yes");
    yesBtn.textContent = confirmText;

    yesBtn.style.backgroundColor = "var(--danger-color)";
    yesBtn.style.borderColor = "var(--danger-color)";
    if (confirmText.toLowerCase().includes("mover")) {
      yesBtn.style.backgroundColor = "var(--primary-color)";
      yesBtn.style.borderColor = "var(--primary-color)";
    }

    openModal(confirmModal);

    const noBtn = document.getElementById("confirm-btn-no");

    const confirmHandler = () => {
      try {
        onConfirm();
      } catch (e) {
        console.error(e);
      }
      closeModal(confirmModal);
    };
    const cancelHandler = () => {
      closeModal(confirmModal);
    };

    yesBtn.addEventListener("click", confirmHandler, { once: true });
    noBtn.addEventListener("click", cancelHandler, { once: true });
  };

  // --- Armazenamento Local (Storage) ---
  const getMaterials = () => JSON.parse(localStorage.getItem("materials")) || [];
  const saveMaterials = (materials) =>
    localStorage.setItem("materials", JSON.stringify(materials));

  // --- Renderização dos Itens (QR Codes) ---
  function createQrItem(material, index) {
    const qrItem = document.createElement("div");
    qrItem.className = "qr-item";
    qrItem.dataset.id = material.id;
    qrItem.style.animationDelay = `${index * 50}ms`;

    const statusDot = document.createElement("div");
    let statusClass = "status-pendente";
    if (material.status === "finalizado") statusClass = "status-finalizado";
    if (material.status === "encerrado") statusClass = "status-encerrado";
    statusDot.className = `status-dot ${statusClass}`;
    qrItem.appendChild(statusDot);

    const qrCodeImgDiv = document.createElement("div");
    qrCodeImgDiv.className = "qr-code-img";

    const denomination = document.createElement("p");
    denomination.textContent = material.denominacao;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.className = "action-btn edit-btn";
    editBtn.title = "Editar/Autorizar";
    editBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      editMaterial(material);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "action-btn delete-btn";
    deleteBtn.title =
      material.status === "finalizado" ? "Encerrar" : "Excluir";
    deleteBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteMaterial(material.id, material.denominacao);
    };

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    qrItem.appendChild(actionsDiv);
    qrItem.appendChild(qrCodeImgDiv);
    qrItem.appendChild(denomination);

    if (material.status === "encerrado") {
      qrItem.classList.add("encerrado");
    }

    qrItem.addEventListener("click", () => showMaterialDetails(material));

    new QRCode(qrCodeImgDiv, {
      text: material.id,
      width: 150,
      height: 150,
      colorDark: "#1e293b",
      colorLight: "#ffffff",
    });

    return qrItem;
  }

  const renderQrCodes = () => {
    const materials = getMaterials();

    const pendentes = materials.filter(
      (m) => m.status === "pendente" || !m.status
    );
    const finalizados = materials.filter((m) => m.status === "finalizado");
    const encerrados = materials.filter((m) => m.status === "encerrado");

    qrCodeContainerPendente.innerHTML = "";
    qrCodeContainerFinalizado.innerHTML = "";
    qrCodeContainerEncerrado.innerHTML = "";

    if (pendentes.length === 0) {
      qrCodeContainerPendente.style.display = "none";
      emptyStatePendente.style.display = "block";
    } else {
      qrCodeContainerPendente.style.display = "grid";
      emptyStatePendente.style.display = "none";
      pendentes.forEach((material, index) => {
        qrCodeContainerPendente.appendChild(createQrItem(material, index));
      });
    }

    if (finalizados.length === 0) {
      qrCodeContainerFinalizado.style.display = "none";
      emptyStateFinalizado.style.display = "block";
    } else {
      qrCodeContainerFinalizado.style.display = "grid";
      emptyStateFinalizado.style.display = "none";
      finalizados.forEach((material, index) => {
        qrCodeContainerFinalizado.appendChild(createQrItem(material, index));
      });
    }

    if (encerrados.length === 0) {
      qrCodeContainerEncerrado.style.display = "none";
      emptyStateEncerrado.style.display = "block";
    } else {
      qrCodeContainerEncerrado.style.display = "grid";
      emptyStateEncerrado.style.display = "none";
      encerrados.forEach((material, index) => {
        qrCodeContainerEncerrado.appendChild(createQrItem(material, index));
      });
    }
  };

  // --- Gerenciamento de Modais ---
  const openModal = (modal) => {
    modal.style.display = "block";
    focusFirstInput(modal);
    const resultTextEl = document.getElementById("qr-reader-result-text");
    if (resultTextEl) resultTextEl.style.display = "none";
  };

  const closeModal = (modal) => {
    modal.style.display = "none";
    if (modal.id === "scanner-modal") stopScanner();
    if (modal.id === "data-modal") hideSuggestions();
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const open = [...document.querySelectorAll(".modal")].find(
        (m) => m.style.display === "block"
      );
      if (open) closeModal(open);
    }
  });

  // --- Navegação por Abas (Tabs) ---
  const pageTitle = document.getElementById("page-title");
  const activeContainer = document.getElementById("active-materials-container");
  const archivedContainer = document.getElementById(
    "archived-materials-container"
  );
  const actionGroup = document.querySelector(".action-group");
  const navItems = document.querySelectorAll(".nav-item");

  function switchTab(tabName) {
    navItems.forEach((item) => item.classList.remove("active"));

    if (tabName === "materiais") {
      document
        .querySelector('.nav-item[data-nav="materiais"]')
        .classList.add("active");
      pageTitle.textContent = "Materiais";
      activeContainer.style.display = "block";
      archivedContainer.style.display = "none";
      actionGroup.style.display = "block";
    } else if (tabName === "encerrados") {
      document
        .querySelector('.nav-item[data-nav="encerrados"]')
        .classList.add("active");
      pageTitle.textContent = "Materiais Encerrados";
      activeContainer.style.display = "none";
      archivedContainer.style.display = "block";
      actionGroup.style.display = "none";
    }
  }

  document
    .querySelector('.nav-item[data-nav="materiais"]')
    .addEventListener("click", (e) => {
      e.preventDefault();
      switchTab("materiais");
    });

  document
    .querySelector('.nav-item[data-nav="encerrados"]')
    .addEventListener("click", (e) => {
      e.preventDefault();
      switchTab("encerrados");
    });

  // --- Event Listeners dos Botões Principais ---
  showModalBtn.addEventListener("click", () => {
    materialForm.reset();
    document.getElementById("edit-id").value = "";
    document
      .querySelectorAll("#material-form input, #material-form textarea")
      .forEach((el) => {
        el.className = "";
        el.readOnly = false;
      });

    const authGroup = document.getElementById("group-autorizado-por");
    if (authGroup) authGroup.style.display = "none";

    document.getElementById("data-modal-title").textContent =
      "Etapa 1: Criar Material";

    const saveBtn = document.querySelector(
      '#material-form button[type="submit"]'
    );
    if (saveBtn) saveBtn.style.display = "block";

    const qtdAmarradosInput = document.getElementById("qtd-amarrados");
    if (qtdAmarradosInput) {
      qtdAmarradosInput.readOnly = true;
      qtdAmarradosInput.style.backgroundColor = "#eef2ff";
    }

    openModal(dataModal);
  });

  scanQrBtn.addEventListener("click", async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("getUserMedia não suportado");
      await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      openModal(scannerModal);
      startScanner();
    } catch (err) {
      console.error("Permissão/Dispositivo de câmera indisponível:", err);
      showToast("Câmera não encontrada ou permissão negada.", "error");
    }
  });

  closeButtons.forEach((btn) =>
    btn.addEventListener("click", (e) =>
      closeModal(e.target.closest(".modal"))
    )
  );
  window.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) closeModal(event.target);
  });

  // --- Lógica de Salvar/Atualizar Formulário ---
  materialForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const existingId = document.getElementById("edit-id").value;

    const formData = {};
    formLayout.flat().forEach((f) => {
      const key = f.id.replace(/-(\w)/g, (_, p1) => p1.toUpperCase());
      const element = document.getElementById(f.id);
      if (element) {
        formData[key] = element.value.trim();
      }
    });

    const requiredIds = formLayout
      .flat()
      .filter((f) => f.required)
      .map((f) => f.id);

    let invalid = false;
    requiredIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.value.trim() && el.id !== "autorizado-por") {
        el.classList.add("invalid");
        invalid = true;
      } else if (el) {
        el.classList.remove("invalid");
      }
    });

    const autorizadoPor = formData.autorizadoPor || "";
    const almoxarifadoInput = document.getElementById("localizacao-ninho");

    // Validação da Localização do Almoxarifado
    if (almoxarifadoInput && almoxarifadoInput.value.trim() !== "") {
      const { isValid, formatted } = parseAndValidateLocation(
        almoxarifadoInput.value
      );
      if (!isValid) {
        showToast('O "Almoxarifado" não é uma localização válida.', "error");
        almoxarifadoInput.classList.add("invalid");
        invalid = true;
      } else {
        formData.localizacaoNinho = formatted;
        almoxarifadoInput.classList.remove("invalid");
      }
    }

    // Requer Almoxarifado se estiver autorizando
    if (
      autorizadoPor.trim() !== "" &&
      almoxarifadoInput &&
      !almoxarifadoInput.value.trim()
    ) {
      showToast(
        'O campo "Almoxarifado" é obrigatório para autorizar (Etapa 2).',
        "error"
      );
      almoxarifadoInput.classList.add("invalid");
      invalid = true;
    }

    if (invalid) {
      if (almoxarifadoInput && !almoxarifadoInput.classList.contains("invalid")) {
        showToast("Preencha os campos obrigatórios.", "error");
      } else if (!almoxarifadoInput) {
        showToast("Preencha os campos obrigatórios.", "error");
      }
      return;
    }

    const materials = getMaterials();

    if (existingId) {
      const index = materials.findIndex((m) => m.id === existingId);
      if (index !== -1) {
        const materialOriginal = materials[index];
        materials[index] = { ...materialOriginal, ...formData };

        if (
          (materialOriginal.status === "pendente" ||
            !materialOriginal.status) &&
          autorizadoPor.trim() !== ""
        ) {
          materials[index].status = "finalizado";
          materials[index].autorizadoPor = autorizadoPor;
          showToast("Material autorizado e finalizado!", "success");
        } else {
          showToast("Material atualizado com sucesso!", "success");
        }
      }
    } else {
      formData.id = `mat_${Date.now()}`;
      formData.status = "pendente";
      formData.autorizadoPor = "";
      materials.push(formData);
      showToast("Material criado e pendente de revisão.", "success");
    }

    saveMaterials(materials);
    renderQrCodes();
    closeModal(dataModal);
    materialForm.reset();
  });

  // --- Funções CRUD de Material (Editar, Excluir, Ver Detalhes) ---
  const showMaterialDetails = (material) => {
    if (!material) return;

    materialForm.reset();
    document
      .querySelectorAll("#material-form input, #material-form textarea")
      .forEach((el) => (el.className = ""));
    document.getElementById("edit-id").value = material.id;

    formLayout.flat().forEach((field) => {
      const el = document.getElementById(field.id);
      const key = field.id.replace(/-(\w)/g, (_, p1) => p1.toUpperCase());
      if (el && material[key] !== undefined && material[key] !== null) {
        el.value = material[key];
      }
    });

    const authGroup = document.getElementById("group-autorizado-por");
    const authInput = document.getElementById("autorizado-por");
    const modalTitle = document.getElementById("data-modal-title");
    const saveBtn = document.querySelector(
      '#material-form button[type="submit"]'
    );

    formLayout.flat().forEach((field) => {
      const el = document.getElementById(field.id);
      if (el) el.readOnly = false;
    });

    if (saveBtn) saveBtn.style.display = "block";
    if (authGroup) authGroup.style.display = "block";

    if (material.status === "encerrado") {
      modalTitle.textContent = "Detalhes do Material Encerrado";
      if (saveBtn) saveBtn.style.display = "none";
      formLayout.flat().forEach((field) => {
        const el = document.getElementById(field.id);
        if (el) el.readOnly = true;
      });
    } else if (material.status === "finalizado") {
      modalTitle.textContent = "Detalhes do Material Finalizado";
      if (authInput) authInput.readOnly = true;
    } else {
      modalTitle.textContent = "Etapa 2: Autorizar Material";
      if (authInput) authInput.readOnly = false;
    }

    const qtdAmarradosInput = document.getElementById("qtd-amarrados");
    if (qtdAmarradosInput) {
      qtdAmarradosInput.readOnly = true;
      qtdAmarradosInput.style.backgroundColor = "#eef2ff";
    }

    calcularAmarrados();
    openModal(dataModal);
  };

  const editMaterial = (material) => {
    showMaterialDetails(material);
  };

  const deleteMaterial = (id, name) => {
    let materials = getMaterials();
    const material = materials.find((m) => m.id === id);
    if (!material) return;

    if (material.status === "finalizado") {
      showConfirmModal(
        "Encerrar Material",
        `Tem certeza que deseja mover "${name}" para os encerrados?`,
        () => {
          const index = materials.findIndex((m) => m.id === id);
          if (index !== -1) {
            materials[index].status = "encerrado";
            saveMaterials(materials);
            renderQrCodes();
            showToast("Material movido para encerrados.", "info");
          }
        },
        "Mover para Encerrados"
      );
    } else {
      const title =
        material.status === "encerrado"
          ? "Excluir Permanentemente"
          : "Excluir Material";
      const text = `Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`;

      showConfirmModal(
        title,
        text,
        () => {
          materials = materials.filter((m) => m.id !== id);
          saveMaterials(materials);
          renderQrCodes();
          showToast("Material excluído com sucesso.", "success");
        },
        "Excluir"
      );
    }
  };

  // --- Lógica do Scanner (Html5Qrcode) ---
  const html5QrCode = new Html5Qrcode("qr-reader");
  let isScannerRunning = false;
  const resultTextEl = document.getElementById("qr-reader-result-text");

  const stopScanner = async () => {
    if (!isScannerRunning) return;
    isScannerRunning = false;

    // 2 = RUNNING
    if (html5QrCode.getState() === 2) {
      try {
        await html5QrCode.stop();
      } catch (err) {
        console.warn(
          "Aviso (ignorado): Tentativa de parar scanner que já estava parado.",
          err.message
        );
      }
    }
  };

  const startScanner = () => {
    if (isScannerRunning) return;

    const config = { fps: 15, qrbox: { width: 280, height: 280 } };
    isScannerRunning = true;
    if (resultTextEl) resultTextEl.style.display = "none";

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          const qrReaderEl = document.getElementById("qr-reader");
          await stopScanner();
          qrReaderEl.classList.add("scan-success");

          try {
            const upperDecodedText = decodedText.toUpperCase();
            const { formatted, isValid } =
              parseAndValidateLocation(upperDecodedText);

            if (isValid) {
              const materials = getMaterials();
              const materialEncontrado = materials.find(
                (m) =>
                  m.localizacaoNinho === formatted &&
                  (m.status === "pendente" || m.status === "finalizado")
              );

              if (materialEncontrado) {
                closeModal(scannerModal);
                showMaterialDetails(materialEncontrado);
              } else {
                const infoText = `
Localização: <strong>${formatted}</strong><br><br>
<span style="color: var(--success-color); font-weight: 600; font-size: 1.1rem;">Espaço Livre</span><br>
<small>Nenhum material ativo cadastrado neste local.</small>
`;
                if (resultTextEl) {
                  resultTextEl.innerHTML = infoText;
                  resultTextEl.style.display = "block";
                }
                showToast(`Localização ${formatted} está livre.`, "success");

                setTimeout(() => {
                  if (resultTextEl) resultTextEl.style.display = "none";
                  startScanner();
                }, 5000);
              }
            } else {
              const materials = getMaterials();
              const materialData = materials.find((m) => m.id === decodedText);

              if (materialData) {
                showToast(
                  `QR Code lido: ${materialData.denominacao}`,
                  "success"
                );
                closeModal(scannerModal);
                showMaterialDetails(materialData);
              } else {
                showToast(
                  "QR Code inválido. Material ou Localização não encontrado(a).",
                  "error"
                );
                if (resultTextEl) {
                  resultTextEl.innerHTML = `<span style="color: var(--danger-color);">QR Code inválido</span><br><small>${decodedText}</small>`;
                  resultTextEl.style.display = "block";
                }
                setTimeout(() => {
                  if (resultTextEl) resultTextEl.style.display = "none";
                  startScanner();
                }, 3000);
              }
            }
          } catch (err) {
            console.error("Erro ao processar o QR Code lido:", err);
            showToast("Erro ao processar o QR Code.", "error");
            closeModal(scannerModal);
          }

          setTimeout(() => {
            qrReaderEl.classList.remove("scan-success");
          }, 400);
        }
      )
      .catch((err) => {
        console.error("Não foi possível iniciar o scanner.", err);
        showToast("Câmera não encontrada ou permissão negada.", "error");
        isScannerRunning = false;
        closeModal(scannerModal);
      });
  };

  // --- Lógica de Validação e Autocomplete do Almoxarifado ---
  const locationInput = document.getElementById("localizacao-ninho");
  const suggestionBox = document.getElementById("autocomplete-list");

  const validLocations = new Set();
  const allLocationsList = [];

  function generateLocationList() {
    const colunas = "ABCDEFGHIJKLMNOPQRST".split(""); // 20 colunas
    const secoes = [1, 2]; // 2 seções (100, 200)

    colunas.forEach((col) => {
      secoes.forEach((sec) => {
        for (let gaveta = 1; gaveta <= 40; gaveta++) {
          const numId = sec * 100 + gaveta; // ex: 101, 102...

          for (let nivel = 1; nivel <= 5; nivel++) {
            const location = `${col}${sec}-${numId}/${nivel}`;
            validLocations.add(location);
            allLocationsList.push(location);
          }
        }
      });
    });
  }

  function parseAndValidateLocation(input) {
    let formatted = input.toUpperCase().trim();

    const regexJunto = /^([A-T])(1|2)(\d{3})(\d)$/;
    if (regexJunto.test(formatted)) {
      formatted = formatted.replace(regexJunto, "$1$2-$3/$4");
    }

    const regexSemTraco = /^([A-T])(1|2)(\d{3})\/(\d)$/;
    if (regexSemTraco.test(formatted)) {
      formatted = formatted.replace(regexSemTraco, "$1$2-$3/$4");
    }

    const isValid = validLocations.has(formatted);
    return { formatted, isValid };
  }

  function showSuggestions(filter = "") {
    if (!suggestionBox) return;

    suggestionBox.innerHTML = "";
    const upperFilter = filter.toUpperCase();

    let suggestions = [];
    if (filter === "") {
      suggestions = allLocationsList.slice(0, 50);
    } else {
      suggestions = allLocationsList
        .filter((loc) => loc.startsWith(upperFilter))
        .slice(0, 50);
    }

    if (suggestions.length === 0) {
      hideSuggestions();
      return;
    }

    suggestions.forEach((loc) => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.innerHTML = loc.replace(
        upperFilter,
        `<strong>${upperFilter}</strong>`
      );

      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (locationInput) {
          locationInput.value = loc;
          hideSuggestions();
          locationInput.dispatchEvent(new Event("blur"));
        }
      });

      suggestionBox.appendChild(item);
    });

    suggestionBox.style.display = "block";
  }

  function hideSuggestions() {
    if (suggestionBox) suggestionBox.style.display = "none";
  }

  if (locationInput) {
    locationInput.addEventListener("focus", () => {
      showSuggestions(locationInput.value);
    });

    locationInput.addEventListener("input", () => {
      showSuggestions(locationInput.value);
    });

    locationInput.addEventListener("blur", () => {
      setTimeout(hideSuggestions, 150);

      const value = locationInput.value;
      if (value.trim() === "") {
        locationInput.classList.remove("invalid");
        return;
      }

      const { formatted, isValid } = parseAndValidateLocation(value);

      if (isValid) {
        locationInput.value = formatted;
        locationInput.classList.remove("invalid");
      } else {
        locationInput.classList.add("invalid");
      }
    });
  }

  // --- Exportação para CSV ---
  exportCsvBtn.addEventListener("click", () => {
    const materials = getMaterials();
    if (materials.length === 0) {
      showToast("Nenhum material para exportar.", "info");
      return;
    }

    const headers = formLayout.flat().map((field) => field.label);
    headers.push("Status");

    let csvContent = headers.join(",") + "\r\n";

    materials.forEach((material) => {
      const row = formLayout.flat().map((field) => {
        const key = field.id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
        let value = material[key] ?? "";
        value = String(value)
          .replace(/"/g, '""')
          .replace(/\r?\n/g, " ");
        if (value.includes(",")) value = `"${value}"`;
        return value;
      });
      row.push(material.status || "pendente");
      csvContent += row.join(",") + "\r\n";
    });

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "materiais_exportados.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Exportação concluída!", "success");
    }
  });

  // --- Extração de PDF/Imagem ---
  createPdfBtn.addEventListener("click", () => pdfFileInput.click());

  pdfFileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    openModal(pdfExtractionModal);
    showModalBtn.click(); // abre o modal do formulário por baixo

    const statusEl = document.getElementById("pdf-processing-status");
    const canvas = document.getElementById("pdf-preview-canvas");

    if (statusEl && statusEl.parentElement) {
      statusEl.parentElement.style.display = "block";
    }
    if (canvas) canvas.style.display = "none";

    statusEl.textContent = "Renderizando pré-visualização...";
    try {
      await renderPreview(file);
      if (canvas) canvas.style.display = "block";
    } catch (e) {
      console.error("Falha ao renderizar preview:", e);
      showToast("Falha ao renderizar pré-visualização.", "error");
      closeModal(pdfExtractionModal);
      closeModal(dataModal);
      pdfFileInput.value = "";
      return;
    }

    statusEl.textContent = "Extraindo dados com IA...";
    try {
      const extractedData = await extractDataWithGemini(file, statusEl);
      populateFormWithSuggestions(extractedData);
      closeModal(pdfExtractionModal);
      showToast("Extração de dados concluída!", "success");
    } catch (error) {
      console.error("Falha na extração:", error);
      showToast(error.message || "Falha na extração dos dados.", "error");
      closeModal(pdfExtractionModal);
      closeModal(dataModal);
    } finally {
      pdfFileInput.value = "";
    }
  });

  async function renderPreview(file) {
    const canvas = document.getElementById("pdf-preview-canvas");
    const ctx = canvas.getContext("2d");

    if (file.type.startsWith("image/")) {
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
        img.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(e);
        };
        img.src = url;
      });
      return;
    }

    if (file.type !== "application/pdf") {
      throw new Error("Arquivo não é PDF nem imagem suportada.");
    }

    const fileReader = new FileReader();
    await new Promise((resolve, reject) => {
      fileReader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });

          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: ctx, viewport }).promise;
          resolve();
        } catch (e) {
          reject(e);
        }
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
          const base64String = String(reader.result).split(",")[1];
          resolve(base64String);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  }

  async function extractDataWithGemini(file, statusEl) {
    statusEl.textContent = "Preparando documento para análise...";
    const base64Data = await fileToBase64(file);

    // ⚠ Atenção: em produção, nunca expor chave no frontend
    const apiKey = "AIzaSyAUUVIiAus6e0xmK_eAF-tnuFqZsn250BU";
    const model = "gemini-2.5-flash-preview-09-2025";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Analise este documento fiscal (DANFE) com precisão conceitual. Ignore anotações manuscritas. O objetivo é extrair os dados de um material recebido. Se um campo não for encontrado, use null.

- **fornecedor**: A Razão Social do EMITENTE da nota fiscal.
- **cnpjEntregador**: O CNPJ do EMITENTE da nota fiscal.
- **denominacao**: A descrição do primeiro produto ou material listado na tabela de produtos.
- **codPeca**: O código do primeiro produto listado na tabela de produtos.
- **item**: O número total de volumes físicos ou pacotes (ex: 'Amarrados', 'Caixas', 'Toneladas') listados na seção de transporte.
- **operador**: Use null. Este campo é para preenchimento manual do usuário.
- **dataRec**: A "Data de Emissão" principal da nota fiscal. (Formato AAAA-MM-DD).
- **qtdRecebida**: O "Peso Líquido" total da nota. Se não houver Peso Líquido, use a Quantidade (QTD) total da tabela de produtos.
- **qtdRecebidaReal**: Use null. Este campo é para preenchimento manual do usuário.
- **corrida**: Um número de "Corrida" ou "CHM" (Composição Química), se existir na descrição do produto.
- **lote**: O "Pedido do Cliente" ou "Número do Lote", geralmente encontrado nos dados adicionais ou na descrição do produto.
- **localizacaoNinho**: Use null. Este campo é para preenchimento manual.
- **descricaoProduto**: A descrição completa do primeiro item na tabela de produtos, incluindo especificações.
- **observacao**: Use null. Este campo é para preenchimento manual do usuário.

Seja rigoroso e priorize os valores digitados, não os títulos exatos das seções.`;

    const schema = {
      type: "OBJECT",
      properties: {
        fornecedor: {
          type: "STRING",
          description: "Razão Social do EMITENTE da NF-e",
        },
        cnpjEntregador: {
          type: "STRING",
          description: "CNPJ do EMITENTE da NF-e",
        },
        denominacao: {
          type: "STRING",
          description: "Descrição principal do primeiro produto",
        },
        codPeca: {
          type: "STRING",
          description: "Código do primeiro produto",
        },
        item: {
          type: "STRING",
          description:
            "Número de volumes/pacotes da seção de transporte",
        },
        operador: {
          type: "STRING",
          description: "Sempre null, preenchido pelo usuário",
        },
        dataRec: {
          type: "STRING",
          description: "Data de Emissão (AAAA-MM-DD)",
        },
        qtdRecebida: {
          type: "NUMBER",
          description: "Peso Líquido Total da nota",
        },
        qtdRecebidaReal: {
          type: "NUMBER",
          description: "Sempre null, preenchido pelo usuário",
        },
        corrida: {
          type: "STRING",
          description: "Número da Corrida ou CHM (se houver)",
        },
        lote: {
          type: "STRING",
          description:
            "Número do Pedido do Cliente ou Lote",
        },
        localizacaoNinho: {
          type: "STRING",
          description: "Sempre null, preenchido pelo usuário",
        },
        descricaoProduto: {
          type: "STRING",
          description: "Descrição detalhada do primeiro produto",
        },
        observacao: {
          type: "STRING",
          description: "Sempre null, preenchido pelo usuário",
        },
      },
    };

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: file.type, data: base64Data } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    };

    statusEl.textContent = "Consultando IA do Gemini...";
    let response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      console.error("Erro de rede ao chamar IA:", networkErr);
      throw new Error("Falha de rede/CORS ao comunicar com a IA.");
    }

    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch {}
      console.error("API Error:", errorBody);

      if (errorBody?.error?.message?.includes("API key not valid")) {
        throw new Error("Erro de API: A chave não é válida. Verifique as credenciais.");
      }

      throw new Error("Erro na resposta da IA.");
    }

    statusEl.textContent = "Processando resposta da IA...";
    const result = await response.json();

    const candidate = result?.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (!part) {
      console.error("Resposta inválida da IA:", result);
      if (candidate?.finishReason === "SAFETY") {
        throw new Error("A IA bloqueou a resposta por motivos de segurança.");
      }
      throw new Error("A IA não retornou dados extraídos.");
    }

    if (part.text) {
      try {
        return JSON.parse(part.text);
      } catch (e) {
        console.error("Erro ao parsear JSON:", e, "Texto bruto:", part.text);
        throw new Error("A IA retornou texto não parseável como JSON.");
      }
    }

    console.error("Formato inesperado:", part);
    throw new Error("Formato de resposta inesperado da IA.");
  }

  function populateFormWithSuggestions(suggestions) {
    Object.keys(suggestions).forEach((key) => {
      const camelCaseKey = key;
      const kebabKey = camelCaseKey.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
      );
      const el = document.getElementById(kebabKey);

      if (el && suggestions[key] !== null && suggestions[key] !== undefined) {
        el.value = suggestions[key];
      }
    });

    calcularAmarrados();

    document.querySelectorAll("[required]").forEach((el) => {
      if (el.id === "autorizado-por" || el.id === "localizacao-ninho") return;

      if (!el.value.trim()) el.classList.add("invalid");
      else el.classList.remove("invalid");
    });
  }

  // --- Inicialização da Aplicação ---
  generateLocationList();
  renderQrCodes();
  switchTab("materiais");
}
