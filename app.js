document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const numPlayersInput = document.getElementById('num-players');
    const playersList = document.getElementById('players-list');
    const btnGenerate = document.getElementById('btn-generate');
    
    const homeView = document.getElementById('home-view');
    const formatView = document.getElementById('format-view');
    const setupView = document.getElementById('setup-view');
    const groupsView = document.getElementById('groups-view');
    const bracketView = document.getElementById('bracket-view');
    const savedView = document.getElementById('saved-view');
    const statsView = document.getElementById('stats-view');
    const teamsView = document.getElementById('teams-view');
    const configView = document.getElementById('config-view');
    
    const btnCreateTournament = document.getElementById('btn-create-tournament');
    const btnHeroSaved = document.getElementById('btn-hero-saved');
    const btnHeroContinue = document.getElementById('btn-hero-continue');
    const heroContinueContainer = document.getElementById('hero-continue-container');
    const continueName = document.getElementById('continue-name');
    const formatCards = document.querySelectorAll('.format-card');

    const groupsContainer = document.getElementById('groups-container');
    const btnToBracket = document.getElementById('btn-to-bracket');
    const btnToGroups = document.getElementById('btn-to-groups');
    const bracketContainer = document.getElementById('bracket-container');
    const btnSaveGroups = document.getElementById('btn-save-groups');
    const btnSaveBracket = document.getElementById('btn-save-bracket');


    
    // Saved view search and filter DOM elements
    const savedSearchInput = document.getElementById('saved-search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');


    // Dynamic Backend URL based on host (local vs production)
    function getBackendUrl() {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host.includes('trycloudflare.com')) {
            return '';
        }
        return 'https://torneos-fc-backend.onrender.com';
    }

    // State
    const state = {
        id: null,
        name: '',
        format: 'champions', // default
        knockoutFormat: 'single', // single or double
        participants: [],
        groups: [],      // Array of { id, name, teams: [], matches: [] }
        shareCode: null,
        isSpectator: false,
        leaguePlayoffFormat: 'none',
        leaguePlayoffQty: 4
    };
    
    document.getElementById('bracket-format-select').addEventListener('change', (e) => {
        state.knockoutFormat = e.target.value;
        if (document.getElementById('bracket-view').classList.contains('active')) {
            if (state.format === 'liga') {
                runPlayoffsTransition(state.leaguePlayoffQty || 4, state.leaguePlayoffFormat || 'direct');
            } else {
                state.bracketGenerated = false;
                generateBracket();
                drawBracket();
            }
        } else {
            state.bracketGenerated = false;
        }
    });

    // Initialize Setup
    function renderPlayerInputs() {
        let count = parseInt(numPlayersInput.value);
        if (isNaN(count) || count < 2) count = 2;
        if (count > 32) count = 32;
        numPlayersInput.value = count;

        const currentInputs = playersList.querySelectorAll('input');
        const currentVals = Array.from(currentInputs).map(i => i.value);

        playersList.innerHTML = '';
        const shields = ['🛡️', '⚽', '🏆', '⭐', '⚔️', '🔥', '👑', '💎', '🚀', '🦁', '🦅', '🐯', '🐺', '⚡', '🔴', '🔵', '🟢', '🟡'];
        for (let i = 0; i < count; i++) {
            const card = document.createElement('div');
            card.className = 'player-pill-card';

            const shield = document.createElement('span');
            shield.className = 'player-pill-shield';
            shield.textContent = shields[i % shields.length];

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'player-pill-input';
            input.placeholder = `Participante ${i + 1}`;
            input.value = currentVals[i] || '';

            card.appendChild(shield);
            card.appendChild(input);
            playersList.appendChild(card);
        }
        
        // Auto-update custom champions config based on player count
        const rec = getRecommendedConfig(count);
        const cg = document.getElementById('custom-groups');
        const cd = document.getElementById('custom-direct');
        const cw = document.getElementById('custom-wildcards');
        if (cg) cg.value = rec.gCount;
        if (cd) cd.value = rec.topN;
        if (cw) cw.value = rec.bestCount;
        if (typeof calculateManualConfig === 'function') calculateManualConfig();
        if (typeof updateLeaguePlayoffsQtySelect === 'function') updateLeaguePlayoffsQtySelect();
    }

    function getRecommendedConfig(n) {
        if (n <= 2) return { gCount: 0, topN: 2, bestCount: 0 };
        if (n === 3) return { gCount: 1, topN: 2, bestCount: 0 };
        if (n === 4) return { gCount: 1, topN: 2, bestCount: 0 };
        if (n === 5) return { gCount: 1, topN: 4, bestCount: 0 };
        if (n === 6) return { gCount: 2, topN: 2, bestCount: 0 };
        if (n === 7) return { gCount: 2, topN: 2, bestCount: 0 };
        if (n === 8) return { gCount: 2, topN: 2, bestCount: 0 };
        if (n === 9) return { gCount: 2, topN: 2, bestCount: 0 };
        if (n >= 10 && n <= 11) return { gCount: 2, topN: 4, bestCount: 0 };
        if (n >= 12 && n <= 15) return { gCount: 3, topN: 2, bestCount: 2 };
        if (n >= 16 && n <= 19) return { gCount: 4, topN: 2, bestCount: 0 };
        if (n >= 20 && n <= 23) return { gCount: 5, topN: 1, bestCount: 3 };
        if (n >= 24 && n <= 31) return { gCount: 6, topN: 1, bestCount: 2 };
        if (n === 32) return { gCount: 8, topN: 2, bestCount: 0 };
        return { gCount: Math.max(1, Math.floor(n/4)), topN: 2, bestCount: 0 };
    }

    numPlayersInput.addEventListener('input', renderPlayerInputs);
    renderPlayerInputs();

    // Stepper controls (+ / -) for player count
    const btnStepperSubFast = document.getElementById('btn-stepper-sub-fast');
    const btnStepperSub = document.getElementById('btn-stepper-sub');
    const btnStepperAdd = document.getElementById('btn-stepper-add');
    const btnStepperAddFast = document.getElementById('btn-stepper-add-fast');

    function changePlayerCount(delta) {
        let current = parseInt(numPlayersInput.value) || 16;
        current = Math.max(2, Math.min(32, current + delta));
        numPlayersInput.value = current;
        renderPlayerInputs();
    }

    if (btnStepperSubFast) btnStepperSubFast.addEventListener('click', () => changePlayerCount(-4));
    if (btnStepperSub) btnStepperSub.addEventListener('click', () => changePlayerCount(-1));
    if (btnStepperAdd) btnStepperAdd.addEventListener('click', () => changePlayerCount(1));
    if (btnStepperAddFast) btnStepperAddFast.addEventListener('click', () => changePlayerCount(4));

    // Live search filter in setup view
    const setupPlayersSearch = document.getElementById('setup-players-search');
    if (setupPlayersSearch) {
        setupPlayersSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const cards = playersList.querySelectorAll('.player-pill-card');
            cards.forEach(card => {
                const input = card.querySelector('input');
                const text = (input ? input.value : '') || input.placeholder;
                if (!query || text.toLowerCase().includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Helper to sync modular grid 2x2 setup view cards based on format
    window.updateSetupViewLayout = function() {
        const formatTitle = document.getElementById('setup-format-card-title');
        const customChampionsConfig = document.getElementById('custom-champions-config');
        const leagueConfig = document.getElementById('league-config');
        const copaConfig = document.getElementById('copa-config');

        const championsRulesBox = document.getElementById('champions-rules-box');
        const leagueRulesBox = document.getElementById('league-rules-box');
        const copaRulesBox = document.getElementById('copa-rules-box');

        if (state.format === 'champions') {
            if (formatTitle) formatTitle.textContent = 'FORMATO DE CHAMPIONS';
            if (customChampionsConfig) customChampionsConfig.classList.remove('hidden');
            if (leagueConfig) leagueConfig.classList.add('hidden');
            if (copaConfig) copaConfig.classList.add('hidden');

            if (championsRulesBox) championsRulesBox.classList.remove('hidden');
            if (leagueRulesBox) leagueRulesBox.classList.add('hidden');
            if (copaRulesBox) copaRulesBox.classList.add('hidden');
        } else if (state.format === 'liga') {
            if (formatTitle) formatTitle.textContent = 'FORMATO DE LIGA';
            if (leagueConfig) leagueConfig.classList.remove('hidden');
            if (customChampionsConfig) customChampionsConfig.classList.add('hidden');
            if (copaConfig) copaConfig.classList.add('hidden');

            if (leagueRulesBox) leagueRulesBox.classList.remove('hidden');
            if (championsRulesBox) championsRulesBox.classList.add('hidden');
            if (copaRulesBox) copaRulesBox.classList.add('hidden');
            if (typeof updateLeaguePlayoffsQtySelect === 'function') updateLeaguePlayoffsQtySelect();
        } else if (state.format === 'copa') {
            if (formatTitle) formatTitle.textContent = 'FORMATO DE COPA';
            if (copaConfig) copaConfig.classList.remove('hidden');
            if (customChampionsConfig) customChampionsConfig.classList.add('hidden');
            if (leagueConfig) leagueConfig.classList.add('hidden');

            if (copaRulesBox) copaRulesBox.classList.remove('hidden');
            if (championsRulesBox) championsRulesBox.classList.add('hidden');
            if (leagueRulesBox) leagueRulesBox.classList.add('hidden');
        }
    };

    // Auto-import via hash fragment for double-click self-extracting files
    function checkHashImport() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#import=')) {
            const base64Data = hash.substring(8);
            try {
                const jsonStr = decodeURIComponent(escape(atob(base64Data)));
                const parsed = JSON.parse(jsonStr);
                
                if (parsed && parsed.id && parsed.format && parsed.participants) {
                    let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
                    const existingIdx = stored.findIndex(t => t.id === parsed.id);
                    if (existingIdx >= 0) {
                        stored[existingIdx] = parsed;
                    } else {
                        stored.push(parsed);
                    }
                    localStorage.setItem('torneos-fc-data', JSON.stringify(stored));
                    
                    // Clear hash silently to keep clean URL
                    history.replaceState("", document.title, window.location.pathname + window.location.search);
                    
                    // Force refresh home lists
                    initHome();
                    if (typeof renderSavedTournaments === 'function') renderSavedTournaments();
                    
                    // Load the imported tournament instantly
                    setTimeout(() => {
                        window.loadTournament(parsed.id);
                        showToast('🏆 Torneo importado y cargado automáticamente 🏆');
                    }, 150);
                }
            } catch (err) {
                console.error('Error importing from hash:', err);
                showToast('Error al importar el torneo desde el enlace ⚠️');
            }
        }
    }

    // Init Home Screen State
    function initHome() {
        if (!heroContinueContainer) return;
        let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
        if (stored.length > 0) {
            stored.sort((a,b) => {
                 const t1 = a.id ? parseInt(a.id.split('-')[1]) : 0;
                 const t2 = b.id ? parseInt(b.id.split('-')[1]) : 0;
                 return t2 - t1;
            });
            const last = stored[0];
            heroContinueContainer.classList.remove('hidden');
            if (continueName) continueName.textContent = last.name || 'Torneo sin nombre';
            if (btnHeroContinue) btnHeroContinue.setAttribute('data-id', last.id);
        } else {
            heroContinueContainer.classList.add('hidden');
        }
    }
    initHome();
    checkHashImport();
    if (typeof updateLeaguePlayoffsQtySelect === 'function') updateLeaguePlayoffsQtySelect();

    // Show toast
    function showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Switch Views
    const viewHistory = [];

    window.updateGlobalBadge = function() {
        document.querySelectorAll('.btn-inline-code').forEach(btn => {
            if (state.shareCode) {
                btn.classList.remove('hidden');
                btn.textContent = '👁️ Ver Código';
                btn.dataset.showing = 'false';
            } else {
                btn.classList.add('hidden');
            }
        });
    };

    let spectatorPollInterval = null;

    function startSpectatorPolling() {
        if (spectatorPollInterval) return; // already polling
        if (!state.isSpectator || !state.shareCode) return;

        console.log('Starting spectator polling for tournament code:', state.shareCode);
        spectatorPollInterval = setInterval(async () => {
            if (!state.isSpectator || !state.shareCode) {
                stopSpectatorPolling();
                return;
            }
            try {
                const baseUrl = getBackendUrl();
                const response = await fetch(`${baseUrl}/api/tournaments/${state.shareCode}`);
                const data = await response.json();
                if (data.success && data.tournament) {
                    // Normalize to avoid superficial differences
                    const oldStr = JSON.stringify({ ...state, isSpectator: null, lastSaved: null });
                    const newStr = JSON.stringify({ ...data.tournament, isSpectator: null, lastSaved: null });
                    
                    if (oldStr !== newStr) {
                        console.log('Spectator update received from server! Redrawing views...');
                        const savedIsSpectator = state.isSpectator;
                        for (let key in state) delete state[key];
                        Object.assign(state, data.tournament);
                        state.isSpectator = savedIsSpectator;

                        // Redraw active view
                        const currentView = document.querySelector('.view.active');
                        if (currentView === groupsView && state.groups && state.groups.length > 0) {
                            drawGroups();
                        } else if (currentView === bracketView && (state.bracketGenerated || (state.bracketRounds && state.bracketRounds.length > 0))) {
                            drawBracket();
                        } else if (currentView === statsView) {
                            calculateAndDrawStats();
                        }
                        
                        if (typeof aplicarModoEspectador === 'function') aplicarModoEspectador();
                        if (typeof updateGlobalBadge === 'function') updateGlobalBadge();
                    }
                }
            } catch (err) {
                console.error('Error polling tournament updates:', err);
            }
        }, 4000); // Check every 4 seconds
    }


    function stopSpectatorPolling() {
        if (spectatorPollInterval) {
            console.log('Stopping spectator polling');
            clearInterval(spectatorPollInterval);
            spectatorPollInterval = null;
        }
    }

    function showView(view, pushToHistory = true) {
        if (pushToHistory) {
            const currentView = document.querySelector('.view.active');
            if (currentView && currentView !== view) {
                if (viewHistory.length === 0 || viewHistory[viewHistory.length - 1] !== currentView) {
                    viewHistory.push(currentView);
                }
            }
        }

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        view.classList.add('active');

        // Toggle stats menu visibility based on view
        const menuStatsBtn = document.getElementById('btn-menu-stats');
        if (menuStatsBtn) {
            if (view === groupsView || view === bracketView || view === statsView) {
                menuStatsBtn.classList.remove('hidden');
            } else {
                menuStatsBtn.classList.add('hidden');
            }
        }
        
        // Start or stop spectator polling based on current view
        if (state.isSpectator && (view === groupsView || view === bracketView || view === statsView)) {
            startSpectatorPolling();
        } else {
            stopSpectatorPolling();
        }
        
        if (typeof aplicarModoEspectador === 'function') {
            setTimeout(aplicarModoEspectador, 50); // Timeout to allow rendering
        }
        if (typeof updateGlobalBadge === 'function') {
            setTimeout(updateGlobalBadge, 50);
        }
    }

    // Reset Setup View for a new tournament
    function resetTournamentSetup() {
        console.log('Resetting tournament setup state and inputs...');
        
        // Reset state object
        state.id = null;
        state.name = '';
        state.format = 'champions';
        state.knockoutFormat = 'single';
        state.participants = [];
        state.groups = [];
        state.bracketRounds = [];
        state.bracketGenerated = false;
        state.shareCode = null;
        state.isSpectator = false;
        state.celebratedLiga = false;
        state.celebratedCopa = false;
        state.customConfig = null;
        state.leaguePlayoffFormat = 'none';
        state.leaguePlayoffQty = 4;
        
        // Reset DOM Inputs
        const tournamentNameInput = document.getElementById('tournament-name');
        if (tournamentNameInput) tournamentNameInput.value = '';
        
        if (numPlayersInput) numPlayersInput.value = '16';
        
        const customGroups = document.getElementById('custom-groups');
        if (customGroups) customGroups.value = '4';
        
        const customDirect = document.getElementById('custom-direct');
        if (customDirect) customDirect.value = '2';
        
        const customWildcards = document.getElementById('custom-wildcards');
        if (customWildcards) customWildcards.value = '0';
        
        const copaScheduleSelect = document.getElementById('copa-schedule-select');
        if (copaScheduleSelect) copaScheduleSelect.value = 'single';
        
        const copaTypeSelect = document.getElementById('copa-type-select');
        if (copaTypeSelect) copaTypeSelect.value = 'direct';
        
        const championsTypeSelect = document.getElementById('champions-type-select');
        if (championsTypeSelect) championsTypeSelect.value = 'direct';
        
        state.leaguePlayoffFormat = 'none';
        state.leaguePlayoffQty = 4;
        const leaguePlayoffsSelect = document.getElementById('league-playoffs-select');
        if (leaguePlayoffsSelect) {
            leaguePlayoffsSelect.value = 'none';
            if (typeof updateLeaguePlayoffsQtySelect === 'function') updateLeaguePlayoffsQtySelect();
        }
        
        const leagueScheduleSelect = document.getElementById('league-schedule-select');
        if (leagueScheduleSelect) leagueScheduleSelect.value = 'double';
        

        
        if (typeof window.updateSetupViewLayout === 'function') {
            window.updateSetupViewLayout();
        }
        
        // Clear manual validation banner
        isManualConfigValid = true;
        const customValidBanner = document.getElementById('custom-valid-banner');
        if (customValidBanner) {
            customValidBanner.className = 'custom-valid-banner valid';
            const customTotalTarget = document.getElementById('custom-total-target');
            if (customTotalTarget) customTotalTarget.textContent = '8';
        }
        const customErrorText = document.getElementById('custom-error-text');
        if (customErrorText) customErrorText.classList.add('hidden');
        
        // Remove active class from menu buttons
        btnMenuSetup.classList.add('hidden');
        btnMenuGroups.classList.add('hidden');
        btnMenuBracket.classList.add('hidden');
        
        // Re-render empty inputs
        renderPlayerInputs();
        
        // Apply theme
        window.updateAppTheme();
    }




    // Home & Format Navigation
    btnCreateTournament.addEventListener('click', () => {
        resetTournamentSetup();
        viewHistory.length = 0; 
        viewHistory.push(homeView); 
        showView(formatView, false);
    });

    if (btnHeroSaved) {
        btnHeroSaved.addEventListener('click', () => {
            renderSavedTournaments();
            showView(savedView, true);
        });
    }

    const btnImportFile = document.getElementById('btn-import-file');
    const inputImportFile = document.getElementById('input-import-file');
    if (btnImportFile && inputImportFile) {
        btnImportFile.addEventListener('click', () => {
            inputImportFile.click();
        });
        inputImportFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importTournamentFromFile(file);
                e.target.value = '';
            }
        });
    }

    if (btnHeroContinue) {
        btnHeroContinue.addEventListener('click', () => {
            const lastId = btnHeroContinue.getAttribute('data-id');
            if (lastId) window.loadTournament(lastId);
        });
    }

    // Menú Hamburguesa
    const btnMenuToggle = document.getElementById('btn-menu-toggle');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const btnMenuHome = document.getElementById('btn-menu-home');
    const btnMenuNew = document.getElementById('btn-menu-new');
    const btnMenuSaved = document.getElementById('btn-menu-saved');
    const btnMenuStats = document.getElementById('btn-menu-stats');
    const btnMenuReset = document.getElementById('btn-menu-reset');
    const btnMenuDownload = document.getElementById('btn-menu-download');
    const btnMenuShare = document.getElementById('btn-menu-share');

    const btnMenuSetup = document.getElementById('btn-menu-setup');
    const btnMenuGroups = document.getElementById('btn-menu-groups');
    const btnMenuBracket = document.getElementById('btn-menu-bracket');

    document.querySelectorAll('.btn-inline-code').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!state.shareCode) return;
            if (btn.dataset.showing === 'true') {
                btn.textContent = '👁️ Ver Código';
                btn.dataset.showing = 'false';
            } else {
                btn.textContent = `👁️ ${state.shareCode}`;
                btn.dataset.showing = 'true';

                // Copiar enlace directo de espectador al portapapeles
                const joinUrl = `${window.location.origin}${window.location.pathname}?join=${state.shareCode}`;
                navigator.clipboard.writeText(joinUrl).then(() => {
                    showToast('¡Enlace de Espectador copiado! 👁️📋');
                }).catch(err => {
                    console.error('Failed to copy direct spectator URL:', err);
                    showToast(`Código: ${state.shareCode}`);
                });
            }
        });
    });

    btnMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Dynamically toggle download button based on active tournament state
        if (btnMenuDownload) {
            if (state && state.id && state.format && state.participants && state.participants.length > 0) {
                btnMenuDownload.classList.remove('hidden');
            } else {
                btnMenuDownload.classList.add('hidden');
            }
        }
        if (btnMenuShare) {
            if (state && state.id && state.format && state.participants && state.participants.length > 0) {
                btnMenuShare.classList.remove('hidden');
            } else {
                btnMenuShare.classList.add('hidden');
            }
        }
        
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.hamburger-menu')) {
            dropdownMenu.classList.remove('show');
        }
    });

    btnMenuHome.addEventListener('click', () => {
        viewHistory.length = 0;
        showView(homeView, false);
        dropdownMenu.classList.remove('show');
    });

    btnMenuNew.addEventListener('click', () => {
        resetTournamentSetup();
        viewHistory.length = 0;
        viewHistory.push(homeView);
        showView(formatView, false);
        dropdownMenu.classList.remove('show');
    });

    if (btnMenuDownload) {
        btnMenuDownload.addEventListener('click', () => {
            downloadTournamentData();
            dropdownMenu.classList.remove('show');
        });
    }

    if (btnMenuShare) {
        btnMenuShare.addEventListener('click', () => {
            shareTournamentLink();
            dropdownMenu.classList.remove('show');
        });
    }


    btnMenuSaved.addEventListener('click', () => {
        renderSavedTournaments();
        showView(savedView, true);
        dropdownMenu.classList.remove('show');
    });

    btnMenuStats.addEventListener('click', () => {
        calculateAndDrawStats();
        showView(statsView, true);
        dropdownMenu.classList.remove('show');
    });

    btnMenuSetup.addEventListener('click', () => {
        showView(setupView);
        dropdownMenu.classList.remove('show');
    });
    btnMenuGroups.addEventListener('click', () => {
        showView(groupsView);
        dropdownMenu.classList.remove('show');
    });
    btnMenuBracket.addEventListener('click', () => {
        showView(bracketView);
        dropdownMenu.classList.remove('show');
    });

    // Sidebar Navigation Listeners
    const navHome = document.getElementById('nav-home');
    const navSaved = document.getElementById('nav-saved');
    const navTeams = document.getElementById('nav-teams');
    const navRanking = document.getElementById('nav-ranking');
    const navConfig = document.getElementById('nav-config');
    const navSupport = document.getElementById('nav-support');

    function setActiveNavItem(activeBtn) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        if (activeBtn) activeBtn.classList.add('active');
    }

    if (navHome) navHome.addEventListener('click', () => { setActiveNavItem(navHome); viewHistory.length = 0; showView(homeView, false); });
    if (navSaved) navSaved.addEventListener('click', () => { setActiveNavItem(navSaved); renderSavedTournaments(); showView(savedView, true); });
    if (navTeams) navTeams.addEventListener('click', () => { setActiveNavItem(navTeams); renderTeamsView(); showView(teamsView, true); });
    if (navRanking) navRanking.addEventListener('click', () => { setActiveNavItem(navRanking); renderRankingView('all'); showView(statsView, true); });
    if (navConfig) navConfig.addEventListener('click', () => { setActiveNavItem(navConfig); loadGlobalConfigUI(); showView(configView, true); });
    if (navSupport) navSupport.addEventListener('click', () => { openInfoModal('champions-format'); });

    btnMenuReset.addEventListener('click', () => {
        if (confirm('¿Estás seguro de reiniciar todos los datos? Se borrará todo el progreso actual.')) {
            window.location.reload();
        }
    });

    window.goBack = function() {
        const currentView = document.querySelector('.view.active');
        while (viewHistory.length > 0 && viewHistory[viewHistory.length - 1] === currentView) {
            viewHistory.pop();
        }

        if (viewHistory.length > 0) {
            const prevView = viewHistory.pop();
            showView(prevView, false);
        } else {
            showView(homeView, false);
        }
    };

    document.querySelectorAll('.btn-header-back').forEach(btn => {
        btn.addEventListener('click', window.goBack);
    });

    window.updateAppTheme = function() {
        document.body.classList.remove('theme-champions', 'theme-copa', 'theme-brasileirao', 'theme-premier', 'theme-laliga', 'theme-seriea', 'theme-bundesliga', 'theme-ligue1', 'theme-argentina', 'theme-mls', 'theme-eredivisie', 'theme-primeira', 'theme-chile');
        if (state.format === 'champions') {
            document.body.classList.add('theme-champions');
        } else if (state.format === 'copa') {
            document.body.classList.add('theme-copa');
        }
    };

    formatCards.forEach(card => {
        card.addEventListener('click', () => {
            state.format = card.getAttribute('data-format');
            const numPlayersInput = document.getElementById('num-players');
            
            if (state.format === 'copa') {
                if (numPlayersInput && ![2,4,8,16,32].includes(parseInt(numPlayersInput.value))) {
                    numPlayersInput.value = 16;
                    renderPlayerInputs();
                }
            }

            if (typeof window.updateSetupViewLayout === 'function') {
                window.updateSetupViewLayout();
            }
            
            window.updateAppTheme();
            if (state.format === 'champions' || state.format === 'copa') {
                btnMenuSetup.classList.remove('hidden');
            } else {
                btnMenuSetup.classList.add('hidden');
            }
            showView(setupView);
        });
    });



    const customChampionsConfig = document.getElementById('custom-champions-config');
    const manualRulesPanel = document.getElementById('manual-rules-panel');
    var isManualConfigValid = true;
    
    // Auto calculate when manual inputs change
    const _cg = document.getElementById('custom-groups');
    const _cd = document.getElementById('custom-direct');
    const _cw = document.getElementById('custom-wildcards');
    const _cts = document.getElementById('champions-type-select');
    const _lps = document.getElementById('league-playoffs-select');
    if (_cg) _cg.addEventListener('input', calculateManualConfig);
    if (_cd) _cd.addEventListener('input', calculateManualConfig);
    if (_cw) _cw.addEventListener('input', calculateManualConfig);
    if (_cts) _cts.addEventListener('change', calculateManualConfig);
    if (_lps) _lps.addEventListener('change', updateLeaguePlayoffsQtySelect);

    function calculateManualConfig() {
        const cg = document.getElementById('custom-groups');
        const cd = document.getElementById('custom-direct');
        const cw = document.getElementById('custom-wildcards');
        const customTotalTarget = document.getElementById('custom-total-target');
        const customValidBanner = document.getElementById('custom-valid-banner');
        const customErrorText = document.getElementById('custom-error-text');
        
        if (!cg || !cd || !cw) return;

        const gCount = parseInt(cg.value) || 0;
        const direct = parseInt(cd.value) || 0;
        const wild = parseInt(cw.value) || 0;

        const total = (gCount * direct) + wild;
        if (customTotalTarget) customTotalTarget.textContent = total;

        const championsTypeSelect = document.getElementById('champions-type-select');
        const isAdvantage = championsTypeSelect && championsTypeSelect.value === 'advantage';
        const validTargets = isAdvantage ? [4, 5, 8, 16, 32] : [2, 4, 8, 16, 32];

        if (customErrorText) {
            if (isAdvantage) {
                customErrorText.textContent = '⚠️ El total de clasificados debe ser 4, 5, 8, 16 o 32 para el formato Winner + Loser Bracket.';
            } else {
                customErrorText.textContent = '⚠️ El total de clasificados debe ser una potencia de 2 (2, 4, 8, 16 o 32) para las llaves eliminatorias.';
            }
        }

        if (validTargets.includes(total)) {
            if (customValidBanner) {
                customValidBanner.classList.remove('invalid');
                customValidBanner.classList.add('valid');
            }
            if (customErrorText) customErrorText.classList.add('hidden');
            isManualConfigValid = true;
        } else {
            if (customValidBanner) {
                customValidBanner.classList.remove('valid');
                customValidBanner.classList.add('invalid');
            }
            if (customErrorText) customErrorText.classList.remove('hidden');
            isManualConfigValid = false;
        }
    }

    function updateLeaguePlayoffsQtySelect() {
        const lpSelect = document.getElementById('league-playoffs-select');
        const lpQtyContainer = document.getElementById('league-playoffs-qty-container');
        const lpQtySelect = document.getElementById('league-playoffs-qty-select');
        const numPlayersInput = document.getElementById('num-players');
        
        if (!lpSelect || !lpQtyContainer || !lpQtySelect || !numPlayersInput) return;
        
        const format = lpSelect.value;
        const totalTeams = parseInt(numPlayersInput.value) || 2;
        
        if (format === 'none') {
            lpQtyContainer.classList.add('hidden');
            return;
        }
        
        lpQtyContainer.classList.remove('hidden');
        lpQtySelect.innerHTML = '';
        
        let sizes = [];
        if (format === 'advantage') {
            sizes = [4, 5, 8, 16, 32];
            lpQtySelect.disabled = false;
            lpQtySelect.style.opacity = '1';
            lpQtySelect.style.cursor = 'default';
        } else {
            // Find valid powers of 2 <= totalTeams
            const validPowers = [2, 4, 8, 16, 32];
            let maxPower = 2;
            for (let v of validPowers) {
                if (v <= totalTeams) maxPower = v;
            }
            sizes = [maxPower];
            lpQtySelect.disabled = true;
            lpQtySelect.style.opacity = '0.6';
            lpQtySelect.style.cursor = 'not-allowed';
        }
        
        sizes.forEach(size => {
            if (size <= totalTeams) {
                const opt = document.createElement('option');
                opt.value = size;
                opt.textContent = `${size} Equipos`;
                lpQtySelect.appendChild(opt);
            }
        });
    }

    // Event listeners now managed above calculateManualConfig

    // Tournament Specifications Mapping
    function getFormatConfig(n) {
        if (state.format === 'copa') {
            const valid = [2, 4, 8, 16, 32];
            let target = valid[valid.length - 1]; // Fallback to max 32
            for (let v of valid) {
                if (v >= n) { target = v; break; }
            }
            return { gCount: 0, target: target, rule: 'direct' };
        }

        if (state.format === 'liga') {
            return { gCount: 1, target: 1, rule: 'liga' };
        }

        if (state.format === 'champions') {
            if (n === 4 && state.n4Choice === 'semis') {
                return { rule: 'custom', gCount: 1, target: 4, topN: 4, bestCount: 0 };
            }
            if (n === 4 && state.n4Choice === 'final') {
                return { rule: 'custom', gCount: 1, target: 2, topN: 2, bestCount: 0 };
            }
            
            if (state.customConfig) {
                return {
                    rule: 'custom',
                    gCount: state.customConfig.gCount,
                    target: state.customConfig.target,
                    topN: state.customConfig.topN,
                    bestCount: state.customConfig.bestCount
                };
            }
            
            // Fallback for older tournaments before customConfig was saved
            const rec = getRecommendedConfig(n);
            const target = (rec.gCount * rec.topN) + rec.bestCount;
            return {
                rule: 'custom',
                gCount: rec.gCount,
                target: target,
                topN: rec.topN,
                bestCount: rec.bestCount
            };
        }

        // For backwards compatibility or other uses
        if (n === 2) return { gCount: 0, target: 2, rule: 'direct' };
        if (n === 3) return { gCount: 1, target: 2, rule: 'top2' };
        if (n === 4) return { gCount: 1, target: 2, rule: 'top2' };
        if (n === 5) return { gCount: 1, target: 4, rule: 'custom', topN: 4, bestCount: 0 };
        if (n === 6) return { gCount: 2, target: 4, rule: 'top2' };
        if (n === 7) return { gCount: 2, target: 4, rule: 'top2' };
        if (n === 8) return { gCount: 2, target: 4, rule: 'top2' };
        if (n === 9) return { gCount: 2, target: 4, rule: 'top2' };
        if (n === 10) return { gCount: 2, target: 4, rule: 'top2' };
        if (n === 11) return { gCount: 2, target: 4, rule: 'top2' };
        if (n >= 12 && n <= 15) return { gCount: 3, target: 4, rule: 'top1_and_best_2nds', bestCount: 1 };
        if (n >= 16 && n <= 19) return { gCount: 4, target: 8, rule: 'top2' };
        if (n >= 20 && n <= 23) return { gCount: 5, target: 8, rule: 'top1_and_best_2nds', bestCount: 3 };
        if (n === 24) return { gCount: 6, target: 8, rule: 'top1_and_best_2nds', bestCount: 2 };
        if (n >= 25 && n <= 27) return { gCount: 6, target: 8, rule: 'best_overall' };
        if (n === 28) return { gCount: 7, target: 8, rule: 'top1_and_best_2nds', bestCount: 1 };
        if (n >= 29 && n <= 31) return { gCount: 7, target: 8, rule: 'best_overall' };
        if (n === 32) return { gCount: 8, target: 16, rule: 'top2' };
        return { gCount: 1, target: 1, rule: 'triangular' }; // Fallback
    }

    function getQualifiersFromTables(groupTables, cfg) {
        let qualified = [];
        if (cfg.rule === 'direct' || cfg.rule === 'triangular') return [];

        if (cfg.rule === 'best_overall') {
            let allTeams = [];
            groupTables.forEach(table => allTeams.push(...table));
            allTeams.sort((a,b) => {
                 if (b.pts !== a.pts) return b.pts - a.pts;
                 if (b.ptsAvg !== a.ptsAvg) return b.ptsAvg - a.ptsAvg;
                 if (b.dg !== a.dg) return b.dg - a.dg;
                 if (b.dgAvg !== a.dgAvg) return b.dgAvg - a.dgAvg;
                 if (b.gf !== a.gf) return b.gf - a.gf;
                 return b.w - a.w;
            });
            qualified = allTeams.slice(0, cfg.target).map(t => ({...t, qualType: 'wildcard'}));
            return qualified;
        }

        // Layer-by-layer seeding:
        // Capa 0: Todos los 1° lugares de grupo (ordenados entre sí por puntos/DG/GF/W) -> Sembrados 1 al G
        // Capa 1: Todos los 2° lugares de grupo (ordenados entre sí por puntos/DG/GF/W) -> Sembrados G+1 al 2G
        // Capa 2: Comodines / 3° lugares (ordenados entre sí) -> Sembrados 2G+1 al N
        const topN = (cfg.rule === 'top2' ? 2 : (cfg.rule === 'top1_each' ? 1 : (cfg.rule === 'top1_and_best_2nds' ? 1 : (cfg.topN || 2))));
        
        let currentLayer = 0;
        while (qualified.length < cfg.target) {
            let layerTeams = [];
            groupTables.forEach(table => {
                if (table.length > currentLayer) {
                    layerTeams.push(table[currentLayer]);
                }
            });

            if (layerTeams.length === 0) break; // Sin más equipos

            layerTeams.sort((a, b) => {
                 if (b.pts !== a.pts) return b.pts - a.pts;
                 if (b.ptsAvg !== a.ptsAvg) return b.ptsAvg - a.ptsAvg;
                 if (b.dg !== a.dg) return b.dg - a.dg;
                 if (b.dgAvg !== a.dgAvg) return b.dgAvg - a.dgAvg;
                 if (b.gf !== a.gf) return b.gf - a.gf;
                 return b.w - a.w;
            });

            const qualType = currentLayer < topN ? 'direct' : 'wildcard';
            for (let t of layerTeams) {
                if (qualified.length < cfg.target) {
                    qualified.push({...t, qualType});
                }
            }

            currentLayer++;
        }

        return qualified;
    }

    // Generate Tournament
    btnGenerate.addEventListener('click', () => {
        if (state.format === 'champions') {
            if (!isManualConfigValid) {
                alert('Configuración inválida. Revisa los mensajes de error en rojo.');
                return;
            }
            
            // Save the exact user-defined config
            const gCount = parseInt(document.getElementById('custom-groups').value) || 0;
            const topN = parseInt(document.getElementById('custom-direct').value) || 0;
            const bestCount = parseInt(document.getElementById('custom-wildcards').value) || 0;
            const target = (gCount * topN) + bestCount;
            
            state.customConfig = {
                gCount: gCount,
                topN: topN,
                bestCount: bestCount,
                target: target
            };

            const championsTypeSelect = document.getElementById('champions-type-select');
            state.bracketFormatType = championsTypeSelect ? championsTypeSelect.value : 'direct';
        } else if (state.format === 'liga') {
            const leaguePlayoffsSelect = document.getElementById('league-playoffs-select');
            const leaguePlayoffsQtySelect = document.getElementById('league-playoffs-qty-select');
            const leagueTiebreakSelect = document.getElementById('league-tiebreak-select');
            state.leaguePlayoffFormat = leaguePlayoffsSelect ? leaguePlayoffsSelect.value : 'none';
            state.leaguePlayoffQty = leaguePlayoffsQtySelect ? parseInt(leaguePlayoffsQtySelect.value) : 4;
            state.leagueTiebreak = leagueTiebreakSelect ? leagueTiebreakSelect.value : 'dg';
            state.bracketFormatType = state.leaguePlayoffFormat;
        }

        const inputs = playersList.querySelectorAll('input');
        const players = Array.from(inputs).map((input, i) => input.value.trim() || `Equipo ${i + 1}`);
        const n = players.length;

        if (state.format === 'copa') {
            if (![2, 4, 8, 16, 32].includes(n)) {
                alert('El Formato de Copa requiere llaves exactas sin fase de grupos. Por favor ingresa exactamente 2, 4, 8, 16 o 32 equipos para poder comenzar.');
                return;
            }
            
            const copaScheduleSelect = document.getElementById('copa-schedule-select');
            state.knockoutFormat = copaScheduleSelect ? copaScheduleSelect.value : 'single';
            
            const copaTypeSelect = document.getElementById('copa-type-select');
            state.bracketFormatType = copaTypeSelect ? copaTypeSelect.value : 'direct';
            
            const bracketFormatSelect = document.getElementById('bracket-format-select');
            if(bracketFormatSelect) bracketFormatSelect.value = state.knockoutFormat;
        }
        
        state.id = 'T-' + Date.now();
        const inputName = document.getElementById('tournament-name').value.trim();
        state.name = inputName || `Torneo ${state.format.toUpperCase()} - ${new Date().toLocaleDateString()}`;

        state.participants = shuffle(players);
        generateGroups();
        
        if (state.groups.length === 0) {
            state.bracketGenerated = false;
            generateBracket();
            
            btnMenuGroups.classList.add('hidden');
            if (state.format === 'champions' || state.format === 'copa') {
                btnMenuBracket.classList.remove('hidden');
            } else {
                btnMenuBracket.classList.add('hidden');
            }
            
            showView(bracketView);
        } else {
            drawGroups();
            
            btnToBracket.classList.remove('hidden');
            btnMenuGroups.classList.remove('hidden');
            
            if (state.format === 'liga') {
                 btnToBracket.classList.add('hidden'); // Liga has no bracket initially
                 btnMenuBracket.classList.add('hidden');
                 btnMenuSetup.classList.add('hidden');
                 btnMenuGroups.classList.add('hidden');
            } else {
                 if (state.format === 'champions' || state.format === 'copa') {
                     btnMenuBracket.classList.remove('hidden');
                 } else {
                     btnMenuBracket.classList.add('hidden');
                 }
            }
            
            showView(groupsView);
        }
        
        // Guardar automáticamente para generar el código de torneo inmediatamente
        if (typeof saveTournament === 'function') {
            saveTournament();
        }
    });

    function shuffle(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    function generateGroups() {
        const n = state.participants.length;
        const cfg = getFormatConfig(n);
        let gCount = cfg.gCount;

        if (gCount === 0) {
            state.groups = [];
            return;
        }

        const baseSize = Math.floor(n / gCount);
        let remainder = n % gCount;

        const groupSizes = new Array(gCount).fill(baseSize);
        // Add remainders to the LAST groups correlatively
        for (let i = 0; i < remainder; i++) {
            groupSizes[gCount - 1 - i]++;
        }

        state.groups = [];
        let pIndex = 0;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

            const leagueScheduleSelect = document.getElementById('league-schedule-select');
            const leagueTiebreakSelect = document.getElementById('league-tiebreak-select');
            state.leagueSchedule = leagueScheduleSelect ? leagueScheduleSelect.value : 'double';
            state.leagueTiebreak = leagueTiebreakSelect ? leagueTiebreakSelect.value : 'dg';

            for (let i = 0; i < gCount; i++) {
                const size = groupSizes[i];
                const groupTeams = [];
                for (let j = 0; j < size; j++) {
                    groupTeams.push({ id: pIndex, name: state.participants[pIndex] });
                    pIndex++;
                }
                
                // Generate Round Robin matches using Circle Method
                const matches = [];
                const isOdd = groupTeams.length % 2 !== 0;
                let participantsList = [...groupTeams];
                if (isOdd) {
                    participantsList.push({ id: 'BYE', name: 'LIBRE', isBye: true });
                }

                const rounds = participantsList.length - 1;
                const halfSize = participantsList.length / 2;
                let circle = [...participantsList];

                for (let r = 0; r < rounds; r++) {
                    for (let i = 0; i < halfSize; i++) {
                        const home = circle[i];
                        const away = circle[participantsList.length - 1 - i];

                        if (!home.isBye && !away.isBye) {
                            // Alternate home/away slightly
                            const isHomeFirst = (r % 2 === 0);
                            const t1 = isHomeFirst ? home : away;
                            const t2 = isHomeFirst ? away : home;

                            matches.push({
                                id: `G${i}-R${r + 1}-M${t1.id}-${t2.id}`,
                                t1: t1,
                                t2: t2,
                                s1: null,
                                s2: null,
                                round: r + 1
                            });
                        }
                    }
                    // Rotate circle: index 0 stays fixed, rest rotate clockwise
                    circle.splice(1, 0, circle.pop());
                }

                // Append returning leg matches if league double or best_of_3 round robin
                if (state.format === 'liga') {
                    if (state.leagueSchedule === 'double') {
                        const nMatches = matches.length;
                        for (let m = 0; m < nMatches; m++) {
                            const original = matches[m];
                            matches.push({
                                id: original.id + '-V',
                                t1: original.t2, // Reversed home/away
                                t2: original.t1,
                                s1: null,
                                s2: null,
                                round: original.round + rounds
                            });
                        }
                    } else if (state.leagueSchedule === 'best_of_3') {
                        const nMatches = matches.length;
                        for (let m = 0; m < nMatches; m++) {
                            const original = matches[m];
                            // Leg 2
                            matches.push({
                                id: original.id + '-V1',
                                t1: original.t2,
                                t2: original.t1,
                                s1: null,
                                s2: null,
                                round: original.round + rounds
                            });
                            // Leg 3
                            matches.push({
                                id: original.id + '-V2',
                                t1: original.t1,
                                t2: original.t2,
                                s1: null,
                                s2: null,
                                round: original.round + (rounds * 2)
                            });
                        }
                    }
                }

                state.groups.push({
                    id: i,
                    name: `Grupo ${alphabet[i]}`,
                    teams: groupTeams,
                    matches: matches
                });
            }
    }

    function getHeadToHead(matches, idA, idB) {
        let ptsA = 0, ptsB = 0;
        let dgA = 0, dgB = 0;
        let gfA = 0, gfB = 0;
        let played = false;

        matches.forEach(m => {
            if (m.isFinished && m.s1 !== null && m.s2 !== null) {
                const s1 = parseInt(m.s1);
                const s2 = parseInt(m.s2);
                if (m.t1 && m.t2) {
                    if (m.t1.id === idA && m.t2.id === idB) {
                        played = true;
                        gfA += s1; gfB += s2;
                        dgA += (s1 - s2); dgB += (s2 - s1);
                        if (s1 > s2) ptsA += 3;
                        else if (s2 > s1) ptsB += 3;
                        else { ptsA += 1; ptsB += 1; }
                    } else if (m.t1.id === idB && m.t2.id === idA) {
                        played = true;
                        gfB += s1; gfA += s2;
                        dgB += (s1 - s2); dgA += (s2 - s1);
                        if (s1 > s2) ptsB += 3;
                        else if (s2 > s1) ptsA += 3;
                        else { ptsB += 1; ptsA += 1; }
                    }
                }
            }
        });

        if (!played) return 0;
        if (ptsB !== ptsA) return ptsB - ptsA;
        if (dgB !== dgA) return dgB - dgA;
        if (gfB !== gfA) return gfB - gfA;
        return 0;
    }

    // Calculate Table for a group
    function getGroupTable(group) {
        const stats = {};
        group.teams.forEach(t => {
            stats[t.id] = { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, gc: 0, pts: 0 };
        });

        group.matches.forEach(m => {
            if (m.isFinished === undefined && m.s1 !== null && m.s2 !== null) m.isFinished = true; // Retrocompatibilidad
            if (m.isFinished && m.s1 !== null && m.s2 !== null) {
                const s1 = parseInt(m.s1);
                const s2 = parseInt(m.s2);
                const st1 = stats[m.t1.id];
                const st2 = stats[m.t2.id];

                st1.p++; st2.p++;
                st1.gf += s1; st2.gf += s2;
                st1.gc += s2; st2.gc += s1;

                if (s1 > s2) { st1.w++; st2.l++; st1.pts += 3; }
                else if (s1 < s2) { st2.w++; st1.l++; st2.pts += 3; }
                else { st1.d++; st2.d++; st1.pts += 1; st2.pts += 1; }
            }
        });

        const tiebreakRule = state.leagueTiebreak || 'dg';

        return Object.values(stats).map(st => {
            st.dg = st.gf - st.gc;
            // Promedios para comparar posiciones entre grupos de distinto tamaño
            st.ptsAvg = st.p > 0 ? st.pts / st.p : 0;
            st.wAvg = st.p > 0 ? st.w / st.p : 0;
            st.dgAvg = st.p > 0 ? st.dg / st.p : 0;
            st.gfAvg = st.p > 0 ? st.gf / st.p : 0;
            return st;
        }).sort((a, b) => {
            // 1. Puntos totales (quien tenga más puntos SIEMPRE va primero, sin importar PJ)
            if (b.pts !== a.pts) return b.pts - a.pts;

            if (tiebreakRule === 'gf') {
                if (b.gf !== a.gf) return b.gf - a.gf;
                if (b.dg !== a.dg) return b.dg - a.dg;
            } else if (tiebreakRule === 'direct') {
                const h2h = getHeadToHead(group.matches, a.id, b.id);
                if (h2h !== 0) return h2h;
                if (b.dg !== a.dg) return b.dg - a.dg;
                if (b.gf !== a.gf) return b.gf - a.gf;
            } else {
                // 'dg' (predeterminado)
                if (b.dg !== a.dg) return b.dg - a.dg;
                if (b.gf !== a.gf) return b.gf - a.gf;
            }

            // 4. Mayor cantidad de partidos ganados (G)
            if (b.w !== a.w) return b.w - a.w;
            // 5. Menor cantidad de partidos jugados (PJ) si están empatados en todo lo anterior
            return a.p - b.p;
        });
    }

    function drawGroups() {
        groupsContainer.innerHTML = '';

        const groupsMainTitle = document.getElementById('groups-main-title');
        const groupsSubTitle = document.getElementById('groups-sub-title');
        const btnToBracketElement = document.getElementById('btn-to-bracket'); // Fallback direct fetch
        const btnLigaPlayoffsInline = document.getElementById('btn-liga-playoffs-inline');
        const btnN4Semis = document.getElementById('btn-n4-semis');
        const btnN4Final = document.getElementById('btn-n4-final');

        if (btnN4Semis) btnN4Semis.classList.add('hidden');
        if (btnN4Final) btnN4Final.classList.add('hidden');

        if (state.format === 'liga') {
            if (groupsMainTitle) groupsMainTitle.textContent = state.name ? state.name.toUpperCase() : 'LIGA';
            if (groupsSubTitle) groupsSubTitle.textContent = 'TABLA GENERAL';
            
            const group = state.groups.length > 0 ? state.groups[0] : null;
            const allMatchesPlayed = group && group.matches.length > 0 && group.matches.every(m => m.s1 !== null && m.s2 !== null);
            
            if (btnToBracketElement) btnToBracketElement.classList.add('hidden'); // Siempre oculto en liga, usamos btnLigaPlayoffsInline

            if (state.bracketGenerated) {
                if (btnLigaPlayoffsInline) {
                    btnLigaPlayoffsInline.classList.remove('hidden');
                    btnLigaPlayoffsInline.textContent = '🏆 Ver Playoffs';
                }
            } else if (allMatchesPlayed) {
                if (btnLigaPlayoffsInline) {
                    btnLigaPlayoffsInline.classList.remove('hidden');
                    btnLigaPlayoffsInline.textContent = '🏆 Jugar Playoffs';
                }
            } else {
                if (btnLigaPlayoffsInline) btnLigaPlayoffsInline.classList.add('hidden');
            }
        } else {
            if (groupsMainTitle) groupsMainTitle.textContent = 'FASE DE GRUPOS';
            if (groupsSubTitle) groupsSubTitle.textContent = 'RESULTADOS';
            if (btnLigaPlayoffsInline) btnLigaPlayoffsInline.classList.add('hidden');
            
            const group = state.groups.length > 0 ? state.groups[0] : null;
            const allMatchesPlayed = group && group.matches.length > 0 && group.matches.every(m => m.s1 !== null && m.s2 !== null);

            if (state.format === 'champions' && state.participants.length === 4 && allMatchesPlayed && !state.bracketGenerated) {
                if (btnToBracketElement) btnToBracketElement.classList.add('hidden');
                if (btnN4Semis) btnN4Semis.classList.remove('hidden');
                if (btnN4Final) btnN4Final.classList.remove('hidden');
            } else {
                if (btnToBracketElement && state.participants.length > 2) {
                    btnToBracketElement.classList.remove('hidden');
                    btnToBracketElement.textContent = state.bracketGenerated ? 'Ver Playoffs' : 'Ver Fase Eliminatoria';
                }
            }
        }

        // Logic to show floating badge if tournament is ended
        const FloatingBadge = document.getElementById('champion-badge');
        const FloatingBadgeName = document.getElementById('badge-champion-name');
        if (state.format === 'liga' && state.groups.length > 0) {
            const group = state.groups[0];
            const allMatchesPlayed = group.matches.length > 0 && group.matches.every(m => m.s1 !== null && m.s2 !== null);
            if (allMatchesPlayed && FloatingBadge && FloatingBadgeName) {
                const table = getGroupTable(group);
                FloatingBadgeName.textContent = table[0].name;
                FloatingBadge.classList.remove('hidden');
            } else if (FloatingBadge) {
                FloatingBadge.classList.add('hidden');
            }
        } else if (FloatingBadge) {
            FloatingBadge.classList.add('hidden');
        }

        window.updateAppTheme();


        const n = state.participants.length;
        const cfg = getFormatConfig(n);
        const allGroupTables = state.groups.map(g => getGroupTable(g));
        const qualifiersList = getQualifiersFromTables(allGroupTables, cfg);
        
        // Handle Legend UI
        const groupsLegend = document.getElementById('groups-legend');
        const legendWildcard = document.getElementById('legend-wildcard');
        if (groupsLegend && legendWildcard) {
            if (state.format === 'liga') {
                groupsLegend.classList.add('hidden');
            } else {
                groupsLegend.classList.remove('hidden');
                if (cfg.rule === 'top1_and_best_2nds' || cfg.rule === 'best_overall' || (cfg.rule === 'custom' && cfg.bestCount > 0)) {
                    legendWildcard.classList.remove('hidden');
                } else {
                    legendWildcard.classList.add('hidden');
                }
            }
        }

        // create map for fast lookup
        const qualifierMap = {};
        qualifiersList.forEach(q => { qualifierMap[q.id] = q.qualType; });

        state.groups.forEach((group, gIdx) => {
            const tableData = getGroupTable(group);

            const card = document.createElement('div');
            card.className = 'group-card';
            
            let tableHTML = `
                <div class="group-header">${state.format === 'liga' ? state.name + ' - Tabla' : group.name}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Eq</th>
                            <th title="Partidos">PJ</th>
                            <th title="Ganados">G</th>
                            <th title="Empatados">E</th>
                            <th title="Perdidos">P</th>
                            <th title="Goles a Favor">GF</th>
                            <th title="Goles en Contra">GC</th>
                            <th title="Diferencia de Goles">DG</th>
                            <th>PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableData.map((t, idx) => {
                            let trClass = '';
                            if (state.format === 'liga') {
                                const tRank = idx + 1;
                                const tTotal = tableData.length;
                                if (tRank === 1) trClass = 'rank-champion';
                                else if (tRank <= 4) trClass = 'rank-champions';
                                else if (tRank > tTotal - 3 && tTotal >= 10) trClass = 'rank-relegation';
                            } else {
                                if (qualifierMap[t.id] === 'direct') trClass = 'qualifier';
                                else if (qualifierMap[t.id] === 'wildcard') trClass = 'qualifier wildcard';
                            }
                            return `
                            <tr class="${trClass}">
                                <td>${t.name}</td>
                                <td>${t.p}</td>
                                <td>${t.w}</td>
                                <td>${t.d}</td>
                                <td>${t.l}</td>
                                <td>${t.gf}</td>
                                <td>${t.gc}</td>
                                <td>${t.dg > 0 ? '+'+t.dg : t.dg}</td>
                                <td><strong>${t.pts}</strong></td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div class="matches-section">
                    <h4>Partidos</h4>
            `;

            if (state.format === 'liga' && group.matches.length > 0 && group.matches[0].round !== undefined) {
                // Group by round
                const matchesByRound = {};
                group.matches.forEach((m, mIdx) => {
                    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
                    matchesByRound[m.round].push({m, mIdx});
                });
                Object.keys(matchesByRound).sort((a,b)=>a-b).forEach(r => {
                    tableHTML += `<h2 style="text-align:center; color:var(--primary-color); margin: 2rem 0 1rem 0; font-size: 1.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">FECHA ${r}</h2>`;
                    matchesByRound[r].forEach(item => {
                        const m = item.m;
                        const mIdx = item.mIdx;
                        tableHTML += `
                            <div class="match-row" style="position:relative; margin-bottom:0.5rem; padding-bottom:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05);">
                                <div class="match-team">${m.t1.name}</div>
                                <div class="match-score">
                                    <input type="number" min="0" data-g="${gIdx}" data-m="${mIdx}" data-t="s1" value="${m.s1 !== null ? m.s1 : ''}" ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                                    -
                                    <input type="number" min="0" data-g="${gIdx}" data-m="${mIdx}" data-t="s2" value="${m.s2 !== null ? m.s2 : ''}" ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                                </div>
                                <div class="match-team right">${m.t2.name}</div>
                                <button class="btn-match-save" data-g="${gIdx}" data-m="${mIdx}" title="Confirmar/Guardar Resultado" style="background:var(--primary-color); color:#fff; border-radius:4px; border:none; cursor:pointer; font-size:0.8rem; font-weight:bold; padding:0.4rem 0.8rem; margin-left:1rem; opacity:${m.isFinished ? '0' : '1'}; pointer-events:${m.isFinished ? 'none' : 'auto'}; transition:all 0.2s; white-space:nowrap;" ${m.isFinished ? 'disabled' : ''}>GUARDAR</button>
                            </div>
                        `;
                    });
                });
            } else {
                group.matches.forEach((m, mIdx) => {
                    tableHTML += `
                        <div class="match-row" style="position:relative; margin-bottom:0.5rem; padding-bottom:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <div class="match-team">${m.t1.name}</div>
                            <div class="match-score">
                                <input type="number" min="0" data-g="${gIdx}" data-m="${mIdx}" data-t="s1" value="${m.s1 !== null ? m.s1 : ''}" ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                                -
                                <input type="number" min="0" data-g="${gIdx}" data-m="${mIdx}" data-t="s2" value="${m.s2 !== null ? m.s2 : ''}" ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                            </div>
                            <div class="match-team right">${m.t2.name}</div>
                            <button class="btn-match-save" data-g="${gIdx}" data-m="${mIdx}" title="Confirmar/Guardar Resultado" style="background:var(--primary-color); color:#fff; border-radius:4px; border:none; cursor:pointer; font-size:0.8rem; font-weight:bold; padding:0.4rem 0.8rem; margin-left:1rem; opacity:${m.isFinished ? '0' : '1'}; pointer-events:${m.isFinished ? 'none' : 'auto'}; transition:all 0.2s; white-space:nowrap;" ${m.isFinished ? 'disabled' : ''}>GUARDAR</button>
                        </div>
                    `;
                });
            }

            tableHTML += `</div>`;
            card.innerHTML = tableHTML;
            groupsContainer.appendChild(card);
        });

        // Add event listeners for score inputs
        document.querySelectorAll('.match-score input').forEach(input => {
            input.addEventListener('input', (e) => {
                const gIdx = e.target.getAttribute('data-g');
                const mIdx = e.target.getAttribute('data-m');
                const type = e.target.getAttribute('data-t');
                const val = e.target.value === '' ? null : parseInt(e.target.value);
                
                state.groups[gIdx].matches[mIdx][type] = val;
                state.groups[gIdx].matches[mIdx].isFinished = false; // Requiere re-guardado
                
                // Show save button
                const btnSave = document.querySelector(`.btn-match-save[data-g="${gIdx}"][data-m="${mIdx}"]`);
                if (btnSave) {
                    btnSave.style.opacity = '1';
                    btnSave.style.pointerEvents = 'auto';
                    btnSave.disabled = false;
                }
                
                const inputOpposite = document.querySelector(`input[data-g="${gIdx}"][data-m="${mIdx}"][data-t="${type === 's1' ? 's2' : 's1'}"]`);
                if (inputOpposite) { inputOpposite.style.borderColor = 'rgba(255, 255, 255, 0.2)'; }
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';

            });
        });

        // Event listeners for Save buttons
        document.querySelectorAll('.btn-match-save').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gIdx = e.currentTarget.getAttribute('data-g');
                const mIdx = e.currentTarget.getAttribute('data-m');
                const match = state.groups[gIdx].matches[mIdx];
                
                if (match.s1 !== null && match.s2 !== null) {
                    match.isFinished = true;
                    state.bracketGenerated = false;

                    const currentFocus = document.activeElement;
                    let focusInfo = null;
                    if (currentFocus && currentFocus.tagName === 'INPUT') {
                        focusInfo = {g: currentFocus.getAttribute('data-g'), m: currentFocus.getAttribute('data-m'), t: currentFocus.getAttribute('data-t')};
                    }
                    
                    drawGroups();
                    
                    if (focusInfo) {
                        const res = document.querySelector(`input[data-g="${focusInfo.g}"][data-m="${focusInfo.m}"][data-t="${focusInfo.t}"]`);
                        if (res) res.focus();
                    }

                    // Auto-save tournament state to sync in real-time with spectators
                    saveTournament();


                    // Validation for League Champion Celebration
                    if (state.format === 'liga' && state.groups.length > 0) {
                        const group = state.groups[0];
                        const allMatchesPlayed = group.matches.every(m => m.isFinished && m.s1 !== null && m.s2 !== null);
                        if (allMatchesPlayed && !state.celebratedLiga) {
                            state.celebratedLiga = true;
                            
                            // Trigger playoffs transition automatically if playoffs configured
                            if (state.leaguePlayoffFormat && state.leaguePlayoffFormat !== 'none' && !state.bracketGenerated) {
                                runPlayoffsTransition(state.leaguePlayoffQty, state.leaguePlayoffFormat);
                                showToast('🏆 ¡Liga completada! Generando Playoffs automáticamente...');
                            }
                            
                            if (typeof saveTournament === 'function') saveTournament();

                            // Get Champion
                            const table = getGroupTable(group);
                            const champion = table[0]; // Is already sorted inside getGroupTable and drawGroups!
                            
                            const champModal = document.getElementById('champion-modal');
                            const champName = document.getElementById('champion-name');
                            const champSub = document.getElementById('champion-sub');
                            const champDesc = document.getElementById('champion-desc');
                            const btnLigaToCopa = document.getElementById('btn-liga-to-copa');
                            
                            if (champModal && champName) {
                                champName.textContent = champion.name;
                                champModal.classList.remove('hidden');

                                if (state.leaguePlayoffFormat && state.leaguePlayoffFormat !== 'none') {
                                    if (champSub) champSub.textContent = '¡GANADOR DE LA FASE DE LIGA!';
                                    if (champDesc) champDesc.textContent = 'Clasificado como 1° lugar a los Playoffs';
                                    if (btnLigaToCopa) {
                                        btnLigaToCopa.textContent = '🏆 Jugar Playoffs 🏆';
                                        btnLigaToCopa.classList.remove('hidden');
                                    }
                                } else {
                                    if (champSub) champSub.textContent = '¡CAMPEÓN DEFINITIVO!';
                                    if (champDesc) champDesc.textContent = 'Ha conquistado la liga suprema';
                                    if (btnLigaToCopa) btnLigaToCopa.classList.add('hidden');
                                }

                                // Confetti Burst!
                                if (typeof confetti === 'function') {
                                    const duration = 4 * 1000;
                                    const end = Date.now() + duration;

                                    (function frame() {
                                        confetti({
                                            particleCount: 8,
                                            angle: 60,
                                            spread: 80,
                                            origin: { x: 0 },
                                            colors: ['#ffd700', '#ffffff', '#ff4d4d']
                                        });
                                        confetti({
                                            particleCount: 8,
                                            angle: 120,
                                            spread: 80,
                                            origin: { x: 1 },
                                            colors: ['#ffd700', '#ffffff', '#ff4d4d']
                                        });

                                        if (Date.now() < end) {
                                            requestAnimationFrame(frame);
                                        }
                                    }());
                                }
                            }
                        } else if (!allMatchesPlayed && state.celebratedLiga) {
                            state.celebratedLiga = false; // Reset if user clears a score
                        }
                    }

                } else {
                    showToast('Completa el marcador primero');
                }
            });
        });
    }

    // --- BRACKET LOGIC ---
    btnToBracket.addEventListener('click', () => {
        if (state.bracketGenerated) {
            showView(bracketView);
            return;
        }

        if (state.format === 'champions') {
            const allFinished = state.groups.every(g => g.matches.every(m => m.isFinished && m.s1 !== null && m.s2 !== null));
            if (!allFinished) {
                showToast('⚠️ Completa todos los partidos de la fase de grupos primero');
                return;
            }
            const cfg = getFormatConfig(state.participants.length);
            const targetSize = cfg.target;
            const type = state.bracketFormatType || 'direct';
            runPlayoffsTransition(targetSize, type);
            return;
        }

        generateBracket();
        showView(bracketView);
    });

    btnToGroups.addEventListener('click', () => {
        showView(groupsView);
    });

    function generateBracket() {
        if (state.format === 'copa') {
            btnToGroups.classList.add('hidden');
        } else {
            btnToGroups.classList.remove('hidden');
        }

        const n = state.participants.length;
        const cfg = getFormatConfig(n);
        let targetSize = cfg.target;

        let qualified = [];
        if (cfg.rule === 'direct') {
            // Direct elimination, skip groups logic
            qualified = state.participants.map((p, i) => ({
                id: i, name: p, ptsAvg:0, dgAvg:0, gfAvg:0, qualType: 'direct'
            }));
        } else if (cfg.rule === 'triangular') {
            bracketContainer.innerHTML = '<h3 style="color:var(--accent-silver);text-align:center;margin-top:4rem;font-size:2rem;line-height:1.5;">🏆<br><br>El Formato Triangular no tiene fase eliminatoria.<br>El líder de la fase de grupos es el Campeón.</h3>';
            return;
        } else {
            const groupTables = state.groups.map(g => getGroupTable(g));
            qualified = getQualifiersFromTables(groupTables, cfg);
        }

        // Failsafe resize (should be exact due to getQualifiersFromTables)
        if (qualified.length !== targetSize) {
            qualified = qualified.slice(0, targetSize);
        }

        state.bracketRounds = [];
        
        if (state.bracketFormatType === 'advantage' && targetSize >= 4) {
            generateAdvantageBracket(qualified, targetSize);
            drawBracket();
            return;
        }

        const roundsCount = Math.log2(targetSize);

        for(let r=0; r<roundsCount; r++) {
            const matchesInRound = targetSize / Math.pow(2, r+1);
            const roundMatches = [];
            for(let m=0; m<matchesInRound; m++) {
                roundMatches.push({
                    id: `R${r}-M${m}`,
                    t1: null, t2: null,
                    s1: null, s2: null,     // Ida or Single
                    s1_v: null, s2_v: null, // Vuelta
                    p1: null, p2: null,     // Penalties
                    nextMatchId: r < roundsCount - 1 ? `R${r+1}-M${Math.floor(m/2)}` : null,
                    nextMatchPos: m % 2 === 0 ? 't1' : 't2'
                });
            }
            state.bracketRounds.push(roundMatches);
        }

        function getBracketOrder(numTeams) {
            if (numTeams === 2) return [1, 2];
            const half = getBracketOrder(numTeams / 2);
            const res = [];
            half.forEach(seed => {
                res.push(seed);
                res.push(numTeams - seed + 1);
            });
            return res;
        }

        const seedOrder = getBracketOrder(targetSize);
        for (let i = 0; i < targetSize / 2; i++) {
            const t1Rank = seedOrder[i * 2] - 1;
            const t2Rank = seedOrder[i * 2 + 1] - 1;
            state.bracketRounds[0][i].t1 = qualified[t1Rank] || null;
            state.bracketRounds[0][i].t2 = qualified[t2Rank] || null;
        }

        drawBracket();
    }

    function getIndividualMatchWinner(s1, s2, p1, p2) {
        if (s1 === null || s2 === null) return null;
        const n1 = parseInt(s1);
        const n2 = parseInt(s2);
        if (n1 > n2) return 1;
        if (n2 > n1) return 2;
        if (p1 !== null && p2 !== null) {
            const pen1 = parseInt(p1);
            const pen2 = parseInt(p2);
            if (pen1 > pen2) return 1;
            if (pen2 > pen1) return 2;
        }
        return 'tie';
    }

    function checkMatchWinner(match) {
        if (match.isFinished === undefined && match.s1 !== null && match.s2 !== null) match.isFinished = true; // Retro
        if (!match.isFinished) return null;
        
        let g1 = 0, g2 = 0;
        let isComplete = false;
        
        if (state.knockoutFormat === 'single') {
            if (match.s1 !== null && match.s2 !== null) {
                isComplete = true;
                g1 = match.s1;
                g2 = match.s2;
            }
        } else if (state.knockoutFormat === 'best_of_3') {
            const w1 = getIndividualMatchWinner(match.s1, match.s2, match.p1_1, match.p2_1);
            const w2 = getIndividualMatchWinner(match.s1_v, match.s2_v, match.p1_2, match.p2_2);
            const w3 = getIndividualMatchWinner(match.s1_m3, match.s2_m3, match.p1_3, match.p2_3);

            let wins1 = 0, wins2 = 0;
            if (w1 === 1) wins1++; else if (w1 === 2) wins2++;
            if (w2 === 1) wins1++; else if (w2 === 2) wins2++;
            if (w3 === 1) wins1++; else if (w3 === 2) wins2++;

            if (wins1 >= 2) return match.t1;
            if (wins2 >= 2) return match.t2;

            if (w1 === 'tie' || w2 === 'tie' || w3 === 'tie') {
                return 'tie';
            }

            if (w1 !== null && w2 !== null && w3 !== null) {
                if (wins1 > wins2) return match.t1;
                if (wins2 > wins1) return match.t2;
                return 'tie';
            }
            return null;
        } else {
            if (match.s1 !== null && match.s2 !== null && match.s1_v !== null && match.s2_v !== null) {
                isComplete = true;
                g1 = match.s1 + match.s1_v;
                g2 = match.s2 + match.s2_v;
            }
        }

        if (!isComplete) return null;

        if (g1 > g2) return match.t1;
        if (g2 > g1) return match.t2;

        // Tie breaker -> Penalties
        if (match.p1 !== null && match.p2 !== null && match.p1 !== match.p2) {
            return match.p1 > match.p2 ? match.t1 : match.t2;
        }

        return 'tie'; // indicates it's a tie
    }

    function createMatchDOMElement(m, rIdx, mIdx) {
        const matchDiv = document.createElement('div');
        matchDiv.className = 'bracket-match';
        
        let calculatedTitle = 'Ronda';
        const round = state.bracketRounds[rIdx];
        const roundLen = round.length;
        if (roundLen === 1) calculatedTitle = 'Final';
        else if (roundLen === 2) calculatedTitle = 'Semifinal';
        else if (roundLen === 4) calculatedTitle = 'Cuartos de final';
        else if (roundLen === 8) calculatedTitle = 'Octavos de final';
        else if (roundLen === 16) calculatedTitle = '16avos de final';
        else if (roundLen === 32) calculatedTitle = '32avos de final';

        const phaseLabel = document.createElement('div');
        phaseLabel.style.fontSize = '0.75rem';
        phaseLabel.style.color = '#FFD700';
        phaseLabel.style.textAlign = 'center';
        phaseLabel.style.marginBottom = '0.6rem';
        phaseLabel.style.textTransform = 'uppercase';
        phaseLabel.style.letterSpacing = '1px';
        phaseLabel.style.fontWeight = 'bold';
        phaseLabel.textContent = m.phase || calculatedTitle;
        matchDiv.appendChild(phaseLabel);
        
        const winnerObj = checkMatchWinner(m);
        const isTie = winnerObj === 'tie';
        const isDouble = state.knockoutFormat === 'double';
        const isBestOf3 = state.knockoutFormat === 'best_of_3';

        const w1 = getIndividualMatchWinner(m.s1, m.s2, m.p1_1, m.p2_1);
        const w2 = getIndividualMatchWinner(m.s1_v, m.s2_v, m.p1_2, m.p2_2);
        const showP3 = isBestOf3 && !((w1 === 1 && w2 === 1) || (w1 === 2 && w2 === 2));

        let showPenalties = !isBestOf3 && (isTie || m.p1 !== null || m.p2 !== null);

        let html = `
            <div class="bracket-team ${winnerObj !== null && winnerObj !== 'tie' && winnerObj.id === (m.t1 && m.t1.id) ? 'winner' : ''}">
                <span class="bracket-team-name">${m.t1 ? m.t1.name : 'TBD'}</span>
                <div class="bracket-score">
                    <div class="score-box">
                        ${isDouble ? '<label>Ida</label>' : (isBestOf3 ? '<label>P1</label>' : '')}
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="s1" value="${m.s1 !== null ? m.s1 : ''}" ${!m.t1 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                    </div>
                    ${isBestOf3 && m.s1 !== null && m.s2 !== null && parseInt(m.s1) === parseInt(m.s2) ? `
                    <div class="score-box">
                        <label style="color:#FFD700">PEN</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="p1_1" value="${m.p1_1 !== null ? m.p1_1 : ''}" style="color:#FFD700; border-color:#FFD700;" ${!m.t1 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71; color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                    ${isDouble ? `
                    <div class="score-box">
                        <label>Vta</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="s1_v" value="${m.s1_v !== null ? m.s1_v : ''}" ${!m.t1 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                    ${isBestOf3 ? `
                    <div class="score-box">
                        <label>P2</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="s1_v" value="${m.s1_v !== null ? m.s1_v : ''}" ${!m.t1 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                    </div>
                    ${m.s1_v !== null && m.s2_v !== null && parseInt(m.s1_v) === parseInt(m.s2_v) ? `
                    <div class="score-box">
                        <label style="color:#FFD700">PEN</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="p1_2" value="${m.p1_2 !== null ? m.p1_2 : ''}" style="color:#FFD700; border-color:#FFD700;" ${!m.t1 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71; color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                    ${showP3 ? `
                    <div class="score-box">
                        <label>P3</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="s1_m3" value="${m.s1_m3 !== null ? m.s1_m3 : ''}" ${!m.t1 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                    </div>
                    ${m.s1_m3 !== null && m.s2_m3 !== null && parseInt(m.s1_m3) === parseInt(m.s2_m3) ? `
                    <div class="score-box">
                        <label style="color:#FFD700">PEN</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="p1_3" value="${m.p1_3 !== null ? m.p1_3 : ''}" style="color:#FFD700; border-color:#FFD700;" ${!m.t1 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71; color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                    ` : ''}
                    ` : ''}
                    ${showPenalties ? `
                    <div class="score-box">
                        <label style="color:#FFD700">PEN</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="p1" value="${m.p1 !== null ? m.p1 : ''}" style="color:#FFD700; border-color:#FFD700;" ${!m.t1 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71; color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="bracket-team-separator"></div>
            <div class="bracket-team ${winnerObj !== null && winnerObj !== 'tie' && winnerObj.id === (m.t2 && m.t2.id) ? 'winner' : ''}">
                <span class="bracket-team-name">${m.t2 ? m.t2.name : 'TBD'}</span>
                <div class="bracket-score">
                    <div class="score-box">
                        ${isDouble ? '<label>Ida</label>' : (isBestOf3 ? '<label>P1</label>' : '')}
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="s2" value="${m.s2 !== null ? m.s2 : ''}" ${!m.t2 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                    </div>
                    ${isBestOf3 && m.s1 !== null && m.s2 !== null && parseInt(m.s1) === parseInt(m.s2) ? `
                    <div class="score-box">
                        <label style="color:#FFD700">PEN</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="p2_1" value="${m.p2_1 !== null ? m.p2_1 : ''}" style="color:#FFD700; border-color:#FFD700;" ${!m.t2 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71; color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                    ${isDouble ? `
                    <div class="score-box">
                        <label>Vta</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="s2_v" value="${m.s2_v !== null ? m.s2_v : ''}" ${!m.t2 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                    ${isBestOf3 ? `
                    <div class="score-box">
                        <label>P2</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="s2_v" value="${m.s2_v !== null ? m.s2_v : ''}" ${!m.t2 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                    </div>
                    ${m.s1_v !== null && m.s2_v !== null && parseInt(m.s1_v) === parseInt(m.s2_v) ? `
                    <div class="score-box">
                        <label style="color:#FFD700">PEN</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="p2_2" value="${m.p2_2 !== null ? m.p2_2 : ''}" style="color:#FFD700; border-color:#FFD700;" ${!m.t2 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71; color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                    ${showP3 ? `
                    <div class="score-box">
                        <label>P3</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="s2_m3" value="${m.s2_m3 !== null ? m.s2_m3 : ''}" ${!m.t2 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71;"' : ''}>
                    </div>
                    ${m.s1_m3 !== null && m.s2_m3 !== null && parseInt(m.s1_m3) === parseInt(m.s2_m3) ? `
                    <div class="score-box">
                        <label style="color:#FFD700">PEN</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="p2_3" value="${m.p2_3 !== null ? m.p2_3 : ''}" style="color:#FFD700; border-color:#FFD700;" ${!m.t2 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71; color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                    ` : ''}
                    ` : ''}
                    ${showPenalties ? `
                    <div class="score-box">
                        <label style="color:#FFD700">PEN</label>
                        <input type="number" min="0" data-r="${rIdx}" data-m="${mIdx}" data-t="p2" value="${m.p2 !== null ? m.p2 : ''}" style="color:#FFD700; border-color:#FFD700;" ${!m.t2 ? 'disabled' : ''} ${m.isFinished ? 'style="border-color:#2ecc71; color:#2ecc71;"' : ''}>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div style="text-align:center; margin-top:0.8rem; overflow:hidden; transition:max-height 0.3s;" style="max-height:${m.isFinished ? '0' : '40px'};">
                <button class="btn-bracket-save" data-r="${rIdx}" data-m="${mIdx}" title="Confirmar Resultado" style="background:var(--primary-color); color:#fff; border-radius:4px; border:none; font-size:0.8rem; font-weight:bold; padding:0.4rem 1.2rem; cursor:pointer; opacity:${m.isFinished ? '0' : '1'}; pointer-events:${m.isFinished ? 'none' : 'auto'}; width:90%; box-shadow:0 4px 10px rgba(0,0,0,0.3);" ${m.isFinished ? 'disabled' : ''}>GUARDAR MARCADOR</button>
            </div>
        `;
        matchDiv.innerHTML += html;
        return matchDiv;
    }

    function drawBracket() {
        if (state.format === 'copa') {
            btnToGroups.classList.add('hidden');
        } else {
            btnToGroups.classList.remove('hidden');
            if (state.format === 'liga') {
                btnToGroups.textContent = 'Volver a la tabla';
            } else {
                btnToGroups.textContent = 'Volver a Grupos';
            }
        }
        
        bracketContainer.innerHTML = '';
        if (!state.bracketRounds) return;

        if (state.bracketFormatType === 'advantage') {
            // RENDER UNIFIED DOUBLE ELIMINATION BRACKET (UPPER & LOWER ALIGNED)
            bracketContainer.style.display = 'flex';
            bracketContainer.style.flexDirection = 'row';
            bracketContainer.style.gap = '2.5rem';
            bracketContainer.style.width = ''; // allow natural scrolling
            bracketContainer.style.padding = '1rem';
            bracketContainer.style.alignItems = 'stretch';

            state.bracketRounds.forEach((round, rIdx) => {
                const winnerMatches = round.filter(m => m.bracket === 'winner');
                const loserMatches = round.filter(m => m.bracket === 'loser');
                const finalMatches = round.filter(m => m.bracket === 'final');

                const col = document.createElement('div');
                col.className = 'bracket-column';
                col.style.display = 'flex';
                col.style.flexDirection = 'column';
                col.style.gap = '2rem';
                col.style.minWidth = '300px';

                // Column Header
                let colTitle = `Ronda ${rIdx + 1}`;
                if (finalMatches.length > 0) {
                    colTitle = '👑 Gran Final';
                } else if (rIdx === state.bracketRounds.length - 2) {
                    const hasLoserFinal = loserMatches.some(m => m.phase === 'Final Loser Bracket');
                    if (hasLoserFinal) colTitle = '🔥 Final Repechaje';
                }

                const colHeader = document.createElement('h3');
                colHeader.style.color = 'var(--text-main)';
                colHeader.style.textAlign = 'center';
                colHeader.style.marginBottom = '0.5rem';
                colHeader.style.fontSize = '1.1rem';
                colHeader.style.fontWeight = 'bold';
                colHeader.style.letterSpacing = '1px';
                colHeader.style.textTransform = 'uppercase';
                colHeader.textContent = colTitle;
                col.appendChild(colHeader);

                // 1. Winner Matches Box
                if (winnerMatches.length > 0) {
                    const winnerBox = document.createElement('div');
                    winnerBox.className = 'winner-bracket-box';
                    winnerBox.style.background = 'rgba(0, 240, 255, 0.03)';
                    winnerBox.style.border = '1px solid rgba(0, 240, 255, 0.15)';
                    winnerBox.style.borderRadius = '8px';
                    winnerBox.style.padding = '1rem 0.5rem';
                    winnerBox.style.display = 'flex';
                    winnerBox.style.flexDirection = 'column';
                    winnerBox.style.gap = '1.5rem';
                    winnerBox.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                    
                    const label = document.createElement('div');
                    label.style.color = '#00F0FF';
                    label.style.fontSize = '0.75rem';
                    label.style.fontWeight = 'bold';
                    label.style.textAlign = 'center';
                    label.style.letterSpacing = '1px';
                    label.style.marginBottom = '0.5rem';
                    label.textContent = '🏆 CUADRO PRINCIPAL';
                    winnerBox.appendChild(label);

                    winnerMatches.forEach((m) => {
                        const mIdx = round.indexOf(m);
                        const matchDiv = createMatchDOMElement(m, rIdx, mIdx);
                        winnerBox.appendChild(matchDiv);
                    });
                    col.appendChild(winnerBox);
                } else if (finalMatches.length === 0) {
                    // Spacer to keep vertical alignment for columns without winner matches
                    const spacer = document.createElement('div');
                    spacer.style.flex = '1';
                    col.appendChild(spacer);
                }

                // 2. Loser Matches Box
                if (loserMatches.length > 0) {
                    const loserBox = document.createElement('div');
                    loserBox.className = 'loser-bracket-box';
                    loserBox.style.background = 'rgba(255, 77, 77, 0.03)';
                    loserBox.style.border = '1px solid rgba(255, 77, 77, 0.15)';
                    loserBox.style.borderRadius = '8px';
                    loserBox.style.padding = '1rem 0.5rem';
                    loserBox.style.display = 'flex';
                    loserBox.style.flexDirection = 'column';
                    loserBox.style.gap = '1.5rem';
                    loserBox.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                    
                    const label = document.createElement('div');
                    label.style.color = '#ff4d4d';
                    label.style.fontSize = '0.75rem';
                    label.style.fontWeight = 'bold';
                    label.style.textAlign = 'center';
                    label.style.letterSpacing = '1px';
                    label.style.marginBottom = '0.5rem';
                    label.textContent = '☠️ REPECHAJE';
                    loserBox.appendChild(label);

                    loserMatches.forEach((m) => {
                        const mIdx = round.indexOf(m);
                        const matchDiv = createMatchDOMElement(m, rIdx, mIdx);
                        loserBox.appendChild(matchDiv);
                    });
                    col.appendChild(loserBox);
                }

                // 3. Final Match Box
                if (finalMatches.length > 0) {
                    const finalBox = document.createElement('div');
                    finalBox.className = 'final-bracket-box';
                    finalBox.style.background = 'rgba(255, 215, 0, 0.04)';
                    finalBox.style.border = '2px solid #FFD700';
                    finalBox.style.borderRadius = '12px';
                    finalBox.style.padding = '1.5rem 1rem';
                    finalBox.style.display = 'flex';
                    finalBox.style.flexDirection = 'column';
                    finalBox.style.gap = '1.5rem';
                    finalBox.style.alignItems = 'center';
                    finalBox.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.1)';
                    
                    const label = document.createElement('div');
                    label.style.color = '#FFD700';
                    label.style.fontSize = '0.85rem';
                    label.style.fontWeight = 'bold';
                    label.style.textAlign = 'center';
                    label.style.letterSpacing = '2px';
                    label.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.4)';
                    label.textContent = '👑 GRAN FINAL';
                    finalBox.appendChild(label);

                    finalMatches.forEach((m) => {
                        const mIdx = round.indexOf(m);
                        const matchDiv = createMatchDOMElement(m, rIdx, mIdx);
                        finalBox.appendChild(matchDiv);
                    });
                    col.appendChild(finalBox);

                    // Add Champion card inside the final column if determined
                    const finalMatch = finalMatches[0];
                    const champion = checkMatchWinner(finalMatch);
                    if (champion && champion !== 'tie') {
                        const champCardDiv = document.createElement('div');
                        champCardDiv.className = 'champion-column';
                        champCardDiv.style.borderLeft = 'none';
                        champCardDiv.style.paddingLeft = '0';
                        champCardDiv.style.marginLeft = '0';
                        champCardDiv.style.marginTop = '1rem';
                        champCardDiv.style.width = '100%';
                        champCardDiv.innerHTML = `
                            <h3 style="color:#FFD700;text-align:center;margin-bottom:1rem;text-shadow: 0 0 15px gold; font-size: 1.1rem; font-weight:bold; letter-spacing:1px; animation: pulse 2.5s infinite;">🏆 CAMPEÓN DEFINITIVO 🏆</h3>
                            <div class="champion-card" style="background:linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(245, 127, 23, 0.15)); border:2px solid #FFD700; box-shadow:0 0 20px rgba(255,215,0,0.25); border-radius:12px; padding:1.5rem; text-align:center; min-height:auto; min-width:auto;">
                                <h2 style="color:#fff; margin:0; font-size:1.5rem; font-family:\'Outfit\', sans-serif; letter-spacing:1px; text-shadow:0 2px 4px rgba(0,0,0,0.5);">${champion.name}</h2>
                            </div>
                        `;
                        col.appendChild(champCardDiv);
                    }
                }

                bracketContainer.appendChild(col);
            });
        } else {
            // RENDER STANDARD SINGLE/DOUBLE ELIMINATION
            bracketContainer.style.display = 'flex';
            bracketContainer.style.flexDirection = 'row';
            bracketContainer.style.gap = '1.5rem';
            bracketContainer.style.width = '';
            
            state.bracketRounds.forEach((round, rIdx) => {
                const col = document.createElement('div');
                col.className = 'bracket-column';
                
                let title = 'Ronda';
                if (round.length === 1) title = 'Final';
                else if (round.length === 2) title = 'Semifinal';
                else if (round.length === 4) title = 'Cuartos de final';
                else if (round.length === 8) title = 'Octavos de final';
                else if (round.length === 16) title = '16avos de final';
                else if (round.length === 32) title = '32avos de final';

                const h3 = document.createElement('h3');
                h3.style.color = 'var(--accent-silver)';
                h3.style.textAlign = 'center';
                h3.style.marginBottom = '2rem';
                h3.textContent = title;
                col.appendChild(h3);

                const wrapper = document.createElement('div');
                wrapper.className = 'matches-wrapper';

                round.forEach((m, mIdx) => {
                    const matchDiv = createMatchDOMElement(m, rIdx, mIdx);
                    wrapper.appendChild(matchDiv);
                });
                col.appendChild(wrapper);
                bracketContainer.appendChild(col);
            });

            // Add Champion Column if final has a winner
            if (state.bracketRounds.length > 0) {
                const finalRound = state.bracketRounds[state.bracketRounds.length - 1];
                if (finalRound && finalRound.length === 1) {
                    const finalMatch = finalRound[0];
                    const champion = checkMatchWinner(finalMatch);
                    if (champion && champion !== 'tie') {
                        const col = document.createElement('div');
                        col.className = 'bracket-column champion-column';
                        col.innerHTML = `
                            <h3 style="color:var(--text-main);text-align:center;margin-bottom:2rem;text-shadow: 0 0 10px gold; font-size: 1.5rem;">🏆 CAMPEÓN 🏆</h3>
                            <div class="champion-card">
                                <h2>${champion.name}</h2>
                            </div>
                        `;
                        bracketContainer.appendChild(col);
                    }
                }
            }
        }


        document.querySelectorAll('.bracket-score input').forEach(input => {
            input.addEventListener('input', (e) => {
                const rIdx = parseInt(e.target.getAttribute('data-r'));
                const mIdx = parseInt(e.target.getAttribute('data-m'));
                const type = e.target.getAttribute('data-t');
                const val = e.target.value === '' ? null : parseInt(e.target.value);
                
                const match = state.bracketRounds[rIdx][mIdx];
                match[type] = val;
                match.isFinished = false;

                // Si el partido ya no esta empatado o se borra un puntaje, limpiar penales correspondientes
                if (match.s1 === null || match.s2 === null || parseInt(match.s1) !== parseInt(match.s2)) {
                    match.p1_1 = null; match.p2_1 = null;
                }
                if (match.s1_v === null || match.s2_v === null || parseInt(match.s1_v) !== parseInt(match.s2_v)) {
                    match.p1_2 = null; match.p2_2 = null;
                }
                if (match.s1_m3 === null || match.s2_m3 === null || parseInt(match.s1_m3) !== parseInt(match.s2_m3)) {
                    match.p1_3 = null; match.p2_3 = null;
                }
                if (state.knockoutFormat === 'best_of_3') {
                    const w1 = getIndividualMatchWinner(match.s1, match.s2, match.p1_1, match.p2_1);
                    const w2 = getIndividualMatchWinner(match.s1_v, match.s2_v, match.p1_2, match.p2_2);
                    if ((w1 === 1 && w2 === 1) || (w1 === 2 && w2 === 2)) {
                        match.s1_m3 = null; match.s2_m3 = null;
                        match.p1_3 = null; match.p2_3 = null;
                    }
                }
                if (type.startsWith('s') && val === null) {
                    match.p1 = null; match.p2 = null;
                }
                
                pushWinnerToNextRound(rIdx, mIdx, null, null);

                // Show save button correctly
                const currentFocus = {r: rIdx, m: mIdx, t: type};
                drawBracket();
                
                const res = document.querySelector(`input[data-r="${currentFocus.r}"][data-m="${currentFocus.m}"][data-t="${currentFocus.t}"]`);
                if (res) res.focus();
            });
        });

        document.querySelectorAll('.btn-bracket-save').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rIdx = parseInt(e.currentTarget.getAttribute('data-r'));
                const mIdx = parseInt(e.currentTarget.getAttribute('data-m'));
                const match = state.bracketRounds[rIdx][mIdx];
                
                // Allow finish if single, double, or best_of_3 have required fields
                let isComplete = false;
                if (state.knockoutFormat === 'single') {
                    if (match.s1 !== null && match.s2 !== null) isComplete = true;
                } else if (state.knockoutFormat === 'best_of_3') {
                    const w1 = getIndividualMatchWinner(match.s1, match.s2, match.p1_1, match.p2_1);
                    const w2 = getIndividualMatchWinner(match.s1_v, match.s2_v, match.p1_2, match.p2_2);
                    const w3 = getIndividualMatchWinner(match.s1_m3, match.s2_m3, match.p1_3, match.p2_3);

                    let wins1 = 0, wins2 = 0;
                    if (w1 === 1) wins1++; else if (w1 === 2) wins2++;
                    if (w2 === 1) wins1++; else if (w2 === 2) wins2++;
                    if (w3 === 1) wins1++; else if (w3 === 2) wins2++;

                    if (wins1 >= 2 || wins2 >= 2) {
                        isComplete = true;
                    } else if (w1 !== null && w1 !== 'tie' && w2 !== null && w2 !== 'tie' && w3 !== null && w3 !== 'tie') {
                        isComplete = true;
                    }
                } else {
                    if (match.s1 !== null && match.s2 !== null && match.s1_v !== null && match.s2_v !== null) isComplete = true;
                }

                if (isComplete) {
                    match.isFinished = true;
                    
                    const winner = checkMatchWinner(match);
                    if (winner === 'tie' || winner === null) {
                        pushWinnerToNextRound(rIdx, mIdx, null, null);
                    } else {
                        const loser = (winner.id === (match.t1 && match.t1.id)) ? match.t2 : match.t1;
                        pushWinnerToNextRound(rIdx, mIdx, winner, loser);
                    }

                    const currentFocus = document.activeElement;
                    let focusInfo = null;
                    if (currentFocus && currentFocus.tagName === 'INPUT') {
                        focusInfo = {r: currentFocus.getAttribute('data-r'), m: currentFocus.getAttribute('data-m'), t: currentFocus.getAttribute('data-t')};
                    }

                    drawBracket();
                    
                    if (focusInfo) {
                        const res = document.querySelector(`input[data-r="${focusInfo.r}"][data-m="${focusInfo.m}"][data-t="${focusInfo.t}"]`);
                        if (res) res.focus();
                    }

                    // Auto-save tournament state to sync in real-time with spectators
                    saveTournament();


                    // Validation for Copa/Bracket Champion Celebration & Auto-Save
                    const finalRound = state.bracketRounds[state.bracketRounds.length - 1];
                    if (finalRound && finalRound.length === 1) {
                        const finalMatch = finalRound[0];
                        if (finalMatch.isFinished) {
                            const champion = checkMatchWinner(finalMatch);
                            if (champion && champion !== 'tie' && !state.celebratedCopa) {
                                state.celebratedCopa = true;
                                if (typeof saveTournament === 'function') saveTournament();

                                const champModal = document.getElementById('champion-modal');
                                const champName = document.getElementById('champion-name');
                                const btnLigaToCopa = document.getElementById('btn-liga-to-copa');
                                if (champModal && champName) {
                                    champName.textContent = champion.name;
                                    champModal.classList.remove('hidden');
                                    if (btnLigaToCopa) btnLigaToCopa.classList.add('hidden'); // Ensure hidden in Copa

                                    if (typeof confetti === 'function') {
                                        const duration = 4 * 1000;
                                        const end = Date.now() + duration;
                                        (function frame() {
                                            confetti({ particleCount: 8, angle: 60, spread: 80, origin: { x: 0 }, colors: ['#ffd700', '#ffffff', '#ff4d4d'] });
                                            confetti({ particleCount: 8, angle: 120, spread: 80, origin: { x: 1 }, colors: ['#ffd700', '#ffffff', '#ff4d4d'] });
                                            if (Date.now() < end) requestAnimationFrame(frame);
                                        }());
                                    }
                                }
                            }
                        } else if (!finalMatch.isFinished && state.celebratedCopa) {
                            state.celebratedCopa = false;
                        }
                    }

                } else {
                    showToast('Completa todo el marcador primero');
                }
            });
        });
    }

    function pushWinnerToNextRound(rIdx, mIdx, winnerTeam, loserTeam = null) {
        const match = state.bracketRounds[rIdx][mIdx];
        if (!match) return;
        
        // Propagate Winner
        if (match.nextMatchId) {
            const nextParts = match.nextMatchId.split('-');
            const nextR = parseInt(nextParts[0].substring(1));
            const nextM = parseInt(nextParts[1].substring(1));
            const nextMatch = state.bracketRounds[nextR] ? state.bracketRounds[nextR][nextM] : null;
            if (nextMatch) {
                const prevTeam = nextMatch[match.nextMatchPos];
                if (prevTeam !== winnerTeam) {
                    nextMatch[match.nextMatchPos] = winnerTeam;
                    nextMatch.s1 = null; nextMatch.s2 = null;
                    nextMatch.s1_v = null; nextMatch.s2_v = null;
                    nextMatch.p1 = null; nextMatch.p2 = null;
                    nextMatch.isFinished = false;
                    pushWinnerToNextRound(nextR, nextM, null, null);
                }
            }
        }
        
        // Propagate Loser
        if (match.nextLoserMatchId) {
            const nextParts = match.nextLoserMatchId.split('-');
            const nextR = parseInt(nextParts[0].substring(1));
            const nextM = parseInt(nextParts[1].substring(1));
            const nextMatch = state.bracketRounds[nextR] ? state.bracketRounds[nextR][nextM] : null;
            if (nextMatch) {
                const prevTeam = nextMatch[match.nextLoserMatchPos];
                if (prevTeam !== loserTeam) {
                    nextMatch[match.nextLoserMatchPos] = loserTeam;
                    nextMatch.s1 = null; nextMatch.s2 = null;
                    nextMatch.s1_v = null; nextMatch.s2_v = null;
                    nextMatch.p1 = null; nextMatch.p2 = null;
                    nextMatch.isFinished = false;
                    pushWinnerToNextRound(nextR, nextM, null, null);
                }
            }
        }
    }

    async function shareTournamentLink() {
        if (!state.format || state.participants.length === 0) {
            showToast('No hay ningún torneo activo para compartir ⚠️');
            return;
        }

        if (state.isSpectator && state.shareCode) {
            const joinUrl = `${window.location.origin}${window.location.pathname}?join=${state.shareCode}`;
            navigator.clipboard.writeText(joinUrl).then(() => {
                showToast('¡Enlace de Espectador copiado! 👁️📋');
            }).catch(err => {
                showToast(`Código del Torneo: ${state.shareCode} 🔑`);
            });
            return;
        }

        // Save tournament state to the cloud to get fresh shareCode
        showToast('Generando enlace para compartir... ⏳');
        await saveTournament();

        if (state.shareCode) {
            const joinUrl = `${window.location.origin}${window.location.pathname}?join=${state.shareCode}`;
            navigator.clipboard.writeText(joinUrl).then(() => {
                showToast('¡Enlace copiado! Envíalo a tus amigos 🔗📋');
            }).catch(err => {
                showToast(`Código del Torneo: ${state.shareCode} 🔑`);
            });
        } else {
            showToast('No se pudo generar el código de compartición ⚠️');
        }
    }

    // DOWNLOAD & IMPORT LOGIC
    function downloadTournamentData() {
        if (!state.format || state.participants.length === 0) {
            showToast('No hay ningún torneo activo para descargar ⚠️');
            return;
        }
        if (!state.id) state.id = 'T-' + Date.now();
        if (!state.name) {
            const inputName = document.getElementById('tournament-name').value.trim();
            state.name = inputName || `Torneo ${state.format.toUpperCase()} - ${new Date().toLocaleDateString()}`;
        }
        state.lastSaved = new Date().toLocaleString();
        
        // Save to localStorage too so their downloaded copy is synced with local state
        let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
        const existingIdx = stored.findIndex(t => t.id === state.id);
        if (existingIdx >= 0) {
            stored[existingIdx] = state;
        } else {
            stored.push(state);
        }
        localStorage.setItem('torneos-fc-data', JSON.stringify(stored));
        if (typeof initHome === 'function') initHome();
        if (typeof renderSavedTournaments === 'function') renderSavedTournaments();

        // Encode state safely into UTF-8 Base64 string
        const stateJson = JSON.stringify(state);
        const base64Data = btoa(unescape(encodeURIComponent(stateJson)));
        const redirectDomain = window.location.origin + window.location.pathname;

        // Build self-extracting HTML file
        const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cargando Torneo: ${state.name} - Torneos FC</title>
    <style>
        body {
            background-color: #060B19;
            color: #ffffff;
            font-family: 'Inter', -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }
        .container {
            padding: 2.5rem 2rem;
            background: rgba(20, 30, 60, 0.6);
            border: 1px solid rgba(0, 240, 255, 0.2);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            max-width: 400px;
            width: 90%;
        }
        .trophy {
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: bounce 2s infinite;
        }
        .spinner {
            border: 4px solid rgba(255,255,255,0.1);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border-left-color: #00F0FF;
            animation: spin 1s linear infinite;
            margin: 1.5rem auto;
        }
        h2 { margin: 0 0 0.5rem 0; color: #00F0FF; font-weight: 600; }
        p { color: #9BA4B5; margin: 0; font-size: 0.9rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    </style>
</head>
<body>
    <!-- #import=${base64Data} -->
    <div class="container">
        <div class="trophy">🏆</div>
        <h2>Torneos FC</h2>
        <p>Cargando e importando tu torneo automáticamente...</p>
        <div class="spinner"></div>
        <p style="font-size: 0.8rem; opacity: 0.7;">Redireccionando a la aplicación...</p>
    </div>
    <script>
        setTimeout(() => {
            window.location.href = "${redirectDomain}#import=${base64Data}";
        }, 800);
    </script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const cleanName = (state.name || 'torneo').toLowerCase().replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');
        a.download = `${cleanName}-${state.shareCode || state.id}.html`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Torneo descargado con éxito 📥');
    }

    function importTournamentFromFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const rawText = e.target.result.trim();
                let jsonStr = "";
                
                if (rawText.startsWith('{')) {
                    // It's a raw JSON file
                    jsonStr = rawText;
                } else if (rawText.includes('#import=')) {
                    // Extract Base64 from the HTML launcher file
                    const match = rawText.match(/#import=([A-Za-z0-9+/=]+)/);
                    if (match && match[1]) {
                        jsonStr = decodeURIComponent(escape(atob(match[1])));
                    } else {
                        showToast('No se pudo extraer la información del archivo HTML ⚠️');
                        return;
                    }
                } else {
                    showToast('Archivo no reconocido. Usa archivos de Torneos FC (.json o .html) ⚠️');
                    return;
                }

                const parsed = JSON.parse(jsonStr);
                
                if (!parsed.id || !parsed.format || !parsed.participants || !Array.isArray(parsed.participants)) {
                    showToast('Archivo inválido. No es un torneo de Torneos FC ⚠️');
                    return;
                }
                
                let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
                const existingIdx = stored.findIndex(t => t.id === parsed.id);
                if (existingIdx >= 0) {
                    if (confirm(`Ya existe un torneo con el nombre "${parsed.name || 'Sin nombre'}". ¿Deseas sobreescribirlo/actualizarlo?`)) {
                        stored[existingIdx] = parsed;
                    } else {
                        parsed.id = 'T-' + Date.now();
                        parsed.name = `${parsed.name || 'Torneo'} (Copia)`;
                        stored.push(parsed);
                    }
                } else {
                    stored.push(parsed);
                }
                
                localStorage.setItem('torneos-fc-data', JSON.stringify(stored));
                
                if (typeof initHome === 'function') initHome();
                if (typeof renderSavedTournaments === 'function') renderSavedTournaments();
                
                window.loadTournament(parsed.id);
                showToast('Torneo importado con éxito 📥✅');
                
            } catch (err) {
                console.error('Error parsing file:', err);
                showToast('Error al leer el archivo importado ⚠️');
            }
        };
        reader.readAsText(file);
    }

    // SAVE LOGIC
    async function saveTournament() {
        if (state.isSpectator) {
            showToast('Modo Espectador: No puedes editar este torneo 👁️');
            return;
        }

        if (!state.id) state.id = 'T-' + Date.now();
        if (!state.name) {
            const inputName = document.getElementById('tournament-name').value.trim();
            state.name = inputName || `Torneo ${state.format.toUpperCase()} - ${new Date().toLocaleDateString()}`;
        }
        state.lastSaved = new Date().toLocaleString();

        // Attach owner if logged in
        const activeUser = localStorage.getItem('torneos-fc-user');
        if (activeUser) {
            state.owner = activeUser;
        } else {
            delete state.owner;
        }

        try {
            const baseUrl = getBackendUrl();
            const response = await fetch(`${baseUrl}/api/tournaments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });
            
            const data = await response.json();
            if (data.success) {
                state.shareCode = data.shareCode || data.code;
                
                // Guardar localmente también
                let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
                const existingIdx = stored.findIndex(t => t.id === state.id);
                if (existingIdx >= 0) {
                    stored[existingIdx] = state;
                } else {
                    stored.push(state);
                }
                localStorage.setItem('torneos-fc-data', JSON.stringify(stored));
                
                showToast(`Guardado con éxito. Tu Código: ${state.shareCode} 💾`);
                
                if (typeof updateGlobalBadge === 'function') updateGlobalBadge();
                
                initHome();
            } else {
                showToast(data.message || 'Error al guardar el torneo ❌');
            }
        } catch (err) {
            console.error(err);
            showToast('Error al conectar con el servidor.');
        }
    }


    if (btnSaveGroups) btnSaveGroups.addEventListener('click', saveTournament);
    if (btnSaveBracket) btnSaveBracket.addEventListener('click', saveTournament);

    // Global filter state
    let activeFilter = 'all';

    window.renderSavedTournaments = function() {
        const container = document.getElementById('saved-list-container');
        if (!container) return;
        
        let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
        
        if (stored.length === 0) {
            container.innerHTML = '<p class="empty-saved">No tienes torneos guardados aún.</p>';
            return;
        }

        container.innerHTML = '';
        
        // Sort descending
        stored.sort((a,b) => {
             const t1 = a.id ? parseInt(a.id.split('-')[1]) : 0;
             const t2 = b.id ? parseInt(b.id.split('-')[1]) : 0;
             return t2 - t1;
        });

        const activeUser = localStorage.getItem('torneos-fc-user');
        const searchTerm = savedSearchInput ? savedSearchInput.value.toLowerCase().trim() : '';

        // Filter tournaments based on search and selected filter button
        const filtered = stored.filter(t => {
            // Search filter
            const matchesSearch = !searchTerm || (t.name && t.name.toLowerCase().includes(searchTerm));
            if (!matchesSearch) return false;

            // Category filter
            const isOwner = !t.isSpectator;
            if (activeFilter === 'owned') return isOwner;
            if (activeFilter === 'spectator') return t.isSpectator;
            if (activeFilter === 'champions') return t.format === 'champions';
            if (activeFilter === 'liga') return t.format === 'liga';
            if (activeFilter === 'copa') return t.format === 'copa';

            return true; // 'all'
        });

        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-saved" style="grid-column: 1/-1;">No se encontraron torneos con los filtros seleccionados.</p>';
            return;
        }

        filtered.forEach(t => {
            const card = document.createElement('div');
            const isOwner = !t.isSpectator;
            const isSpectator = t.isSpectator;
            card.className = `saved-card ${isSpectator ? 'spectator-card' : ''}`;
            
            let formatText = 'Desconocido';
            let icon = '⚽';
            if (t.format === 'champions') { formatText = 'Champions'; icon = '⭐'; }
            if (t.format === 'liga') { formatText = 'Modo Liga'; icon = '🏆'; }
            if (t.format === 'copa') { formatText = 'Copa'; icon = '⚔️'; }

            // Progress calculation
            let totalMatches = 0;
            let finishedMatches = 0;
            if (t.groups) {
                t.groups.forEach(g => {
                    if (g.matches) {
                        totalMatches += g.matches.length;
                        finishedMatches += g.matches.filter(m => m.isFinished).length;
                    }
                });
            }
            if (t.bracketRounds) {
                t.bracketRounds.forEach(r => {
                    totalMatches += r.length;
                    finishedMatches += r.filter(m => m.isFinished).length;
                });
            }
            const progressPercent = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;

            // Badges
            let roleBadge = '';
            if (isOwner) {
                roleBadge = '<span class="badge-role owner">👑 Creador</span>';
            } else if (isSpectator) {
                roleBadge = '<span class="badge-role spectator">👁️ Espectador</span>';
            }

            card.innerHTML = `
                <div class="saved-card-info">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                        ${roleBadge}
                    </div>
                    <h3 class="saved-card-title">${icon} ${t.name || 'Torneo sin nombre'}</h3>
                    <div class="saved-card-details">
                        <span>Formato: <strong>${formatText}</strong></span>
                        <span>Equipos: <strong>${t.participants ? t.participants.length : 0}</strong></span>
                        <span>Código: <strong>${t.shareCode || 'Sin código'}</strong></span>
                        <span>Guardado: <strong>${t.lastSaved || 'Desconocido'}</strong></span>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div class="saved-card-progress">
                        <div class="progress-text">
                            <span>Progreso del Torneo</span>
                            <span>${finishedMatches}/${totalMatches} partidos (${progressPercent}%)</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                    </div>
                </div>
                <div class="saved-card-actions">
                    <button class="btn-danger" data-delete-id="${t.id}">Eliminar</button>
                    <button class="btn-load" data-load-id="${t.id}">Cargar</button>
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-delete-id');
                window.deleteTournament(id);
            });
        });
        container.querySelectorAll('.btn-load').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-load-id');
                window.loadTournament(id);
            });
        });
    }

    // Set up search and filter events once
    if (savedSearchInput) {
        savedSearchInput.addEventListener('input', () => {
            window.renderSavedTournaments();
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            activeFilter = e.currentTarget.getAttribute('data-filter');
            window.renderSavedTournaments();
        });
    });


    // ==========================================
    // EQUIPOS Y REGISTRO DE PARTICIPANTES GLOBAL
    // ==========================================
    function getGlobalParticipantsData() {
        let storedTournaments = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
        let customList = JSON.parse(localStorage.getItem('torneos-fc-participants-list') || '[]');
        
        const participantsMap = {};

        const initP = (name) => {
            if (!name || typeof name !== 'string') return null;
            const clean = name.trim();
            if (!clean) return null;
            const key = clean.toLowerCase();
            if (!participantsMap[key]) {
                participantsMap[key] = {
                    name: clean,
                    playedCount: 0,
                    titlesTotal: 0,
                    titlesByFormat: { champions: 0, liga: 0, copa: 0 },
                    formats: new Set()
                };
            }
            return key;
        };

        // Add custom list
        customList.forEach(name => initP(name));

        // Add active state participants
        if (state && state.participants && Array.isArray(state.participants)) {
            state.participants.forEach(p => {
                const k = initP(p);
                if (k && state.format) participantsMap[k].formats.add(state.format);
            });
        }

        // Process all saved tournaments
        storedTournaments.forEach(t => {
            const format = t.format || 'champions';
            if (t.participants && Array.isArray(t.participants)) {
                t.participants.forEach(p => {
                    const k = initP(p);
                    if (k) {
                        participantsMap[k].playedCount++;
                        participantsMap[k].formats.add(format);
                    }
                });
            }

            // Determine champion if finished
            let winnerName = null;
            if (t.winner) {
                winnerName = typeof t.winner === 'object' ? t.winner.name : t.winner;
            } else if (t.bracketRounds && t.bracketRounds.length > 0) {
                const finalRound = t.bracketRounds[t.bracketRounds.length - 1];
                if (finalRound && finalRound.length === 1) {
                    const finalMatch = finalRound[0];
                    const w = checkMatchWinner(finalMatch);
                    if (w && w !== 'tie') {
                        winnerName = typeof w === 'object' ? w.name : w;
                    }
                }
            } else if (t.format === 'liga' && t.groups && t.groups[0]) {
                const table = getGroupTable(t.groups[0]);
                if (table && table.length > 0 && t.groups[0].matches && t.groups[0].matches.every(m => m.isFinished)) {
                    winnerName = table[0].name;
                }
            }

            if (winnerName && typeof winnerName === 'string') {
                const k = initP(winnerName);
                if (k) {
                    participantsMap[k].titlesTotal++;
                    if (participantsMap[k].titlesByFormat[format] !== undefined) {
                        participantsMap[k].titlesByFormat[format]++;
                    } else {
                        participantsMap[k].titlesByFormat[format] = 1;
                    }
                }
            }
        });

        return Object.values(participantsMap);
    }

    function renderTeamsView() {
        const grid = document.getElementById('teams-grid-container');
        const badge = document.getElementById('teams-count-badge');
        const searchInput = document.getElementById('teams-search-input');
        if (!grid) return;

        const all = getGlobalParticipantsData();
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const filtered = all.filter(p => p.name.toLowerCase().includes(query));

        if (badge) badge.textContent = `${all.length} Registrado${all.length === 1 ? '' : 's'}`;

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 3rem; margin-bottom: 0.8rem;">👥</div>
                    <h3 style="color:#ffffff; margin-bottom: 0.5rem;">No se encontraron participantes</h3>
                    <p style="font-size: 0.9rem;">${query ? 'No hay ningún jugador que coincida con tu búsqueda.' : 'Crea o carga un torneo para registrar automáticamente a los participantes aquí.'}</p>
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(p => {
            const formatNames = Array.from(p.formats).map(f => {
                if (f === 'champions') return 'Champions';
                if (f === 'liga') return 'Liga';
                if (f === 'copa') return 'Copa';
                return f;
            }).join(', ') || 'General';

            html += `
                <div class="team-participant-card">
                    <div class="card-header-row">
                        <div class="participant-avatar-circle">${p.name.charAt(0).toUpperCase()}</div>
                        <div class="participant-info-col">
                            <span class="participant-name-title">${p.name}</span>
                            ${p.titlesTotal > 0 ? `<span class="participant-badge-tag">👑 ${p.titlesTotal} Título${p.titlesTotal === 1 ? '' : 's'}</span>` : `<span class="participant-badge-tag" style="background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.2); color:#94a3b8;">👤 Jugador</span>`}
                        </div>
                    </div>
                    <div class="card-stats-body">
                        <div class="stat-item-cell">
                            <span class="stat-item-label">Torneos Jugados</span>
                            <span class="stat-item-val">${p.playedCount}</span>
                        </div>
                        <div class="stat-item-cell">
                            <span class="stat-item-label">Títulos</span>
                            <span class="stat-item-val" style="color:${p.titlesTotal > 0 ? '#FFD700' : '#ffffff'};">${p.titlesTotal}</span>
                        </div>
                        <div class="stat-item-cell" style="grid-column: 1 / -1; margin-top: 0.3rem;">
                            <span class="stat-item-label">Formatos Disputados</span>
                            <span class="stat-item-val" style="font-size: 0.8rem; color: #00F0FF;">${formatNames}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    let currentRankingFormat = 'all';

    function renderRankingView(formatFilter = currentRankingFormat) {
        currentRankingFormat = formatFilter;
        const container = document.getElementById('ranking-container');
        if (!container) return;

        const all = getGlobalParticipantsData();

        // STRICT FILTER: ONLY participants who have WON AT LEAST 1 TITLE!
        const champions = all.filter(p => {
            if (formatFilter === 'all') return p.titlesTotal > 0;
            return (p.titlesByFormat[formatFilter] || 0) > 0;
        }).map(p => ({
            name: p.name,
            titles: formatFilter === 'all' ? p.titlesTotal : (p.titlesByFormat[formatFilter] || 0),
            titlesTotal: p.titlesTotal,
            playedCount: p.playedCount,
            formats: p.formats
        })).sort((a, b) => b.titles - a.titles || b.playedCount - a.playedCount);

        if (champions.length === 0) {
            const formatLabel = formatFilter === 'champions' ? 'Champions League' : (formatFilter === 'liga' ? 'Modo Liga' : (formatFilter === 'copa' ? 'Copas y Llaves' : 'ningún formato'));
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🏆</div>
                    <h3 style="color:#ffffff; margin-bottom: 0.5rem; font-size: 1.4rem;">Sin Campeones Registrados</h3>
                    <p style="font-size: 0.95rem; max-width: 500px; margin: 0 auto;">No hay participantes que hayan ganado un torneo en <strong>${formatLabel}</strong> aún. Solo se muestran los jugadores con títulos ganados.</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Render Podium for Top 3 Champions
        const p1 = champions[0];
        const p2 = champions[1];
        const p3 = champions[2];

        html += `<div class="ranking-podium-row">`;
        if (p2) {
            html += `
                <div class="podium-card silver">
                    <div class="podium-badge">🥈</div>
                    <div class="podium-name">${p2.name}</div>
                    <div class="podium-titles">${p2.titles} Título${p2.titles === 1 ? '' : 's'}</div>
                </div>
            `;
        }
        if (p1) {
            html += `
                <div class="podium-card gold">
                    <div class="podium-badge">🥇</div>
                    <div class="podium-name">${p1.name}</div>
                    <div class="podium-titles">${p1.titles} Título${p1.titles === 1 ? '' : 's'}</div>
                </div>
            `;
        }
        if (p3) {
            html += `
                <div class="podium-card bronze">
                    <div class="podium-badge">🥉</div>
                    <div class="podium-name">${p3.name}</div>
                    <div class="podium-titles">${p3.titles} Título${p3.titles === 1 ? '' : 's'}</div>
                </div>
            `;
        }
        html += `</div>`;

        // Render Leaderboard Table
        html += `
            <div class="ranking-table-container">
                <table class="ranking-table">
                    <thead>
                        <tr>
                            <th style="width: 80px; text-align: center;">Pos</th>
                            <th>Campeón</th>
                            <th style="text-align: center;">Títulos ${formatFilter === 'all' ? 'Totales' : ''}</th>
                            <th style="text-align: center;">Torneos Jugados</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        champions.forEach((c, idx) => {
            const medal = idx === 0 ? '🥇 ' : (idx === 1 ? '🥈 ' : (idx === 2 ? '🥉 ' : ''));
            html += `
                <tr>
                    <td style="text-align: center; font-weight: 800; color: #00F0FF;">#${idx + 1}</td>
                    <td style="font-weight: 700; font-size: 1.05rem;">${medal}${c.name}</td>
                    <td style="text-align: center; font-weight: 900; color: #FFD700; font-size: 1.1rem;">${c.titles}</td>
                    <td style="text-align: center; color: #94a3b8;">${c.playedCount}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    // Input listeners for Teams Search and Ranking Tabs
    setTimeout(() => {
        const teamsSearchInput = document.getElementById('teams-search-input');
        if (teamsSearchInput) {
            teamsSearchInput.addEventListener('input', renderTeamsView);
        }
        document.querySelectorAll('.ranking-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.ranking-tab-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const format = e.currentTarget.getAttribute('data-format');
                renderRankingView(format);
            });
        });
    }, 100);
    // ==========================================
    // CONFIGURACIÓN GLOBAL Y TEMAS VISUALES
    // ==========================================
    const DEFAULT_CONFIG = {
        theme: 'stadium',
        stars: true,
        confetti: true,
        pointsWin: 3,
        tiebreak: 'dg',
        autosave: true
    };

    function getGlobalConfig() {
        try {
            const saved = localStorage.getItem('torneos-fc-global-config');
            return saved ? Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved)) : DEFAULT_CONFIG;
        } catch (e) {
            return DEFAULT_CONFIG;
        }
    }

    function saveGlobalConfig(newConfig) {
        localStorage.setItem('torneos-fc-global-config', JSON.stringify(newConfig));
        applyGlobalConfig(newConfig);
    }

    function applyGlobalConfig(cfg = getGlobalConfig()) {
        document.body.classList.remove('theme-stadium', 'theme-neon', 'theme-gold', 'theme-dark');
        if (cfg.theme && cfg.theme !== 'stadium') {
            document.body.classList.add(`theme-${cfg.theme}`);
        }
        const starsBg = document.querySelector('.stars-bg');
        if (starsBg) {
            starsBg.style.display = cfg.stars !== false ? 'block' : 'none';
        }
    }

    function loadGlobalConfigUI() {
        const cfg = getGlobalConfig();
        const themeSelect = document.getElementById('config-theme-select');
        const starsToggle = document.getElementById('config-stars-toggle');
        const confettiToggle = document.getElementById('config-confetti-toggle');
        const pointsWinSelect = document.getElementById('config-points-win');
        const autosaveToggle = document.getElementById('config-autosave-toggle');

        if (themeSelect) themeSelect.value = cfg.theme || 'stadium';
        if (starsToggle) starsToggle.checked = cfg.stars !== false;
        if (confettiToggle) confettiToggle.checked = cfg.confetti !== false;
        if (pointsWinSelect) pointsWinSelect.value = cfg.pointsWin || 3;
        if (autosaveToggle) autosaveToggle.checked = cfg.autosave !== false;

        applyGlobalConfig(cfg);
    }

    // Attach event listeners for Config View UI controls
    setTimeout(() => {
        loadGlobalConfigUI();

        const themeSelect = document.getElementById('config-theme-select');
        const starsToggle = document.getElementById('config-stars-toggle');
        const confettiToggle = document.getElementById('config-confetti-toggle');
        const pointsWinSelect = document.getElementById('config-points-win');
        const autosaveToggle = document.getElementById('config-autosave-toggle');

        const updateCfgFromUI = () => {
            const cfg = {
                theme: themeSelect ? themeSelect.value : 'stadium',
                stars: starsToggle ? starsToggle.checked : true,
                confetti: confettiToggle ? confettiToggle.checked : true,
                pointsWin: pointsWinSelect ? parseInt(pointsWinSelect.value) : 3,
                autosave: autosaveToggle ? autosaveToggle.checked : true
            };
            saveGlobalConfig(cfg);
            showToast('Configuración guardada ⚙️✅');
        };

        if (themeSelect) themeSelect.addEventListener('change', updateCfgFromUI);
        if (starsToggle) starsToggle.addEventListener('change', updateCfgFromUI);
        if (confettiToggle) confettiToggle.addEventListener('change', updateCfgFromUI);
        if (pointsWinSelect) pointsWinSelect.addEventListener('change', updateCfgFromUI);
        if (autosaveToggle) autosaveToggle.addEventListener('change', updateCfgFromUI);

        // Export All Data Backup (JSON)
        const btnExportAll = document.getElementById('btn-export-all-data');
        if (btnExportAll) {
            btnExportAll.addEventListener('click', () => {
                const storedData = localStorage.getItem('torneos-fc-data') || '[]';
                const customParticipants = localStorage.getItem('torneos-fc-participants-list') || '[]';
                const globalConfig = localStorage.getItem('torneos-fc-global-config') || '{}';

                const backupObj = {
                    appName: 'Torneos FC Backup',
                    version: '2.0',
                    exportDate: new Date().toLocaleString(),
                    tournaments: JSON.parse(storedData),
                    participants: JSON.parse(customParticipants),
                    config: JSON.parse(globalConfig)
                };

                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
                const a = document.createElement('a');
                a.href = dataStr;
                a.download = `torneos-fc-respaldo-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                showToast('Respaldo masivo exportado 📥✅');
            });
        }

        // Import All Data Backup (JSON)
        const btnImportAll = document.getElementById('btn-import-all-data');
        const inputImportBackup = document.getElementById('input-import-backup');

        if (btnImportAll && inputImportBackup) {
            btnImportAll.addEventListener('click', () => inputImportBackup.click());

            inputImportBackup.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const parsed = JSON.parse(evt.target.result);
                        if (parsed.tournaments && Array.isArray(parsed.tournaments)) {
                            localStorage.setItem('torneos-fc-data', JSON.stringify(parsed.tournaments));
                            if (parsed.participants && Array.isArray(parsed.participants)) {
                                localStorage.setItem('torneos-fc-participants-list', JSON.stringify(parsed.participants));
                            }
                            if (parsed.config) {
                                localStorage.setItem('torneos-fc-global-config', JSON.stringify(parsed.config));
                                applyGlobalConfig(parsed.config);
                            }
                            showToast('Respaldo masivo restaurado con éxito 📤✅');
                            setTimeout(() => window.location.reload(), 1200);
                        } else {
                            showToast('Archivo de respaldo no válido ⚠️');
                        }
                    } catch (err) {
                        console.error(err);
                        showToast('Error al leer el archivo de respaldo ❌');
                    }
                };
                reader.readAsText(file);
            });
        }

        // Danger Zone: Reset All Data
        const btnConfigReset = document.getElementById('btn-config-reset-all');
        if (btnConfigReset) {
            btnConfigReset.addEventListener('click', () => {
                if (confirm('🚨 ¡ATENCIÓN! ¿Estás completamente seguro de borrar TODOS los torneos, participantes y configuraciones? Esta acción no se puede deshacer.')) {
                    localStorage.removeItem('torneos-fc-data');
                    localStorage.removeItem('torneos-fc-participants-list');
                    localStorage.removeItem('torneos-fc-global-config');
                    showToast('Todos los datos han sido borrados 🗑️');
                    setTimeout(() => window.location.reload(), 1000);
                }
            });
        }
    }, 150);

    function calculateAndDrawStats() {
        const teamStats = {};
        state.participants.forEach(p => {
            teamStats[p] = { name: p, gf: 0, gc: 0, played: 0, cleanSheets: 0 };
        });

        let maxDiff = { diff: -1, tW: '', tL: '', score: '' };

        const processMatch = (m) => {
            const isSingle = state.knockoutFormat === 'single';
            let g1 = m.s1, g2 = m.s2;
            let played = false;
            
            if (m.s1 !== null && m.s2 !== null) {
                played = true;
                if (!isSingle && m.s1_v !== null && m.s2_v !== null) {
                    g1 += m.s1_v; g2 += m.s2_v;
                }
            }

            if (played && m.t1 && m.t2) {
                const tn1 = m.t1.name;
                const tn2 = m.t2.name;
                
                teamStats[tn1].gf += g1;
                teamStats[tn1].gc += g2;
                teamStats[tn1].played += (!isSingle && m.s1_v !== null ? 2 : 1);
                if (m.s2 === 0) teamStats[tn1].cleanSheets += 1;
                if (!isSingle && m.s2_v === 0) teamStats[tn1].cleanSheets += 1;
                
                teamStats[tn2].gf += g2;
                teamStats[tn2].gc += g1;
                teamStats[tn2].played += (!isSingle && m.s1_v !== null ? 2 : 1);
                if (m.s1 === 0) teamStats[tn2].cleanSheets += 1;
                if (!isSingle && m.s1_v === 0) teamStats[tn2].cleanSheets += 1;
                
                const diff = Math.abs(g1 - g2);
                if (diff > maxDiff.diff) {
                    maxDiff = { diff, tW: g1 > g2 ? tn1 : tn2, tL: g1 > g2 ? tn2 : tn1, score: `${Math.max(g1,g2)} - ${Math.min(g1,g2)}` };
                }
            }
        };

        if (state.groups) {
            state.groups.forEach(g => {
                g.matches.forEach(m => processMatch(m));
            });
        }
        if (state.bracketRounds) {
            state.bracketRounds.forEach(r => {
                r.forEach(m => processMatch(m));
            });
        }

        const teamsArray = Object.values(teamStats).filter(t => t.played > 0);
        const statsContainer = document.getElementById('stats-container');
        
        if (teamsArray.length === 0) {
            statsContainer.innerHTML = '<h3 style="color:var(--text-muted); text-align:center; width:100%;">No hay partidos jugados aún para calcular estadísticas.</h3>';
            return;
        }

        const topScorer = [...teamsArray].sort((a,b) => b.gf - a.gf)[0];
        const bestDefense = [...teamsArray].sort((a,b) => {
            if (b.cleanSheets !== a.cleanSheets) return b.cleanSheets - a.cleanSheets;
            return a.gc - b.gc; 
        })[0];

        let html = `
            <div class="card" style="background: linear-gradient(145deg, rgba(255, 215, 0, 0.05), rgba(0, 0, 0, 0.4)); border: 1px solid var(--border-color); text-align: center; padding: 4rem 2rem;">
                <div style="font-size: 5rem; margin-bottom: 2rem;">⚽</div>
                <div style="color: var(--accent-silver); font-size: 1.2rem; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 1rem;">Mayor Goleador</div>
                <div style="color: var(--text-light); font-size: 3rem; font-weight: 800; line-height: 1.2; margin-bottom: 1rem;">${topScorer.name}</div>
                <div style="color: var(--primary-color); font-size: 1.8rem; font-weight: 600;">${topScorer.gf} Goles</div>
            </div>
            
            <div class="card" style="background: linear-gradient(145deg, rgba(255, 215, 0, 0.05), rgba(0, 0, 0, 0.4)); border: 1px solid var(--border-color); text-align: center; padding: 4rem 2rem;">
                <div style="font-size: 5rem; margin-bottom: 2rem;">🛡️</div>
                <div style="color: var(--accent-silver); font-size: 1.2rem; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 1rem;">Mejor Defensa</div>
                <div style="color: var(--text-light); font-size: 3rem; font-weight: 800; line-height: 1.2; margin-bottom: 1rem;">${bestDefense.name}</div>
                <div style="color: var(--primary-color); font-size: 1.8rem; font-weight: 600;">${bestDefense.cleanSheets > 0 ? bestDefense.cleanSheets + ' Vallas Invictas' : bestDefense.gc + ' Goles en Contra'}</div>
            </div>
        `;

        if (maxDiff.diff > 0) {
            html += `
            <div class="card" style="background: linear-gradient(145deg, rgba(255, 215, 0, 0.05), rgba(0, 0, 0, 0.4)); border: 1px solid var(--border-color); text-align: center; padding: 4rem 2rem;">
                <div style="font-size: 5rem; margin-bottom: 2rem;">⚡</div>
                <div style="color: var(--accent-silver); font-size: 1.2rem; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 1rem;">Mayor Goleada</div>
                <div style="color: var(--text-light); font-size: 3rem; font-weight: 800; line-height: 1.2; margin-bottom: 1rem;">${maxDiff.tW}</div>
                <div style="color: var(--primary-color); font-size: 1.8rem; font-weight: 600;">${maxDiff.score} vs ${maxDiff.tL}</div>
            </div>`;
        }

        statsContainer.innerHTML = html;
    }

    window.deleteTournament = function(id) {
        if (!confirm('¿Estás seguro de eliminar este torneo guardado?')) return;
        let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
        stored = stored.filter(t => t.id !== id);
        localStorage.setItem('torneos-fc-data', JSON.stringify(stored));
        window.renderSavedTournaments();
        initHome();
        showToast('Torneo eliminado 🗑️');
    }

    window.loadTournament = async function(id) {
        let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
        const loadedState = stored.find(t => t.id === id);
        if (loadedState) {
            let stateToLoad = loadedState;

            // Si es modo espectador, descargar primero la versión fresca desde el backend
            if (loadedState.isSpectator && loadedState.shareCode) {
                showToast('Actualizando datos de espectador... 👁️');
                try {
                    const baseUrl = getBackendUrl();
                    const response = await fetch(`${baseUrl}/api/tournaments/${loadedState.shareCode}`);
                    const data = await response.json();
                    if (data.success && data.tournament) {
                        stateToLoad = data.tournament;
                        stateToLoad.isSpectator = true; // Mantener la bandera de espectador
                        
                        // Actualizar la caché de almacenamiento local
                        const idx = stored.findIndex(t => t.id === id);
                        if (idx >= 0) stored[idx] = stateToLoad;
                        localStorage.setItem('torneos-fc-data', JSON.stringify(stored));
                        initHome();
                    }
                } catch (err) {
                    console.error('Error fetching latest tournament state for spectator, using cached version:', err);
                    showToast('Cargando copia local sin conexión ⚠️');
                }
            }

            // Restore state explicitly to keep memory reference to state object
            for (let key in state) delete state[key];
            Object.assign(state, stateToLoad);
            
            // Sync UI Menus
            if (state.format === 'champions' || state.format === 'copa') {
                btnMenuSetup.classList.remove('hidden');
            } else {
                btnMenuSetup.classList.add('hidden');
            }

            if (state.groups && state.groups.length > 0 && state.format !== 'copa' && state.format !== 'liga') {
                 btnMenuGroups.classList.remove('hidden');
            } else {
                 btnMenuGroups.classList.add('hidden');
            }

            if ((state.bracketGenerated || (state.bracketRounds && state.bracketRounds.length > 0)) && (state.format === 'champions' || state.format === 'copa')) {
                 btnMenuBracket.classList.remove('hidden');
            } else {
                 btnMenuBracket.classList.add('hidden');
            }

            document.getElementById('tournament-name').value = state.name || '';

            // Figure out where to route them
            viewHistory.length = 0; // Clear history
            viewHistory.push(document.getElementById('home-view')); // Ensure they can go back to home!
            
            // Draw both views if they exist
            if (state.groups && state.groups.length > 0) {
                 drawGroups();
            }
            if (state.bracketGenerated || (state.bracketRounds && state.bracketRounds.length > 0)) {
                 drawBracket();
            }

            // Route dynamically based on format and progress
            if (state.format === 'copa') {
                 showView(bracketView, false);
            } else if (state.format === 'liga') {
                 showView(groupsView, false);
            } else {
                 // Champions format or fallback
                 if (state.bracketGenerated && state.bracketRounds && state.bracketRounds.length > 0) {
                     showView(bracketView, false);
                 } else if (state.groups && state.groups.length > 0) {
                     showView(groupsView, false);
                 } else {
                     showView(setupView, false);
                 }
            }
            
            showToast('Torneo cargado con éxito ✅');
        }
    }

    const championModal = document.getElementById('champion-modal');
    const btnCloseChampion = document.getElementById('btn-close-champion');
    if (btnCloseChampion) {
        btnCloseChampion.addEventListener('click', () => {
            championModal.classList.add('hidden');
        });
    }

    const btnChampionStats = document.getElementById('btn-champion-stats');
    if (btnChampionStats) {
        btnChampionStats.addEventListener('click', () => {
            championModal.classList.add('hidden');
            calculateAndDrawStats();
            showView(document.getElementById('stats-view'), true);
        });
    }

    const btnDownloadChampion = document.getElementById('btn-download-champion');
    if (btnDownloadChampion) {
        btnDownloadChampion.addEventListener('click', () => {
            downloadTournamentData();
        });
    }

    const btnShareChampion = document.getElementById('btn-share-champion');
    if (btnShareChampion) {
        btnShareChampion.addEventListener('click', () => {
            shareTournamentLink();
        });
    }

    const btnStatsBack = document.getElementById('btn-stats-back');
    if (btnStatsBack) {
        btnStatsBack.addEventListener('click', () => {
            if (viewHistory.length > 0) {
                const prevView = viewHistory.pop();
                showView(prevView, false);
            } else {
                showView(document.getElementById('home-view'), false);
            }
        });
    }

    const headerStatsButtons = document.querySelectorAll('#btn-header-stats-bracket, #btn-header-stats-groups');
    headerStatsButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            calculateAndDrawStats();
            showView(document.getElementById('stats-view'), true);
        });
    });

    // === LÓGICA DE UNIRSE A TORNEO ===
    const btnJoinTournament = document.getElementById('btn-join-tournament');
    const joinModal = document.getElementById('join-modal');
    const btnCancelJoin = document.getElementById('btn-cancel-join');
    const btnConfirmJoin = document.getElementById('btn-confirm-join');
    const joinCodeInput = document.getElementById('join-code-input');
    const joinErrorText = document.getElementById('join-error-text');

    if (btnJoinTournament) {
        btnJoinTournament.addEventListener('click', () => {
            joinErrorText.classList.add('hidden');
            joinCodeInput.value = '';
            joinModal.classList.remove('hidden');
        });
    }

    if (btnCancelJoin) {
        btnCancelJoin.addEventListener('click', () => joinModal.classList.add('hidden'));
    }

    if (btnConfirmJoin) {
        btnConfirmJoin.addEventListener('click', async () => {
            const code = joinCodeInput.value.trim().toUpperCase();
            if (!code) return;

            btnConfirmJoin.disabled = true;
            btnConfirmJoin.textContent = 'Buscando...';
            joinErrorText.classList.add('hidden');

            try {
                const baseUrl = getBackendUrl();
                const response = await fetch(`${baseUrl}/api/tournaments/${code}`);
                const data = await response.json();

                if (data.success) {
                    joinModal.classList.add('hidden');
                    const tData = data.tournament;
                    tData.isSpectator = true; // ACTIVAMOS EL MODO ESPECTADOR
                    
                    // Limpiar estado y cargar los nuevos datos
                    for (let key in state) delete state[key];
                    Object.assign(state, tData);
                    
                    // Lógica para mostrar la vista correcta
                    viewHistory.length = 0; 
                    viewHistory.push(document.getElementById('home-view'));
                    
                    if (state.bracketRounds && state.bracketRounds.length > 0 && (!state.groups || state.groups.length === 0)) {
                        drawBracket();
                        showView(bracketView, false);
                    } else if (state.groups && state.groups.length > 0) {
                        drawGroups();
                        if (state.bracketGenerated || (state.bracketRounds && state.bracketRounds.length > 0)) {
                            drawBracket();
                        }
                        showView(groupsView, false);
                    }
                    
                    showToast('Has entrado como Espectador 👁️');
                    
                    // Guardar local para "Mis Torneos"
                    let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
                    const existingIdx = stored.findIndex(t => t.id === state.id);
                    if (existingIdx >= 0) stored[existingIdx] = state;
                    else stored.push(state);
                    localStorage.setItem('torneos-fc-data', JSON.stringify(stored));
                    initHome();

                } else {
                    joinErrorText.textContent = 'No se encontró un torneo con ese código.';
                    joinErrorText.classList.remove('hidden');
                }
            } catch (err) {
                joinErrorText.textContent = 'Error de conexión. Inténtalo de nuevo.';
                joinErrorText.classList.remove('hidden');
            } finally {
                btnConfirmJoin.disabled = false;
                btnConfirmJoin.textContent = 'Ver Torneo';
            }
        });
    }

    window.aplicarModoEspectador = function() {
        if (!state.isSpectator) return;
        
        // Bloquear todos los inputs de marcadores
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.readOnly = true;
            input.style.opacity = '0.8';
        });
        
        const formatSelect = document.getElementById('bracket-format-select');
        if (formatSelect) {
            formatSelect.disabled = true;
            formatSelect.style.opacity = '0.8';
        }
        
        // Esconder botones de guardar/confirmar en el bracket
        document.querySelectorAll('.btn-bracket-save').forEach(btn => {
            btn.style.display = 'none';
        });

        const btnSaveGroups = document.getElementById('btn-save-groups');
        const btnSaveBracket = document.getElementById('btn-save-bracket');
        if (btnSaveGroups) btnSaveGroups.style.display = 'none';
        if (btnSaveBracket) btnSaveBracket.style.display = 'none';
        
        if (typeof updateGlobalBadge === 'function') updateGlobalBadge();
    };

    // --- PWA Installation Logic ---
    let deferredPrompt;
    const btnHeroInstall = document.getElementById('btn-hero-install');
    const btnMenuInstall = document.getElementById('btn-menu-install');

    function showInstallPromotion() {
        if (btnHeroInstall) btnHeroInstall.classList.remove('hidden');
        if (btnMenuInstall) btnMenuInstall.classList.remove('hidden');
    }

    function hideInstallPromotion() {
        if (btnHeroInstall) btnHeroInstall.classList.add('hidden');
        if (btnMenuInstall) btnMenuInstall.classList.add('hidden');
    }

    // --- ADVANTAGE BRACKET GENERATOR (Winner + Loser Bracket con ventaja al 1°) ---
    function generateAdvantageBracket(topTeams, targetSize) {
        state.bracketRounds = [];
        state.bracketFormatType = 'advantage';
        
        let rounds = [];
        
        if (targetSize === 4) {
            // Round 0
            rounds.push([
                { id: 'R0-M0', phase: 'Winner Ronda 1 (B vs C)', bracket: 'winner', t1: topTeams[1] || null, t2: topTeams[2] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M0', nextMatchPos: 't2', nextLoserMatchId: 'R1-M1', nextLoserMatchPos: 't2' }
            ]);
            // Round 1
            rounds.push([
                { id: 'R1-M0', phase: 'Winner Ronda 2 (A vs W1)', bracket: 'winner', t1: topTeams[0] || null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M0', nextMatchPos: 't1', nextLoserMatchId: 'R2-M0', nextLoserMatchPos: 't2' },
                { id: 'R1-M1', phase: 'Loser Ronda 1 (D vs L1)', bracket: 'loser', t1: topTeams[3] || null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M0', nextMatchPos: 't1' }
            ]);
            // Round 2
            rounds.push([
                { id: 'R2-M0', phase: 'Final Loser Bracket', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M0', nextMatchPos: 't2' }
            ]);
            // Round 3
            rounds.push([
                { id: 'R3-M0', phase: 'Final', bracket: 'final', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null }
            ]);
        } else if (targetSize === 5) {
            // Round 0
            rounds.push([
                { id: 'R0-M0', phase: 'Winner Ronda 1 (B vs C)', bracket: 'winner', t1: topTeams[1] || null, t2: topTeams[2] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M0', nextMatchPos: 't2', nextLoserMatchId: 'R1-M1', nextLoserMatchPos: 't2' },
                { id: 'R0-M1', phase: 'Loser Ronda 1 (D vs E)', bracket: 'loser', t1: topTeams[3] || null, t2: topTeams[4] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M1', nextMatchPos: 't1' }
            ]);
            // Round 1
            rounds.push([
                { id: 'R1-M0', phase: 'Winner Ronda 2 (A vs W1)', bracket: 'winner', t1: topTeams[0] || null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M0', nextMatchPos: 't1', nextLoserMatchId: 'R2-M0', nextLoserMatchPos: 't2' },
                { id: 'R1-M1', phase: 'Loser Ronda 2', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M0', nextMatchPos: 't1' }
            ]);
            // Round 2
            rounds.push([
                { id: 'R2-M0', phase: 'Final Loser Bracket', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M0', nextMatchPos: 't2' }
            ]);
            // Round 3
            rounds.push([
                { id: 'R3-M0', phase: 'Final', bracket: 'final', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null }
            ]);
        } else if (targetSize === 8) {
            // Round 0
            rounds.push([
                { id: 'R0-M0', phase: 'Winner Ronda 1 (B vs H)', bracket: 'winner', t1: topTeams[1] || null, t2: topTeams[7] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M0', nextMatchPos: 't2', nextLoserMatchId: 'R1-M2', nextLoserMatchPos: 't2' },
                { id: 'R0-M1', phase: 'Winner Ronda 1 (C vs G)', bracket: 'winner', t1: topTeams[2] || null, t2: topTeams[6] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M1', nextMatchPos: 't1', nextLoserMatchId: 'R1-M3', nextLoserMatchPos: 't1' },
                { id: 'R0-M2', phase: 'Winner Ronda 1 (D vs F)', bracket: 'winner', t1: topTeams[3] || null, t2: topTeams[5] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M1', nextMatchPos: 't2', nextLoserMatchId: 'R1-M3', nextLoserMatchPos: 't2' }
            ]);
            // Round 1
            rounds.push([
                { id: 'R1-M0', phase: 'Winner Ronda 2 (A vs W1)', bracket: 'winner', t1: topTeams[0] || null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M0', nextMatchPos: 't1', nextLoserMatchId: 'R2-M1', nextLoserMatchPos: 't1' },
                { id: 'R1-M1', phase: 'Winner Ronda 2 (M2)', bracket: 'winner', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M0', nextMatchPos: 't2', nextLoserMatchId: 'R2-M2', nextLoserMatchPos: 't1' },
                { id: 'R1-M2', phase: 'Loser Ronda 1 (E vs L1)', bracket: 'loser', t1: topTeams[4] || null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M2', nextMatchPos: 't2' },
                { id: 'R1-M3', phase: 'Loser Ronda 1 (M2)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M1', nextMatchPos: 't2' }
            ]);
            // Round 2
            rounds.push([
                { id: 'R2-M0', phase: 'Winner Final', bracket: 'winner', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R5-M0', nextMatchPos: 't1', nextLoserMatchId: 'R4-M0', nextLoserMatchPos: 't2' },
                { id: 'R2-M1', phase: 'Loser Ronda 2 (M1)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M0', nextMatchPos: 't1' },
                { id: 'R2-M2', phase: 'Loser Ronda 2 (M2)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M0', nextMatchPos: 't2' }
            ]);
            // Round 3
            rounds.push([
                { id: 'R3-M0', phase: 'Loser Ronda 3', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R4-M0', nextMatchPos: 't1' }
            ]);
            // Round 4
            rounds.push([
                { id: 'R4-M0', phase: 'Final Loser Bracket', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R5-M0', nextMatchPos: 't2' }
            ]);
            // Round 5
            rounds.push([
                { id: 'R5-M0', phase: 'Final', bracket: 'final', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null }
            ]);
        } else if (targetSize === 16) {
            // Round 0
            rounds.push([
                { id: 'R0-M0', phase: 'Winner Ronda 1 (B vs P)', bracket: 'winner', t1: topTeams[1] || null, t2: topTeams[15] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M0', nextMatchPos: 't2', nextLoserMatchId: 'R1-M7', nextLoserMatchPos: 't2' },
                { id: 'R0-M1', phase: 'Winner Ronda 1 (C vs O)', bracket: 'winner', t1: topTeams[2] || null, t2: topTeams[14] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M1', nextMatchPos: 't1', nextLoserMatchId: 'R1-M6', nextLoserMatchPos: 't1' },
                { id: 'R0-M2', phase: 'Winner Ronda 1 (D vs N)', bracket: 'winner', t1: topTeams[3] || null, t2: topTeams[13] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M1', nextMatchPos: 't2', nextLoserMatchId: 'R1-M6', nextLoserMatchPos: 't2' },
                { id: 'R0-M3', phase: 'Winner Ronda 1 (E vs M)', bracket: 'winner', t1: topTeams[4] || null, t2: topTeams[12] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M2', nextMatchPos: 't1', nextLoserMatchId: 'R1-M5', nextLoserMatchPos: 't1' },
                { id: 'R0-M4', phase: 'Winner Ronda 1 (F vs L)', bracket: 'winner', t1: topTeams[5] || null, t2: topTeams[11] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M2', nextMatchPos: 't2', nextLoserMatchId: 'R1-M5', nextLoserMatchPos: 't2' },
                { id: 'R0-M5', phase: 'Winner Ronda 1 (G vs K)', bracket: 'winner', t1: topTeams[6] || null, t2: topTeams[10] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M3', nextMatchPos: 't1', nextLoserMatchId: 'R1-M4', nextLoserMatchPos: 't1' },
                { id: 'R0-M6', phase: 'Winner Ronda 1 (H vs J)', bracket: 'winner', t1: topTeams[7] || null, t2: topTeams[9] || null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R1-M3', nextMatchPos: 't2', nextLoserMatchId: 'R1-M4', nextLoserMatchPos: 't2' }
            ]);
            // Round 1
            rounds.push([
                { id: 'R1-M0', phase: 'Winner Ronda 2 (A vs W1)', bracket: 'winner', t1: topTeams[0] || null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M0', nextMatchPos: 't1', nextLoserMatchId: 'R2-M2', nextLoserMatchPos: 't1' },
                { id: 'R1-M1', phase: 'Winner Ronda 2 (M2)', bracket: 'winner', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M0', nextMatchPos: 't2', nextLoserMatchId: 'R2-M3', nextLoserMatchPos: 't1' },
                { id: 'R1-M2', phase: 'Winner Ronda 2 (M3)', bracket: 'winner', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M1', nextMatchPos: 't1', nextLoserMatchId: 'R2-M4', nextLoserMatchPos: 't1' },
                { id: 'R1-M3', phase: 'Winner Ronda 2 (M4)', bracket: 'winner', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M1', nextMatchPos: 't2', nextLoserMatchId: 'R2-M5', nextLoserMatchPos: 't1' },
                { id: 'R1-M4', phase: 'Loser Ronda 1 (M1)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M5', nextMatchPos: 't2' },
                { id: 'R1-M5', phase: 'Loser Ronda 1 (M2)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M4', nextMatchPos: 't2' },
                { id: 'R1-M6', phase: 'Loser Ronda 1 (M3)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M3', nextMatchPos: 't2' },
                { id: 'R1-M7', phase: 'Loser Ronda 1 (I vs L1)', bracket: 'loser', t1: topTeams[8] || null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R2-M2', nextMatchPos: 't2' }
            ]);
            // Round 2
            rounds.push([
                { id: 'R2-M0', phase: 'Winner Ronda 3 (M1)', bracket: 'winner', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M0', nextMatchPos: 't1', nextLoserMatchId: 'R3-M1', nextLoserMatchPos: 't1' },
                { id: 'R2-M1', phase: 'Winner Ronda 3 (M2)', bracket: 'winner', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M0', nextMatchPos: 't2', nextLoserMatchId: 'R3-M2', nextLoserMatchPos: 't1' },
                { id: 'R2-M2', phase: 'Loser Ronda 2 (M1)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M3', nextMatchPos: 't1' },
                { id: 'R2-M3', phase: 'Loser Ronda 2 (M2)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M3', nextMatchPos: 't2' },
                { id: 'R2-M4', phase: 'Loser Ronda 2 (M3)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M4', nextMatchPos: 't1' },
                { id: 'R2-M5', phase: 'Loser Ronda 2 (M4)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R3-M4', nextMatchPos: 't2' }
            ]);
            // Round 3
            rounds.push([
                { id: 'R3-M0', phase: 'Winner Final', bracket: 'winner', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R7-M0', nextMatchPos: 't1', nextLoserMatchId: 'R6-M0', nextLoserMatchPos: 't2' },
                { id: 'R3-M1', phase: 'Loser Ronda 3 (M1)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R4-M0', nextMatchPos: 't1' },
                { id: 'R3-M2', phase: 'Loser Ronda 3 (M2)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R4-M0', nextMatchPos: 't2' },
                { id: 'R3-M3', phase: 'Loser Ronda 3 (M3)', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R5-M0', nextMatchPos: 't2' }
            ]);
            // Round 4
            rounds.push([
                { id: 'R4-M0', phase: 'Loser Ronda 4', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R5-M0', nextMatchPos: 't1' }
            ]);
            // Round 5
            rounds.push([
                { id: 'R5-M0', phase: 'Loser Ronda 5', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R6-M0', nextMatchPos: 't1' }
            ]);
            // Round 6
            rounds.push([
                { id: 'R6-M0', phase: 'Final Loser Bracket', bracket: 'loser', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null, nextMatchId: 'R7-M0', nextMatchPos: 't2' }
            ]);
            // Round 7
            rounds.push([
                { id: 'R7-M0', phase: 'Final', bracket: 'final', t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null }
            ]);
        } else if (targetSize === 32) {
            // Programmatic schema generator for N = 32
            // Round 0
            const r0 = [];
            for (let m = 0; m < 15; m++) {
                const t1Seed = m + 2; 
                const t2Seed = 32 - m; 
                const targetOctavosM = m === 0 ? 0 : Math.floor((m - 1) / 2) + 1;
                const nextMatchPos = m === 0 ? 't2' : ((m - 1) % 2 === 0 ? 't1' : 't2');
                let nextLoserMatch = 8;
                if (m === 0) nextLoserMatch = 8;
                else if (m === 1 || m === 2) nextLoserMatch = 9;
                else if (m === 3 || m === 4) nextLoserMatch = 10;
                else if (m === 5 || m === 6) nextLoserMatch = 11;
                else if (m === 7 || m === 8) nextLoserMatch = 12;
                else if (m === 9 || m === 10) nextLoserMatch = 13;
                else if (m === 11 || m === 12) nextLoserMatch = 14;
                else if (m === 13 || m === 14) nextLoserMatch = 15;
                const nextLoserPos = m === 0 ? 't1' : (m % 2 !== 0 ? 't1' : 't2');
                r0.push({
                    id: `R0-M${m}`,
                    phase: `Winner Ronda 1 (M${m+1})`,
                    bracket: 'winner',
                    t1: topTeams[t1Seed - 1] || null,
                    t2: topTeams[t2Seed - 1] || null,
                    s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: `R1-M${targetOctavosM}`,
                    nextMatchPos: nextMatchPos,
                    nextLoserMatchId: `R1-M${nextLoserMatch}`,
                    nextLoserMatchPos: nextLoserPos
                });
            }
            rounds.push(r0);

            // Round 1
            const r1 = [];
            // Winner Octavos (M0 to M7)
            for (let m = 0; m < 8; m++) {
                r1.push({
                    id: `R1-M${m}`,
                    phase: m === 0 ? `Winner Ronda 2 (A vs W1)` : `Winner Ronda 2 (M${m+1})`,
                    bracket: 'winner',
                    t1: m === 0 ? topTeams[0] : null,
                    t2: null,
                    s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: `R2-M${Math.floor(m / 2)}`,
                    nextMatchPos: m % 2 === 0 ? 't1' : 't2',
                    nextLoserMatchId: `R2-M${m + 4}`,
                    nextLoserMatchPos: 't1'
                });
            }
            // Loser R1 (M8 to M15)
            for (let m = 8; m < 16; m++) {
                r1.push({
                    id: `R1-M${m}`,
                    phase: `Loser Ronda 1 (M${m - 7})`,
                    bracket: 'loser',
                    t1: null,
                    t2: m === 8 ? topTeams[16] || null : null, 
                    s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: `R2-M${m - 4}`, 
                    nextMatchPos: 't2'
                });
            }
            rounds.push(r1);

            // Round 2
            const r2 = [];
            // Winner Quarters (M0 to M3)
            for (let m = 0; m < 4; m++) {
                r2.push({
                    id: `R2-M${m}`,
                    phase: `Winner Ronda 3 (M${m+1})`,
                    bracket: 'winner',
                    t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: `R3-M${Math.floor(m / 2)}`,
                    nextMatchPos: m % 2 === 0 ? 't1' : 't2',
                    nextLoserMatchId: `R4-M${m + 1}`, 
                    nextLoserMatchPos: 't1'
                });
            }
            // Loser R2 (M4 to M11)
            for (let m = 4; m < 12; m++) {
                r2.push({
                    id: `R2-M${m}`,
                    phase: `Loser Ronda 2 (M${m - 3})`,
                    bracket: 'loser',
                    t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: `R3-M${Math.floor((m - 4) / 2) + 2}`, 
                    nextMatchPos: (m - 4) % 2 === 0 ? 't1' : 't2'
                });
            }
            rounds.push(r2);

            // Round 3
            const r3 = [];
            // Winner Semis (M0, M1)
            for (let m = 0; m < 2; m++) {
                r3.push({
                    id: `R3-M${m}`,
                    phase: `Winner Ronda 4 (M${m+1})`,
                    bracket: 'winner',
                    t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: 'R4-M0',
                    nextMatchPos: m === 0 ? 't1' : 't2',
                    nextLoserMatchId: `R6-M${m}`, 
                    nextLoserMatchPos: 't1'
                });
            }
            // Loser R3 (M2 to M5)
            for (let m = 2; m < 6; m++) {
                r3.push({
                    id: `R3-M${m}`,
                    phase: `Loser Ronda 3 (M${m - 1})`,
                    bracket: 'loser',
                    t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: `R4-M${m - 1}`, 
                    nextMatchPos: 't2'
                });
            }
            rounds.push(r3);

            // Round 4
            const r4 = [];
            // Winner Final (M0)
            r4.push({
                id: 'R4-M0',
                phase: 'Winner Final',
                bracket: 'winner',
                t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                nextMatchId: 'R9-M0',
                nextMatchPos: 't1',
                nextLoserMatchId: 'R8-M0',
                nextLoserMatchPos: 't1' 
            });
            // Loser R4 (M1 to M4)
            for (let m = 1; m < 5; m++) {
                r4.push({
                    id: `R4-M${m}`,
                    phase: `Loser Ronda 4 (M${m})`,
                    bracket: 'loser',
                    t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: `R5-M${Math.floor((m - 1) / 2)}`, 
                    nextMatchPos: (m - 1) % 2 === 0 ? 't1' : 't2'
                });
            }
            rounds.push(r4);

            // Round 5
            const r5 = [];
            // Loser R5 (M0, M1)
            for (let m = 0; m < 2; m++) {
                r5.push({
                    id: `R5-M${m}`,
                    phase: `Loser Ronda 5 (M${m+1})`,
                    bracket: 'loser',
                    t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: `R6-M${m}`, 
                    nextMatchPos: 't2'
                });
            }
            rounds.push(r5);

            // Round 6
            const r6 = [];
            // Loser Semis 1 (M0, M1)
            for (let m = 0; m < 2; m++) {
                r6.push({
                    id: `R6-M${m}`,
                    phase: `Loser Ronda 6 (M${m+1})`,
                    bracket: 'loser',
                    t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                    nextMatchId: 'R7-M0',
                    nextMatchPos: m === 0 ? 't1' : 't2'
                });
            }
            rounds.push(r6);

            // Round 7
            const r7 = [];
            // Loser Semis 2 (M0)
            r7.push({
                id: 'R7-M0',
                phase: 'Loser Ronda 7',
                bracket: 'loser',
                t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                nextMatchId: 'R8-M0',
                nextMatchPos: 't2'
            });
            rounds.push(r7);

            // Round 8
            const r8 = [];
            // Loser Final (M0)
            r8.push({
                id: 'R8-M0',
                phase: 'Final Loser Bracket',
                bracket: 'loser',
                t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null,
                nextMatchId: 'R9-M0',
                nextMatchPos: 't2'
            });
            rounds.push(r8);

            // Round 9
            const r9 = [];
            // Grand Final (M0)
            r9.push({
                id: 'R9-M0',
                phase: 'Final',
                bracket: 'final',
                t1: null, t2: null, s1: null, s2: null, s1_v: null, s2_v: null, p1: null, p2: null
            });
            rounds.push(r9);
        }
        
        state.bracketRounds = rounds;
    }

    function openPlayoffsSetupModal() {
        if (!state.groups || state.groups.length === 0) return;
        
        let totalTeams = 0;
        if (state.format === 'liga') {
            const table = getGroupTable(state.groups[0]);
            totalTeams = table.length;
        } else if (state.format === 'champions') {
            const cfg = getFormatConfig(state.participants.length);
            totalTeams = cfg.target;
        }

        // Ocultar modal de campeón inmediatamente para que no tape la interfaz
        const champModal = document.getElementById('champion-modal');
        if (champModal) {
            champModal.classList.add('hidden');
        }

        const playoffsSetupModal = document.getElementById('playoffs-setup-modal');
        const playoffsTypeSelect = document.getElementById('playoffs-type-select');
        
        if (playoffsTypeSelect) {
            playoffsTypeSelect.value = 'direct';
        }
        populatePlayoffsQtySelect(totalTeams, 'direct');
        updatePlayoffsInfoBanner('direct');

        if (playoffsSetupModal) {
            playoffsSetupModal.classList.remove('hidden');
        }
    }

    function populatePlayoffsQtySelect(totalTeams, selectedType) {
        const playoffsQtySelect = document.getElementById('playoffs-qty-select');
        if (!playoffsQtySelect) return;
        
        playoffsQtySelect.innerHTML = '';
        
        if (state.format === 'champions') {
            const opt = document.createElement('option');
            opt.value = totalTeams;
            opt.textContent = `${totalTeams} Equipos`;
            playoffsQtySelect.appendChild(opt);
            playoffsQtySelect.disabled = true;
            playoffsQtySelect.style.opacity = '0.6';
            playoffsQtySelect.style.cursor = 'not-allowed';
            return;
        }

        let sizes = [];
        if (selectedType === 'advantage') {
            sizes = [4, 5, 8, 16, 32];
            playoffsQtySelect.disabled = false;
            playoffsQtySelect.style.opacity = '1';
            playoffsQtySelect.style.cursor = 'default';
        } else {
            // Find maximum power of 2 that is <= totalTeams
            const validPowers = [2, 4, 8, 16, 32];
            let maxPower = 2;
            for (let v of validPowers) {
                if (v <= totalTeams) maxPower = v;
            }
            sizes = [maxPower];
            playoffsQtySelect.disabled = true;
            playoffsQtySelect.style.opacity = '0.6';
            playoffsQtySelect.style.cursor = 'not-allowed';
        }
        
        sizes.forEach(size => {
            if (size <= totalTeams) {
                const opt = document.createElement('option');
                opt.value = size;
                opt.textContent = `${size} Equipos`;
                playoffsQtySelect.appendChild(opt);
            }
        });
    }

    function updatePlayoffsInfoBanner(selectedType) {
        const playoffsInfoBanner = document.getElementById('playoffs-info-banner');
        if (!playoffsInfoBanner) return;
        
        if (selectedType === 'advantage') {
            playoffsInfoBanner.textContent = "🏆 Winner + Loser Bracket (Ventaja al 1°): Si pierdes en el Winner Bracket, caes al Loser Bracket para tener una segunda oportunidad. ¡El 1er lugar de la liga tiene ventaja especial y entra más tarde!";
            playoffsInfoBanner.style.color = '#FFD700';
            playoffsInfoBanner.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            playoffsInfoBanner.style.background = 'rgba(255, 215, 0, 0.1)';
        } else {
            playoffsInfoBanner.textContent = "⚔️ Eliminación Directa Estándar: Llave clásica basada en potencias de 2 (2, 4, 8, 16, 32 equipos). El que pierde un partido queda eliminado al instante.";
            playoffsInfoBanner.style.color = '#00F0FF';
            playoffsInfoBanner.style.borderColor = 'rgba(0, 240, 255, 0.3)';
            playoffsInfoBanner.style.background = 'rgba(0, 240, 255, 0.1)';
        }
    }

    function runPlayoffsTransition(targetSize, type) {
        if (!state.groups || state.groups.length === 0) return;
        
        let topTeams = [];
        if (state.format === 'liga') {
            const table = getGroupTable(state.groups[0]);
            topTeams = table.slice(0, targetSize).map(t => ({
                id: t.id,
                name: t.name,
                ptsAvg: 0,
                dgAvg: 0,
                gfAvg: 0,
                qualType: 'direct'
            }));
        } else if (state.format === 'champions') {
            const cfg = getFormatConfig(state.participants.length);
            const groupTables = state.groups.map(g => getGroupTable(g));
            topTeams = getQualifiersFromTables(groupTables, cfg);
            
            if (topTeams.length !== targetSize) {
                topTeams = topTeams.slice(0, targetSize);
            }
        }
        
        state.bracketRounds = [];
        
        if (type === 'advantage') {
            state.bracketFormatType = 'advantage';
            generateAdvantageBracket(topTeams, targetSize);
        } else {
            state.bracketFormatType = 'direct';
            const roundsCount = Math.log2(targetSize);
            for(let r=0; r<roundsCount; r++) {
                const matchesInRound = targetSize / Math.pow(2, r+1);
                const roundMatches = [];
                for(let m=0; m<matchesInRound; m++) {
                    roundMatches.push({
                        id: `R${r}-M${m}`,
                        t1: null, t2: null,
                        s1: null, s2: null,
                        s1_v: null, s2_v: null,
                        p1: null, p2: null,
                        nextMatchId: r < roundsCount - 1 ? `R${r+1}-M${Math.floor(m/2)}` : null,
                        nextMatchPos: m % 2 === 0 ? 't1' : 't2'
                    });
                }
                state.bracketRounds.push(roundMatches);
            }

            function getBracketOrder(numTeams) {
                if (numTeams === 2) return [1, 2];
                const half = getBracketOrder(numTeams / 2);
                const res = [];
                half.forEach(seed => {
                    res.push(seed);
                    res.push(numTeams - seed + 1);
                });
                return res;
            }

            const seedOrder = getBracketOrder(targetSize);
            for (let i = 0; i < targetSize / 2; i++) {
                const t1Rank = seedOrder[i * 2] - 1;
                const t2Rank = seedOrder[i * 2 + 1] - 1;
                state.bracketRounds[0][i].t1 = topTeams[t1Rank] || null;
                state.bracketRounds[0][i].t2 = topTeams[t2Rank] || null;
            }
        }

        state.bracketGenerated = true;
        
        // Hide modals
        const champModal = document.getElementById('champion-modal');
        if (champModal) champModal.classList.add('hidden');
        const setupModal = document.getElementById('playoffs-setup-modal');
        if (setupModal) setupModal.classList.add('hidden');

        // Update UI Context
        window.updateAppTheme();
        const btnMenuBracket = document.getElementById('btn-menu-bracket');
        const btnToBracketElement = document.getElementById('btn-to-bracket');
        if (btnMenuBracket) btnMenuBracket.classList.remove('hidden');
        if (btnToBracketElement) btnToBracketElement.classList.remove('hidden');
        
        // Update Bracket Select
        const bracketFormatSelect = document.getElementById('bracket-format-select');
        if(bracketFormatSelect) bracketFormatSelect.value = state.knockoutFormat;

        drawBracket();
        showView(document.getElementById('bracket-view'));
        if (typeof saveTournament === 'function') saveTournament();
    }

    const btnLigaToCopa = document.getElementById('btn-liga-to-copa');
    if (btnLigaToCopa) {
        btnLigaToCopa.addEventListener('click', () => {
            const champModal = document.getElementById('champion-modal');
            if (champModal) champModal.classList.add('hidden');
            
            if (state.leaguePlayoffFormat && state.leaguePlayoffFormat !== 'none') {
                if (!state.bracketGenerated) {
                    runPlayoffsTransition(state.leaguePlayoffQty, state.leaguePlayoffFormat);
                } else {
                    const bracketView = document.getElementById('bracket-view');
                    if (bracketView) showView(bracketView);
                }
            } else {
                openPlayoffsSetupModal();
            }
        });
    }
    
    const btnLigaPlayoffsInline = document.getElementById('btn-liga-playoffs-inline');
    if (btnLigaPlayoffsInline) {
        btnLigaPlayoffsInline.addEventListener('click', () => {
            if (state.bracketGenerated) {
                const bracketView = document.getElementById('bracket-view');
                if (bracketView) showView(bracketView);
            } else {
                if (state.isSpectator) {
                    showToast('Modo Espectador: Acción no permitida 👁️');
                    return;
                }
                if (state.leaguePlayoffFormat && state.leaguePlayoffFormat !== 'none') {
                    runPlayoffsTransition(state.leaguePlayoffQty, state.leaguePlayoffFormat);
                } else {
                    openPlayoffsSetupModal();
                }
            }
        });
    }

    const playoffsTypeSelect = document.getElementById('playoffs-type-select');
    if (playoffsTypeSelect) {
        playoffsTypeSelect.addEventListener('change', () => {
            if (!state.groups || state.groups.length === 0) return;
            let totalTeams = 0;
            if (state.format === 'liga') {
                const table = getGroupTable(state.groups[0]);
                totalTeams = table.length;
            } else if (state.format === 'champions') {
                const cfg = getFormatConfig(state.participants.length);
                totalTeams = cfg.target;
            }
            const selectedType = playoffsTypeSelect.value;

            populatePlayoffsQtySelect(totalTeams, selectedType);
            updatePlayoffsInfoBanner(selectedType);
        });
    }

    const btnCancelPlayoffs = document.getElementById('btn-cancel-playoffs');
    if (btnCancelPlayoffs) {
        btnCancelPlayoffs.addEventListener('click', () => {
            const setupModal = document.getElementById('playoffs-setup-modal');
            if (setupModal) setupModal.classList.add('hidden');
        });
    }

    const btnStartPlayoffs = document.getElementById('btn-start-playoffs');
    if (btnStartPlayoffs) {
        btnStartPlayoffs.addEventListener('click', () => {
            const playoffsQtySelect = document.getElementById('playoffs-qty-select');
            const targetSize = playoffsQtySelect ? parseInt(playoffsQtySelect.value) : 4;
            const typeSelect = document.getElementById('playoffs-type-select');
            const type = typeSelect ? typeSelect.value : 'direct';
            
            const matchFormatSelect = document.getElementById('playoffs-match-format-select');
            if (matchFormatSelect) {
                state.knockoutFormat = matchFormatSelect.value;
            }

            runPlayoffsTransition(targetSize, type);
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Update UI notify the user they can install the PWA
        showInstallPromotion();
    });

    async function handleInstallClick() {
        if (!deferredPrompt) {
            return;
        }
        // Hide our user interface that shows our A2HS button
        hideInstallPromotion();
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
    }

    if (btnHeroInstall) btnHeroInstall.addEventListener('click', handleInstallClick);
    if (btnMenuInstall) btnMenuInstall.addEventListener('click', () => {
        document.getElementById('btn-menu-toggle').click(); // close menu
        handleInstallClick();
    });

    window.addEventListener('appinstalled', (evt) => {
        // Log install to analytics
        console.log('INSTALL: Success', evt);
        deferredPrompt = null;
        hideInstallPromotion();
    });

    // Verificar si se ha accedido a la app usando un enlace directo de espectador (?join=FC-XXXX)
    async function checkAutoJoinUrl() {
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get('join') || params.get('code');
        if (joinCode) {
            const code = joinCode.trim().toUpperCase();
            showToast('Conectando al torneo... 👁️');
            
            try {
                const baseUrl = getBackendUrl();
                const response = await fetch(`${baseUrl}/api/tournaments/${code}`);
                const data = await response.json();

                if (data.success && data.tournament) {
                    const tData = data.tournament;
                    tData.isSpectator = true; // Activar el modo espectador
                    
                    // Limpiar estado e importar los nuevos datos
                    for (let key in state) delete state[key];
                    Object.assign(state, tData);
                    
                    // Limpiar el parámetro de la URL para que no moleste si recarga
                    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
                    window.history.replaceState({}, document.title, cleanUrl);

                    // Configurar rutas del menú
                    viewHistory.length = 0; 
                    viewHistory.push(document.getElementById('home-view'));
                    
                    if (state.bracketRounds && state.bracketRounds.length > 0 && (!state.groups || state.groups.length === 0)) {
                        drawBracket();
                        showView(bracketView, false);
                    } else if (state.groups && state.groups.length > 0) {
                        drawGroups();
                        if (state.bracketGenerated || (state.bracketRounds && state.bracketRounds.length > 0)) {
                            drawBracket();
                        }
                        showView(groupsView, false);
                    }
                    
                    showToast('Has entrado como Espectador 👁️');
                    
                    // Guardar en local storage para tenerlo disponible en "Mis Torneos"
                    let stored = JSON.parse(localStorage.getItem('torneos-fc-data') || '[]');
                    const existingIdx = stored.findIndex(t => t.id === state.id);
                    if (existingIdx >= 0) {
                        stored[existingIdx] = state;
                    } else {
                        stored.push(state);
                    }
                    localStorage.setItem('torneos-fc-data', JSON.stringify(stored));
                    initHome();
                } else {
                    showToast('No se encontró el torneo especificado en el enlace ❌');
                }
            } catch (err) {
                console.error('Error auto-joining:', err);
                showToast('Error al conectar con el enlace de espectador ❌');
            }
        }
    }

    // EXPLANATION DICTIONARY (Help & Explanations)
    const INFO_EXPLANATIONS = {
        'champions-format': {
            title: '⭐ Champions League',
            desc: 'Formato mixto que combina una Fase de Grupos seguida por una Fase Eliminatoria final (Playoffs).\n\n• Fase de Grupos: Los participantes se dividen en grupos y juegan todos contra todos dentro de su grupo.\n• Fase Eliminatoria: Los mejores clasificados de cada grupo avanzan a las llaves finales de eliminación directa.',
            example: 'Si son 16 jugadores, se arman 4 grupos de 4 personas. Los 2 mejores de cada grupo (8 en total) clasifican a Cuartos de Final.'
        },
        'liga-format': {
            title: '🏆 Modo Liga',
            desc: 'Formato de todos contra todos en una única tabla general de posiciones. Sumas 3 puntos por victoria, 1 por empate y 0 por derrota.\n\n• Al finalizar todos los partidos, el jugador que acumule más puntos se corona Campeón (o los mejores avanzan a Playoffs si activas esa opción).',
            example: 'Si son 8 jugadores, cada uno disputará 7 partidos (o 14 si eliges Ida y Vuelta). Al terminar la liga, quien quede 1° lugar gana el torneo.'
        },
        'tiebreak': {
            title: '⚖️ Criterio de Desempate en Tabla',
            desc: 'Define cómo se desempatan las posiciones entre dos o más equipos que obtengan la misma cantidad de puntos en la tabla de la liga:\n\n• Diferencia de Goles (DG): Se posiciona primero el equipo con mayor diferencia entre goles a favor y goles en contra.\n\n• Goles a Favor (GF): Se posiciona primero el equipo con mayor cantidad total de goles anotados.\n\n• Resultado Directo: Se compara directamente el marcador/puntos de los enfrentamientos jugados entre los equipos empatados.',
            example: 'Si Equipo A y Equipo B empatan en 10 puntos: con DG, un saldo de +5 le gana a +3. Con Resultado Directo, si Equipo A le ganó 2-1 a Equipo B, Equipo A queda arriba.'
        },
        'copa-format': {
            title: '⚔️ Copas y Llaves',
            desc: 'Torneo de eliminación directa pura desde el primer partido (Muerte súbita).\n\n• Quien gana su partido avanza a la siguiente ronda.\n• Quien pierde queda eliminado del torneo inmediatamente.',
            example: 'Con 8 jugadores se juegan Cuartos de Final (4 partidos). Los 4 ganadores pasan a Semifinales y los 2 vencedores disputan la Gran Final.'
        },
        'bracket-type': {
            title: '⚔️ Formatos de Llaves Eliminatorias',
            desc: 'Determina el tipo de estructura para las rondas finales:\n\n1. Eliminación Directa Estándar: Llave clásica donde el 1° de la tabla enfrenta al último clasificado (ej. 1° vs 8°, 2° vs 7°). Quien pierde queda fuera al instante.\n\n2. Winner + Loser Bracket (Ventaja al 1°): Formato de doble eliminación. Si pierdes tu primer partido NO quedas fuera, sino que caes al Repechaje (Loser Bracket) para intentar llegar a la final desde ahí. El 1° lugar de la fase previa recibe ventaja especial ingresando más tarde.',
            example: 'En Winner + Loser Bracket, si pierdes tu primer partido en el Cuadro Principal, caes al Cuadro de Repechaje donde aún puedes ser campeón si ganas tus siguientes duelos.'
        },
        'match-schedule': {
            title: '⚽ Modalidad de Partidos',
            desc: 'Define la cantidad de encuentros por enfrentamiento:\n\n• Partido Único: 1 solo partido directo. En eliminatorias, si empatan se define por penales.\n\n• Ida y Vuelta (Goles Acumulados): Se disputan 2 partidos seguidos por enfrentamiento (Ida y Vuelta). Avanza el equipo que sume más goles en el marcador global acumulado.\n\n• Ida y Vuelta (Mejor de 3): Serie donde gana el primer equipo en lograr 2 victorias. Si un equipo gana los 2 primeros partidos, avanza directamente sin necesidad de jugar el 3er partido.',
            example: 'En Mejor de 3: Si ganas el Partido 1 (2-1) y ganas el Partido 2 (1-0), sumas 2 victorias y ganas la serie 2-0.'
        },
        'league-theme': {
            title: '🎨 Selección de Liga (Temática)',
            desc: 'Aplica los colores, nombres y zonas reales de clasificación internacional o descenso a la tabla de posiciones.\n\n• Ligas Europeas: Destaca zonas de Champions League, Europa League y Conference League.\n• Ligas Sudamericanas: Destaca zonas de Copa Libertadores, Sudamericana y Descenso.\n• MLS: Destaca zona de clasificación a playoffs.',
            example: 'En la Premier League, los puestos 1° al 4° de la tabla se colorean en azul celestito (Zona Champions League) y los últimos 3 en rojo (Zona Descenso).'
        },
        'wildcards': {
            title: '🃏 Cupos Comodín (Mejores Siguientes)',
            desc: 'Son cupos extra de clasificación que se otorgan a los mejores equipos que NO alcanzaron a clasificar de forma directa en sus grupos.\n\n• La app compara el rendimiento de todos los posicionados en los siguientes puestos (ej. 3ros o 4tos lugares) y rescata a los mejores por puntos, diferencia de gol y goles a favor para completar los cupos requeridos en la eliminatoria.',
            example: 'En un torneo con 3 grupos donde avanzan 2 directos por grupo (6 clasificados), agregas 2 Cupos Comodín para rescatar a los 2 "Mejores Terceros" de todo el torneo. Así completas 8 clasificados para los Cuartos de Final.'
        }
    };

    function openInfoModal(key) {
        const info = INFO_EXPLANATIONS[key];
        if (!info) return;

        const modal = document.getElementById('info-modal');
        const titleEl = document.getElementById('info-modal-title');
        const descEl = document.getElementById('info-modal-desc');
        const exampleEl = document.getElementById('info-modal-example');

        if (modal && titleEl && descEl && exampleEl) {
            titleEl.textContent = info.title;
            descEl.innerText = info.desc;
            exampleEl.textContent = info.example;
            modal.classList.remove('hidden');
        }
    }

    const infoModal = document.getElementById('info-modal');
    const btnCloseInfo = document.getElementById('btn-close-info');
    const btnCloseInfoX = document.getElementById('btn-close-info-x');
    if (btnCloseInfo) btnCloseInfo.addEventListener('click', () => infoModal.classList.add('hidden'));
    if (btnCloseInfoX) btnCloseInfoX.addEventListener('click', () => infoModal.classList.add('hidden'));

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-info-icon');
        if (btn) {
            e.stopPropagation();
            const key = btn.getAttribute('data-info');
            if (key) openInfoModal(key);
        }
    });

    function updateDropdownInfoBanners() {
        const champTypeSelect = document.getElementById('champions-type-select');
        const champBanner = document.getElementById('champions-type-info-banner');
        if (champTypeSelect && champBanner) {
            if (champTypeSelect.value === 'advantage') {
                champBanner.innerHTML = '👑 <strong>Winner + Loser Bracket:</strong> Los clasificados tienen doble oportunidad (Repechaje si pierdes). El 1° lugar tiene ventaja especial.';
            } else {
                champBanner.innerHTML = '⚔️ <strong>Eliminación Directa Estándar:</strong> El 1° enfrente al último clasificado (ej: 1° vs 8°). Quien pierde un partido queda eliminado.';
            }
        }

        const copaSchedSelect = document.getElementById('copa-schedule-select');
        const copaBanner = document.getElementById('copa-schedule-info-banner');
        if (copaSchedSelect && copaBanner) {
            if (copaSchedSelect.value === 'best_of_3') {
                copaBanner.innerHTML = '🥊 <strong>Ida y Vuelta (Mejor de 3):</strong> Gana el primer equipo en lograr 2 victorias en la serie.';
            } else if (copaSchedSelect.value === 'double') {
                copaBanner.innerHTML = '🔄 <strong>Ida y Vuelta (Goles Acumulados):</strong> Se juegan 2 partidos por serie. Avanza quien anote más goles en el acumulado global.';
            } else {
                copaBanner.innerHTML = '⚽ <strong>Partido Único:</strong> 1 solo enfrentamiento directo por serie. En caso de empate se define por penales.';
            }
        }

        const leagueSchedSelect = document.getElementById('league-schedule-select');
        const leagueBanner = document.getElementById('league-schedule-info-banner');
        if (leagueSchedSelect && leagueBanner) {
            if (leagueSchedSelect.value === 'best_of_3') {
                leagueBanner.innerHTML = '🥊 <strong>Ida y Vuelta (Mejor de 3):</strong> 3 enfrentamientos directos contra cada rival de la liga.';
            } else if (leagueSchedSelect.value === 'double') {
                leagueBanner.innerHTML = '🔄 <strong>Ida y Vuelta (Goles Acumulados):</strong> 2 partidos contra cada rival de la liga (Local y Visitante).';
            } else {
                leagueBanner.innerHTML = '⚽ <strong>Solo Ida:</strong> 1 único enfrentamiento contra cada rival de la liga.';
            }
        }

        const leaguePlayoffsSelect = document.getElementById('league-playoffs-select');
        const leaguePlayoffsBanner = document.getElementById('league-playoffs-info-banner');
        if (leaguePlayoffsSelect && leaguePlayoffsBanner) {
            if (leaguePlayoffsSelect.value === 'advantage') {
                leaguePlayoffsBanner.innerHTML = '👑 <strong>Playoffs Doble Eliminación:</strong> Los mejores de la liga juegan Winner + Loser Bracket con ventaja al 1°.';
            } else if (leaguePlayoffsSelect.value === 'direct') {
                leaguePlayoffsBanner.innerHTML = '⚔️ <strong>Playoffs Eliminación Directa:</strong> Al terminar la liga, el 1° enfrente al último clasificado (ej: 1° vs 8°). Muerte súbita.';
            } else {
                leaguePlayoffsBanner.innerHTML = '📊 <strong>Sin Playoffs:</strong> El Campeón será directamente quien quede en 1° lugar en la tabla al finalizar los partidos.';
            }
        }
    }

    ['champions-type-select', 'copa-schedule-select', 'league-schedule-select', 'league-playoffs-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateDropdownInfoBanners);
    });
    updateDropdownInfoBanners();

    // Ejecutar comprobación en segundo plano tras inicializar la app
    setTimeout(checkAutoJoinUrl, 200);

    // Ejecutar la limpieza inicial tras completar la carga completa de elementos
    resetTournamentSetup();

    // Ejecutar tras un pequeño retraso
    setTimeout(checkResetPasswordUrl, 300);

});



