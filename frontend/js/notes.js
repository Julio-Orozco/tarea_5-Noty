// ==========================================
// NOTES INTERFACE SECTION
// This file controls the dashboard, editor,
// CRUD actions and PDF export for Noty.
// ==========================================

const notesList = document.querySelector("#notesList");
const noteTitle = document.querySelector("#noteTitle");
const noteEditor = document.querySelector("#noteEditor");
const messageElement = document.querySelector("#message");
const newNoteButton = document.querySelector("#newNoteButton");
const saveNoteButton = document.querySelector("#saveNoteButton");
const deleteNoteButton = document.querySelector("#deleteNoteButton");
const exportPdfButton = document.querySelector("#exportPdfButton");
const logoutButton = document.querySelector("#logoutButton");
const toolbar = document.querySelector(".toolbar");

let notes = [];
let selectedNoteId = null;

function showModal(message) {
  const modal = document.getElementById('customModal');
  if (modal) {
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.textContent = message;
    modal.style.display = 'flex';
  } else {
    alert(message); // fallback si no existe el modal
  }
}

window.NotyNotes = {
  saveNote: () => saveNote(),
  deleteNote: () => deleteNote(),
  exportNoteToPdf: () => exportNoteToPdf()
};

function showMessage(text, type = "info") {
  messageElement.textContent = text;
  messageElement.className = `message ${type}`;
}

// ==========================================
// FUNCIÓN SHOW MODAL (usa la función global)
// ==========================================
function showModal(message) {
  if (typeof window.showModal === 'function') {
    window.showModal(message);
  } else {
    // Fallback: si el modal no está disponible, usa alert
    alert(message);
  }
}

function protectDashboard() {
  if (!getToken()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function setEditor(note) {
  selectedNoteId = note ? note.id : null;
  noteTitle.value = note ? note.title : "";
  // Si hay nota, mostrar su contenido. Si no, dejar VACÍO.
  if (note) {
    noteEditor.innerHTML = note.content;
  } else {
    noteEditor.innerHTML = "";
  }
  
  renderNotesList();

}

function renderNotesList() {
  notesList.innerHTML = "";

  if (notes.length === 0) {
    notesList.innerHTML = '<p class="empty-state">No hay notas todavia.</p>';
    return;
  }

  notes.forEach((note) => {
    const button = document.createElement("button");
    button.className = note.id === selectedNoteId ? "note-item active" : "note-item";
    button.type = "button";

    const title = document.createElement("strong");
    title.textContent = note.title;

    const date = document.createElement("span");
    date.textContent = new Date(note.updated_at).toLocaleString();

    button.append(title, date);
    button.addEventListener("click", () => setEditor(note));
    notesList.appendChild(button);
  });
}

async function loadNotes() {
  try {
    notes = await apiRequest("/notes");
    setEditor(notes[0] || null);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

// ==========================================
// FUNCIÓN SAVE NOTE CON VALIDACIÓN Y MODAL
// ==========================================
async function saveNote() {
  // Obtener el texto REAL sin HTML
  const title = noteTitle.value.trim();
  const editorContent = noteEditor.innerHTML.trim();
  
  // Crear un elemento temporal para extraer solo el texto
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = editorContent;
  const contentText = tempDiv.textContent.trim();

  // Caso 1: Sin título Y sin contenido real
  if (title === '' && contentText === '') {
    showModal("El título y el contenido son obligatorios.");
    return;
  }

  // Caso 2: Sin título, pero con contenido
  if (title === '' && contentText !== '') {
    showModal("Debes agregar un título a la nota.");
    return;
  }

  // Caso 3: Con título, pero sin contenido
  if (title !== '' && contentText === '') {
    showModal("Debes agregar contenido a la nota.");
    return;
  }

  // Si llegamos aquí, tiene título Y contenido real
  showMessage("Guardando nota...");

  try {
    if (selectedNoteId) {
      await apiRequest(`/notes/${selectedNoteId}`, {
        method: "PUT",
        body: JSON.stringify({ title, content: editorContent })
      });
      showMessage("Nota actualizada correctamente.", "success");
    } else {
      const data = await apiRequest("/notes", {
        method: "POST",
        body: JSON.stringify({ title, content: editorContent })
      });
      selectedNoteId = data.note.id;
      showMessage("Nota creada correctamente.", "success");
    }

    await loadNotes();
  } catch (error) {
    showMessage(error.message, "error");
  }
}



function applyFormat(command, value = null) {
  document.execCommand(command, false, value);
  noteEditor.focus();
}

// ==========================================
// PDF EXPORT SECTION
// ==========================================

function exportNoteToPdf() {
  if (!noteTitle.value.trim()) {
    showModal("Escribe un título antes de exportar.");
    return;
  }

  const pdfContent = document.createElement("article");
  pdfContent.className = "pdf-note";

  const title = document.createElement("h1");
  title.textContent = noteTitle.value;

  const content = document.createElement("div");
  content.innerHTML = noteEditor.innerHTML;

  pdfContent.append(title, content);

  if (typeof html2pdf !== "function") {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      showModal("El navegador bloqueó la ventana de impresión.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${noteTitle.value}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 32px; }
        </style>
      </head>
      <body>${pdfContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    showMessage("Usa Guardar como PDF en la ventana de impresión.", "success");
    return;
  }

  html2pdf()
    .set({
      margin: 12,
      filename: `${noteTitle.value.trim() || "noty-note"}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .from(pdfContent)
    .save()
    .then(() => showMessage("PDF exportado correctamente.", "success"))
    .catch(() => showMessage("No se pudo exportar el PDF.", "error"));
}

toolbar.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  applyFormat(button.dataset.command, button.dataset.value || null);
});

newNoteButton.addEventListener("click", () => setEditor(null));

logoutButton.addEventListener("click", () => {
  removeToken();
  window.location.href = "login.html";
});

if (protectDashboard()) {
  showMessage("Editor listo.", "success");
  loadNotes();
}
