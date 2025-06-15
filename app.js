// Sistema de autenticação simples
                const users = {
                    'joyce': 'pedal2024',
                    'admin': 'admin123'
                };

                let currentUser = null;
                let cards = [];
                let editingCardId = null;

                // --- Configuração do localForage para IndexedDB ---
                localforage.config({
                    name: 'BikePlannerDB', // Nome do banco de dados IndexedDB
                    storeName: 'pedalCardsStore', // Nome do object store (equivalente a uma tabela)
                    description: 'Armazenamento de pedais para o planejador'
                });

                // Função para migrar dados do localStorage para IndexedDB
                async function migrateLocalStorage() {
                    const migrationFlag = localStorage.getItem('migratedToIndexedDB');
                    if (migrationFlag === 'true') {
                        console.log('Migração do localStorage para IndexedDB já foi realizada.');
                        return;
                    }

                    console.log('Iniciando migração de dados do localStorage para IndexedDB...');
                    const savedCards = localStorage.getItem('pedalCards');
                    if (savedCards) {
                        try {
                            const parsedCards = JSON.parse(savedCards);
                            for (const card of parsedCards) {
                                // Usa o ID do card como chave no IndexedDB para facilitar a busca e atualização
                                await localforage.setItem(card.id, card);
                            }
                            console.log('Dados do localStorage migrados com sucesso para IndexedDB.');
                            localStorage.setItem('migratedToIndexedDB', 'true'); // Marca a migração como concluída
                            localStorage.removeItem('pedalCards'); // Opcional: Limpar o localStorage após migração
                        } catch (e) {
                            console.error('Erro ao migrar dados do localStorage:', e);
                        }
                    } else {
                        console.log('Nenhum dado encontrado no localStorage para migrar.');
                    }
                }

                // Carrega dados salvos do IndexedDB
                async function loadData() {
                    try {
                        cards = [];
                        // Itera sobre todos os itens no object store e adiciona ao array 'cards'
                        await localforage.iterate((value, key, iterationNumber) => {
                            cards.push(value);
                        });
                        console.log('Dados carregados do IndexedDB:', cards);
                    } catch (err) {
                        console.error('Erro ao carregar dados do IndexedDB:', err);
                        cards = []; // Garante que 'cards' seja um array vazio em caso de erro
                    }
                }

                // Salva dados no IndexedDB (put para adicionar/atualizar)
                async function saveData(card) {
                    try {
                        await localforage.setItem(card.id, card);
                        console.log('Card salvo/atualizado no IndexedDB:', card.id);
                    } catch (err) {
                        console.error('Erro ao salvar card no IndexedDB:', err);
                    }
                }

                // Remove dados do IndexedDB
                async function removeData(cardId) {
                    try {
                        await localforage.removeItem(cardId);
                        console.log('Card removido do IndexedDB:', cardId);
                    } catch (err) {
                        console.error('Erro ao remover card do IndexedDB:', err);
                    }
                }

                // Gera relatório (não precisa de alteração na lógica, pois cards[] será preenchido pelo IndexedDB)
                async function generateReport() {
                    await loadData(); // Garante que cards esteja atualizado antes de gerar o relatório
                    const startDate = document.getElementById('reportStartDate').value;
                    const endDate = document.getElementById('reportEndDate').value;
                    const type = document.getElementById('reportType').value;

                    let filteredCards = cards.filter(card => card.status === 'concluido');

                    // Filtra por data se fornecida
                    if (startDate) {
                        filteredCards = filteredCards.filter(card => card.date >= startDate);
                    }
                    if (endDate) {
                        filteredCards = filteredCards.filter(card => card.date <= endDate);
                    }

                    // Filtra por tipo se fornecido
                    if (type) {
                        filteredCards = filteredCards.filter(card => card.type === type);
                    }

                    // Ordena por data
                    filteredCards.sort((a, b) => new Date(a.date) - new Date(b.date));

                    const reportContent = document.getElementById('reportContent');

                    if (filteredCards.length === 0) {
                        reportContent.innerHTML = '<p>Nenhum pedal encontrado com os filtros selecionados.</p>';
                        return;
                    }

                    // Calcula totais
                    const totalDistance = filteredCards.reduce((sum, card) => sum + (parseInt(card.distance) || 0), 0);
                    const totalElevation = filteredCards.reduce((sum, card) => sum + (parseInt(card.elevation) || 0), 0);

                    let html = `
                        <div style="margin-bottom: 20px;">
                            <h5 style="color: #333; margin-bottom: 10px;">Resumo do Relatório</h5>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                    <div style="font-size: 14px; color: #666;">Total de Pedals</div>
                                    <div style="font-size: 24px; font-weight: bold;">${filteredCards.length}</div>
                                </div>
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                    <div style="font-size: 14px; color: #666;">Distância Total</div>
                                    <div style="font-size: 24px; font-weight: bold;">${totalDistance} km</div>
                                </div>
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                    <div style="font-size: 14px; color: #666;">Elevação Total</div>
                                    <div style="font-size: 24px; font-weight: bold;">${totalElevation} m</div>
                                </div>
                            </div>
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f1f1f1;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Data</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Nome</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Tipo</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Distância</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Elevação</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Local</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    filteredCards.forEach(card => {
                        const formattedDate = new Date(card.date).toLocaleDateString('pt-BR');
                        const bikeType = card.type === 'mtb' ? 'MTB' : 'Speed';

                        html += `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px;">${formattedDate}</td>
                                <td style="padding: 10px;">${card.title}</td>
                                <td style="padding: 10px;">${bikeType}</td>
                                <td style="padding: 10px;">${card.distance || '0'} km</td>
                                <td style="padding: 10px;">${card.elevation || '0'} m</td>
                                <td style="padding: 10px;">${card.location || '-'}</td>
                            </tr>
                        `;
                    });

                    html += `
                            </tbody>
                        </table>
                    `;

                    reportContent.innerHTML = html;
                }

                // Verifica se usuário está logado
                async function checkAuth() {
                    const savedUser = localStorage.getItem('currentUser');
                    if (savedUser) {
                        currentUser = savedUser;
                        await migrateLocalStorage(); // Tenta migrar dados antigos
                        await showApp();
                    }
                }

                // Login
                document.getElementById('loginForm').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const username = document.getElementById('username').value;
                    const password = document.getElementById('password').value;
                    const errorDiv = document.getElementById('loginError');

                    if (users[username] && users[username] === password) {
                        currentUser = username;
                        localStorage.setItem('currentUser', username);
                        errorDiv.textContent = '';
                        await migrateLocalStorage(); // Tenta migrar dados antigos
                        await showApp();
                    } else {
                        errorDiv.textContent = 'Usuário ou senha incorretos!';
                    }
                });

                // Logout
                document.getElementById('logoutBtn').addEventListener('click', function () {
                    localStorage.removeItem('currentUser');
                    currentUser = null;
                    showLogin();
                });

                // Mostra tela de login
                function showLogin() {
                    document.getElementById('loginContainer').style.display = 'flex';
                    document.getElementById('appContainer').style.display = 'none';
                }

                // Mostra aplicação
                async function showApp() {
                    document.getElementById('loginContainer').style.display = 'none';
                    document.getElementById('appContainer').style.display = 'block';
                    document.getElementById('welcomeUser').textContent = `Olá, ${currentUser}!`;
                    await loadData(); // Carrega dados do IndexedDB
                    renderCards();
                }

                // Gera ID único
                function generateId() {
                    return Date.now().toString(36) + Math.random().toString(36).substr(2);
                }

                // Adiciona novo card
                document.getElementById('addCardBtn').addEventListener('click', async function () {
                    const title = document.getElementById('cardTitle').value;
                    const date = document.getElementById('cardDate').value;
                    const type = document.getElementById('cardType').value;
                    const distance = document.getElementById('cardDistance').value;
                    const location = document.getElementById('cardLocation').value;
                    const status = document.getElementById('cardStatus').value;
                    const description = document.getElementById('cardDescription').value;

                    if (!title || !date || !type || !status) {
                        alert('Por favor, preencha os campos obrigatórios!');
                        return;
                    }

                    const newCard = {
                        id: generateId(),
                        title,
                        date,
                        type,
                        distance: distance || '',
                        location: location || '',
                        difficulty: document.getElementById('cardDifficulty').value || '',
                        startTime: document.getElementById('cardStartTime').value || '',
                        elevation: document.getElementById('cardElevation').value || '',
                        stravaLink: document.getElementById('cardStravaLink').value || '',
                        status,
                        description: description || '',
                        createdAt: new Date().toISOString()
                    };

                    cards.push(newCard);
                    await saveData(newCard); // Salva no IndexedDB
                    renderCards();
                    clearForm();
                });

                // Limpa formulário
                function clearForm() {
                    document.getElementById('cardTitle').value = '';
                    document.getElementById('cardDate').value = '';
                    document.getElementById('cardType').value = '';
                    document.getElementById('cardDistance').value = '';
                    document.getElementById('cardLocation').value = '';
                    document.getElementById('cardDifficulty').value = '';
                    document.getElementById('cardStartTime').value = '';
                    document.getElementById('cardElevation').value = '';
                    document.getElementById('cardStravaLink').value = '';
                    document.getElementById('cardStatus').value = 'planejado';
                    document.getElementById('cardDescription').value = '';
                }

                // Função para obter texto da dificuldade
                function getDifficultyText(difficulty) {
                    const difficulties = {
                        'peba': 'Peba (Iniciante)',
                        'intermediario': 'Intermediário',
                        'avancado': 'Avançado',
                        'expert': 'Expert'
                    };
                    return difficulties[difficulty] || difficulty;
                }

                // Sistema de abas
                async function switchTab(tabName) {
                    // Remove active de todas as abas
                    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

                    // Ativa a aba selecionada
                    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
                    document.getElementById(`${tabName}-tab`).classList.add('active');

                    // Atualiza estatísticas se for a aba de stats
                    if (tabName === 'stats') {
                        await updateStats();
                    }
                    // Ocultar/mostrar o kanban-board baseado na aba ativa
                    const kanbanBoard = document.querySelector('.kanban-board');
                    if (tabName === 'report' || tabName === 'stats') {
                        kanbanBoard.classList.add('hidden');
                    } else {
                        kanbanBoard.classList.remove('hidden');
                    }
                }

                // Atualiza estatísticas
                async function updateStats() {
                    await loadData(); // Garante que cards esteja atualizado para o cálculo
                    const completedCards = cards.filter(card => card.status === 'concluido');
                    const totalDistance = completedCards.reduce((sum, card) => sum + (parseInt(card.distance) || 0), 0);
                    const mtbCards = completedCards.filter(card => card.type === 'mtb');
                    const speedCards = completedCards.filter(card => card.type === 'speed');

                    document.getElementById('totalPedals').textContent = completedCards.length;
                    document.getElementById('totalDistance').textContent = totalDistance;
                    document.getElementById('avgDistance').textContent = completedCards.length > 0 ? Math.round(totalDistance / completedCards.length) : 0;
                    document.getElementById('mtbCount').textContent = mtbCards.length;
                    document.getElementById('speedCount').textContent = speedCards.length;

                    // Calcula meta mensal
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    const monthlyCards = completedCards.filter(card => {
                        const cardDate = new Date(card.date);
                        return cardDate.getMonth() === currentMonth && cardDate.getFullYear() === currentYear;
                    });
                    const monthlyDistance = monthlyCards.reduce((sum, card) => sum + (parseInt(card.distance) || 0), 0);
                    // A meta mensal pode permanecer no localStorage, ou ser migrada para IndexedDB também se houver necessidade
                    const monthlyGoalKm = localStorage.getItem('monthlyGoal') || 0;
                    const goalProgress = monthlyGoalKm > 0 ? Math.round((monthlyDistance / monthlyGoalKm) * 100) : 0;

                    document.getElementById('monthlyGoal').textContent = goalProgress + '%';
                }

                // Define meta mensal
                function setMonthlyGoal() {
                    const goal = document.getElementById('monthlyGoalKm').value;
                    if (goal && goal > 0) {
                        localStorage.setItem('monthlyGoal', goal); // Mantém no localStorage por simplicidade
                        document.getElementById('monthlyGoalKm').value = '';
                        updateStats();
                        alert('Meta mensal definida com sucesso!');
                    }
                }

                // Renderiza cards
                function renderCards() {
                    const columns = ['planejado', 'confirmado', 'em-andamento', 'concluido'];

                    columns.forEach(status => {
                        const container = document.getElementById(`${status}-cards`);
                        const statusCards = cards.filter(card => card.status === status);

                        // Atualiza contador
                        const countElement = container.parentElement.querySelector('.card-count');
                        countElement.textContent = statusCards.length;

                        // Limpa container
                        container.innerHTML = statusCards.length === 0 ?
                            '<div class="drop-zone">Arraste os pedais aqui</div>' : '';

                        // Adiciona cards
                        statusCards.forEach(card => {
                            const cardElement = createCardElement(card);
                            container.appendChild(cardElement);
                        });
                    });
                }

                // Cria elemento do card
                function createCardElement(card) {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'card';
                    cardDiv.draggable = true;
                    cardDiv.dataset.cardId = card.id;

                    const formatDate = new Date(card.date).toLocaleDateString('pt-BR');
                    const bikeTypeClass = card.type === 'mtb' ? 'mtb' : 'speed';
                    const bikeTypeText = card.type === 'mtb' ? 'MTB' : 'SPEED';

                    cardDiv.innerHTML = `
                        <div class="card-header">
                            <div class="card-title">${card.title}</div>
                            <div class="card-actions">
                                <button class="edit-btn" onclick="openEditModal('${card.id}')">✏️</button>
                                <button class="delete-btn" onclick="deleteCard('${card.id}')">🗑️</button>
                            </div>
                        </div>
                        <div class="card-info">📅 ${formatDate}</div>
                        ${card.startTime ? `<div class="card-info">🕐 ${card.startTime}</div>` : ''}
                        ${card.distance ? `<div class="card-info">📏 ${card.distance} km</div>` : ''}
                        ${card.elevation ? `<div class="card-info">⛰️ ${card.elevation}m elevação</div>` : ''}
                        ${card.location ? `<div class="card-info">📍 ${card.location}</div>` : ''}
                        ${card.difficulty ? `<div class="card-info">💪 ${getDifficultyText(card.difficulty)}</div>` : ''}
                        ${card.stravaLink ? `<div class="card-info"><a href="${card.stravaLink}" target="_blank" style="color: #fc4c02;">🔗 Ver no Strava</a></div>` : ''}
                        ${card.description ? `<div class="card-description">${card.description}</div>` : ''}
                        <span class="bike-type ${bikeTypeClass}">${bikeTypeText}</span>
                    `;

                    // Eventos de drag
                    cardDiv.addEventListener('dragstart', handleDragStart);
                    cardDiv.addEventListener('dragend', handleDragEnd);

                    return cardDiv;
                }

                // Drag and Drop
                let draggedCard = null;

                function handleDragStart(e) {
                    draggedCard = e.target;
                    e.target.classList.add('dragging');
                }

                async function handleDragEnd(e) {
                    e.target.classList.remove('dragging');
                    draggedCard = null;
                    // Recarrega e renderiza para garantir a consistência após o drag (opcional, mas seguro)
                    await loadData();
                    renderCards();
                }

                // Configura drop zones
                document.querySelectorAll('.cards-container').forEach(container => {
                    container.addEventListener('dragover', handleDragOver);
                    container.addEventListener('drop', handleDrop);
                    container.addEventListener('dragenter', handleDragEnter);
                    container.addEventListener('dragleave', handleDragLeave);
                });

                function handleDragOver(e) {
                    e.preventDefault();
                }

                function handleDragEnter(e) {
                    e.preventDefault();
                    const dropZone = e.currentTarget.querySelector('.drop-zone');
                    if (dropZone) {
                        dropZone.classList.add('drag-over');
                    }
                }

                function handleDragLeave(e) {
                    const dropZone = e.currentTarget.querySelector('.drop-zone');
                    if (dropZone && !e.currentTarget.contains(e.relatedTarget)) {
                        dropZone.classList.remove('drag-over');
                    }
                }

                async function handleDrop(e) {
                    e.preventDefault();

                    if (!draggedCard) return;

                    const newStatus = e.currentTarget.id.replace('-cards', '');
                    const cardId = draggedCard.dataset.cardId;

                    // Atualiza status do card
                    const cardIndex = cards.findIndex(card => card.id === cardId);
                    if (cardIndex !== -1) {
                        cards[cardIndex].status = newStatus;
                        await saveData(cards[cardIndex]); // Salva a atualização no IndexedDB
                        renderCards(); // Renderiza para refletir a mudança
                    }

                    // Remove classe de drag over
                    const dropZone = e.currentTarget.querySelector('.drop-zone');
                    if (dropZone) {
                        dropZone.classList.remove('drag-over');
                    }
                }

                // Deleta card
                async function deleteCard(cardId) {
                    if (confirm('Tem certeza que deseja excluir este pedal?')) {
                        cards = cards.filter(card => card.id !== cardId);
                        await removeData(cardId); // Remove do IndexedDB
                        renderCards();
                    }
                }

                // Modal de edição
                function openEditModal(cardId) {
                    const card = cards.find(c => c.id === cardId);
                    if (!card) return;

                    editingCardId = cardId;
                    document.getElementById('editTitle').value = card.title;
                    document.getElementById('editDate').value = card.date;
                    document.getElementById('editType').value = card.type;
                    document.getElementById('editDistance').value = card.distance || '';
                    document.getElementById('editLocation').value = card.location || '';
                    document.getElementById('editStartTime').value = card.startTime || '';
                    document.getElementById('editElevation').value = card.elevation || '';
                    document.getElementById('editDifficulty').value = card.difficulty || '';
                    document.getElementById('editStravaLink').value = card.stravaLink || '';
                    document.getElementById('editStatus').value = card.status;
                    document.getElementById('editDescription').value = card.description || '';

                    document.getElementById('editModal').style.display = 'block';
                }

                function closeEditModal() {
                    document.getElementById('editModal').style.display = 'none';
                    editingCardId = null;
                }

                // Salva edição
                document.getElementById('editForm').addEventListener('submit', async function (e) {
                    e.preventDefault();

                    if (!editingCardId) return;

                    const cardIndex = cards.findIndex(card => card.id === editingCardId);
                    if (cardIndex === -1) return;

                    cards[cardIndex] = {
                        ...cards[cardIndex],
                        title: document.getElementById('editTitle').value,
                        date: document.getElementById('editDate').value,
                        type: document.getElementById('editType').value,
                        distance: document.getElementById('editDistance').value,
                        location: document.getElementById('editLocation').value,
                        startTime: document.getElementById('editStartTime').value,
                        elevation: document.getElementById('editElevation').value,
                        difficulty: document.getElementById('editDifficulty').value,
                        stravaLink: document.getElementById('editStravaLink').value,
                        status: document.getElementById('editStatus').value,
                        description: document.getElementById('editDescription').value
                    };

                    await saveData(cards[cardIndex]); // Salva a edição no IndexedDB
                    renderCards();
                    closeEditModal();
                });

                // Fecha modal clicando fora
                document.getElementById('editModal').addEventListener('click', function (e) {
                    if (e.target === this) {
                        closeEditModal();
                    }
                });

                // Inicialização
                checkAuth();
                if (!currentUser) {
                    showLogin();
                }
