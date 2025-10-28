// --- STATE & REFERENCES ---
let LOCAL_MEMORIES = [];
let LAST_HOVERED_MEMORY = null; 
const LOCAL_STORAGE_KEY = 'localDigitalMemories';

// DOM elements references
const memoryList = document.getElementById('memoryList');
const searchFilter = document.getElementById('searchFilter');
const dateFilter = document.getElementById('dateFilter');
const emptyMessage = document.getElementById('emptyMessage');
const addMemoryForm = document.getElementById('addMemoryForm');
const uploadStatus = document.getElementById('uploadStatus');
const uploadButton = document.getElementById('uploadButton');
const newImageFile = document.getElementById('newImageFile');
const editModal = document.getElementById('editModal');
const editMemoryForm = document.getElementById('editMemoryForm');

const canvas = document.getElementById('visualizationCanvas');
const ctx = canvas.getContext('2d');
let canvasWidth, canvasHeight;

// --- LOCAL STORAGE & DATA HANDLING ---

function saveMemoriesToLocal() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(LOCAL_MEMORIES));
    } catch (error) {
        console.error("Error saving to localStorage:", error);
        // Usamos una función para mostrar un mensaje temporal de advertencia
        showTemporaryMessage("Advertencia: No se pueden guardar los datos en el navegador. Revisa la configuración de tu navegador.");
    }
}

function loadMemoriesFromLocal() {
    try {
        const storedMemories = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedMemories) {
            LOCAL_MEMORIES = JSON.parse(storedMemories);
        } else {
            LOCAL_MEMORIES = [];
        }
    } catch (error) {
        console.error("Error loading from localStorage:", error);
        LOCAL_MEMORIES = [];
    }
}

// --- CRUD OPERATIONS (LOCAL) ---

function addMemory(memoryData) {
    // Asigna un ID único, simulando el comportamiento de Firestore
    memoryData.docId = crypto.randomUUID(); 
    LOCAL_MEMORIES.push(memoryData);
    saveMemoriesToLocal();
    renderMemories();
}

function updateMemory(docId, updateData) {
    const index = LOCAL_MEMORIES.findIndex(m => m.docId === docId);
    if (index !== -1) {
        LOCAL_MEMORIES[index] = { ...LOCAL_MEMORIES[index], ...updateData };
        saveMemoriesToLocal();
        renderMemories();
    } else {
        console.error("Memory not found for update:", docId);
    }
}

function deleteMemory(docId) {
    // Usamos un modal de confirmación simple, simulando la funcionalidad
    if (!window.confirm("¿Está seguro de que desea eliminar este recuerdo?")) return;
    
    LOCAL_MEMORIES = LOCAL_MEMORIES.filter(m => m.docId !== docId);
    saveMemoriesToLocal();
    
    // Si la memoria eliminada era la que se mostraba, limpiar el canvas
    if (LAST_HOVERED_MEMORY && LAST_HOVERED_MEMORY.docId === docId) {
        LAST_HOVERED_MEMORY = null;
        drawCanvasDetail(null);
    }

    renderMemories();
}

// --- CANVAS FUNCTIONS (Unchanged logic) ---

function resizeCanvas() {
    const container = canvas.parentElement;
    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    drawCanvasDetail(LAST_HOVERED_MEMORY);
}

function drawCanvasDetail(memory) {
    LAST_HOVERED_MEMORY = memory; 
    
    // 1. Clear Canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Initial State/No Memory
    if (!memory) {
        ctx.fillStyle = '#4b5563';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Pasa el ratón por un recuerdo', canvasWidth / 2, canvasHeight / 2);
        ctx.fillText('para ver su detalle.', canvasWidth / 2, canvasHeight / 2 + 25);
        return;
    }

    // 3. Draw Image
    const img = new Image();
    img.onload = function() {
        const imgW = img.width;
        const imgH = img.height;
        
        // 70% del espacio vertical para la imagen
        const maxAreaHeight = canvasHeight * 0.7; 
        const maxAreaWidth = canvasWidth - 40; 
        
        // Calcular escala
        let scale = Math.min(maxAreaWidth / imgW, maxAreaHeight / imgH);
        if (scale > 1) scale = 1; 
        
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        
        // Posición para centrar y colocar arriba
        const drawX = (canvasWidth - drawW) / 2;
        const drawY = 20;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        let textYStart = drawY + drawH + 30; 
        
        // 4. Draw Date
        ctx.fillStyle = '#d1d5db'; 
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(memory.date, canvasWidth / 2, textYStart);
        textYStart += 35; 

        // 5. Draw separation line
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, textYStart - 15);
        ctx.lineTo(canvasWidth - 30, textYStart - 15);
        ctx.stroke();

        // 6. Draw Comment (wrapped)
        ctx.fillStyle = '#9ca3af'; 
        ctx.font = '14px Inter';
        const text = memory.comment;
        const maxWidth = canvasWidth - 60;
        const lineHeight = 18;
        let x = canvasWidth / 2;
        let y = textYStart;

        wrapText(ctx, text, x, y, maxWidth, lineHeight);
    };
    
    img.onerror = function() {
        ctx.fillStyle = '#f87171';
        ctx.font = '20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('¡Error al cargar la imagen!', canvasWidth / 2, 80);
        
        // Si la imagen falla, dibujar los detalles más abajo
        let textYStart = 120;
        ctx.fillStyle = '#d1d5db'; 
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(memory.date, canvasWidth / 2, textYStart);
        textYStart += 35; 

        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, textYStart - 15);
        ctx.lineTo(canvasWidth - 30, textYStart - 15);
        ctx.stroke();

        ctx.fillStyle = '#9ca3af'; 
        ctx.font = '14px Inter';
        const text = memory.comment;
        const maxWidth = canvasWidth - 60;
        const lineHeight = 18;
        let x = canvasWidth / 2;
        let y = textYStart;

        wrapText(ctx, text, x, y, maxWidth, lineHeight);
    };

    img.src = memory.imageContent;
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}

// --- MODAL CONTROL ---

function showEditModal(memory) {
    // Carga todos los campos
    document.getElementById('editDocId').value = memory.docId;
    document.getElementById('editImageContent').value = memory.imageContent;
    document.getElementById('editDate').value = memory.date;
    document.getElementById('editComment').value = memory.comment;
    editModal.classList.remove('hidden');
}

// Se hace global para que pueda ser llamado desde el HTML (onclick)
window.closeEditModal = function() {
    editModal.classList.add('hidden');
}

// --- UTILITY FOR ALERTS (No native alert/confirm) ---
function showTemporaryMessage(message) {
    const statusDiv = document.getElementById('uploadStatus');
    const originalText = statusDiv.textContent;
    const originalClass = statusDiv.className;

    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');
    statusDiv.classList.remove('text-yellow-400');
    statusDiv.classList.add('text-red-400'); // Use red for warnings/errors

    setTimeout(() => {
        statusDiv.textContent = originalText;
        statusDiv.className = originalClass; 
        if (originalText === '') {
            statusDiv.classList.add('hidden');
        }
    }, 5000);
}

// --- FILTRADO Y RENDERIZADO ---

// Función para normalizar una fecha YYYY-MM-DD a medianoche UTC para comparación
function normalizeDate(dateString) {
    if (!dateString) return null;
    // Crea un nuevo objeto Date usando solo el componente de fecha
    // Esto asegura que la comparación sea solo por día, ignorando la hora local/UTC
    return new Date(dateString + 'T00:00:00Z'); 
}

function renderMemories() {
    const searchText = searchFilter.value.toLowerCase();
    const filterDateString = dateFilter.value; // YYYY-MM-DD
    const filterDate = normalizeDate(filterDateString);


    const filteredMemories = LOCAL_MEMORIES
        .filter(memory => {
            const textMatch = memory.comment.toLowerCase().includes(searchText);
            
            let dateMatch = true;
            if (filterDate) {
                // Normalize la fecha de la memoria antes de comparar
                const memoryDate = normalizeDate(memory.date); 
                // Compara el timestamp (milliseconds)
                dateMatch = memoryDate && memoryDate.getTime() <= filterDate.getTime();
            }
            return textMatch && dateMatch;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha descendente

    memoryList.innerHTML = '';

    // Lógica de mensajes vacíos
    if (filteredMemories.length === 0 && LOCAL_MEMORIES.length > 0) {
        emptyMessage.classList.remove('hidden');
        emptyMessage.textContent = "No se encontraron recuerdos que coincidan con los filtros aplicados.";
    } else if (LOCAL_MEMORIES.length === 0) {
            emptyMessage.classList.remove('hidden');
            emptyMessage.textContent = "Aún no tienes recuerdos. ¡Agrega uno!";
    } else {
        emptyMessage.classList.add('hidden');
    }

    // Renderizar filas de la tabla
    filteredMemories.forEach(memory => {
        const row = document.createElement('tr');
        row.className = 'memory-row hover:bg-gray-700 transition duration-150';

        const isBase64 = memory.imageContent.startsWith('data:');
        const src = memory.imageContent;
        const altText = isBase64 ? 'Imagen incrustada (Base64)' : 'Imagen incrustada';
        
        row.innerHTML = `
            <td class="px-3 py-4">
                <img src="${src}" alt="${altText}" 
                    onerror="this.onerror=null; this.src='https://placehold.co/100x100/1e293b/f8fafc?text=ERROR';"
                    class="h-12 w-12 rounded object-cover border border-teal-500">
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-300">
                ${memory.date}
            </td>
            <td class="px-6 py-4 text-sm text-gray-400 max-w-lg">
                ${memory.comment}
                ${isBase64 ? '<span class="ml-2 px-2 py-0.5 text-xs font-semibold bg-indigo-500 text-white rounded-full">Base64</span>' : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button class="text-indigo-400 hover:text-indigo-300 mr-3" data-action="edit" data-id="${memory.docId}">
                    Editar
                </button>
                <button class="text-red-400 hover:text-red-300" data-action="delete" data-id="${memory.docId}">
                    Eliminar
                </button>
            </td>
        `;

        // Event Listeners for rows and buttons
        row.addEventListener('mouseover', () => { drawCanvasDetail(memory); });
        
        const editButton = row.querySelector('[data-action="edit"]');
        const deleteButton = row.querySelector('[data-action="delete"]');

        editButton.onclick = (e) => {
            e.stopPropagation();
            // Usar .find en la lista local
            const memoryToEdit = LOCAL_MEMORIES.find(m => m.docId === memory.docId);
            if (memoryToEdit) {
                showEditModal(memoryToEdit); 
            }
        };
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteMemory(memory.docId);
        };

        memoryList.appendChild(row);
    });
    
     // Actualizar el canvas si la memoria flotante todavía existe
     if (LAST_HOVERED_MEMORY) {
         const currentMemory = filteredMemories.find(m => m.docId === LAST_HOVERED_MEMORY.docId);
         drawCanvasDetail(currentMemory || null); 
     } else {
         drawCanvasDetail(null);
     }
}

// --- MANEJO DE FECHA Y ARCHIVOS ---

function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}


addMemoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const files = newImageFile.files;
    const baseComment = document.getElementById('newComment').value || "Recuerdo sin comentario";

    if (files.length === 0) {
        uploadStatus.textContent = "Por favor, selecciona al menos un archivo.";
        uploadStatus.classList.remove('hidden');
        return;
    }

    uploadStatus.textContent = `Procesando 0 de ${files.length} archivos...`;
    uploadStatus.classList.remove('hidden');
    uploadButton.disabled = true;

    let successfulUploads = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        await new Promise((resolve) => {
            reader.onload = (event) => {
                const imageContent = event.target.result;
                
                // Fecha del archivo (última modificación)
                const lastModifiedDate = new Date(file.lastModified); 
                const formattedDate = formatDate(lastModifiedDate);
                
                const memoryData = {
                    imageContent: imageContent,
                    date: formattedDate,
                    comment: `${baseComment} (${file.name})`,
                    timestamp: new Date().toISOString()
                };

                addMemory(memoryData); // Llama a la función local
                successfulUploads++;
                uploadStatus.textContent = `Procesando ${successfulUploads} de ${files.length} archivos...`;
                resolve();
            };

            reader.onerror = () => {
                console.error(`Error reading file: ${file.name}`);
                resolve();
            };

            reader.readAsDataURL(file);
        });
    }

    uploadStatus.textContent = `¡Carga completa! Se subieron ${successfulUploads} recuerdos.`;
    newImageFile.value = '';
    document.getElementById('newComment').value = '';
    uploadButton.disabled = false;
});

// --- EVENT HANDLERS GLOBALES ---

searchFilter.addEventListener('input', renderMemories);
dateFilter.addEventListener('change', renderMemories);

editMemoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const docId = document.getElementById('editDocId').value;

    // Recolectar datos del modal (incluyendo el imageContent oculto)
    const updateData = {
        imageContent: document.getElementById('editImageContent').value.trim(),
        date: document.getElementById('editDate').value,
        comment: document.getElementById('editComment').value,
    };
    if (!updateData.imageContent || !updateData.date || !updateData.comment) return;

    updateMemory(docId, updateData);
    window.closeEditModal();
});


// --- INICIALIZACIÓN ---
function initializeLocalApp() {
    loadMemoriesFromLocal(); // Carga datos desde localStorage
    renderMemories();
}

window.onload = function() {
    initializeLocalApp();
    resizeCanvas();
    drawCanvasDetail(null);
};

window.addEventListener('resize', resizeCanvas);