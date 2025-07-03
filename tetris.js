document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('nextPiece');
    const nextCtx = nextCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    
    // Configuração do jogo
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    nextCanvas.width = nextCanvas.clientWidth;
    nextCanvas.height = nextCanvas.clientHeight;

    const scale = 20;
    let rows, columns;

    function updateGridSize() {
        rows = Math.floor(canvas.height / scale);
        columns = Math.floor(canvas.width / scale);
    }
    updateGridSize();

    // Configuração de temas
    const themeColors = [
        { primary: '#FF4136', secondary: '#FF6B6B' },
        { primary: '#2ECC40', secondary: '#7CFC00' },
        { primary: '#0074D9', secondary: '#1E90FF' },
        { primary: '#FFDC00', secondary: '#FFD700' },
        { primary: '#B10DC9', secondary: '#9400D3' }
    ];
    let currentTheme = themeColors[0];
    document.documentElement.style.setProperty('--theme-primary', currentTheme.primary);
    document.documentElement.style.setProperty('--theme-secondary', currentTheme.secondary);

    // Sistema de conquistas
    const achievements = {
        quickClear: { name: "Destruidor", desc: "Limpar 4 linhas de uma vez", unlocked: false },
        speedster: { name: "Veloz", desc: "Alcançar nível 3", unlocked: false },
        noRotate: { name: "Purista", desc: "Completar 10 linhas sem rotacionar", unlocked: false }
    };
    let rotationCount = 0;
    let linesWithoutRotation = 0;

    // Efeitos sonoros
    const sounds = {
        rotate: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-game-click-1114.mp3'),
        clear: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3'),
        drop: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3'),
        gameOver: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-lose-2027.mp3')
    };

    // Estado do jogo
    let gameOver = false;
    let isPaused = false;
    let dropInterval = 1000;
    let dropCounter = 0;
    let lastTime = 0;
    let totalLinesCleared = 0;
    let score = 0;
    let level = 1;
    let board = Array(rows).fill().map(() => Array(columns).fill(0));
    let currentPiece = null;
    let nextPiece = null;

    // Peças do Tetris com cores dos temas
    const pieces = [
        { shape: [[1, 1, 1, 1]], color: 'var(--theme-primary)' },
        { shape: [[1, 1, 1], [0, 1, 0]], color: 'var(--theme-secondary)' },
        { shape: [[1, 1, 1], [1, 0, 0]], color: '#0074D9' },
        { shape: [[1, 1, 1], [0, 0, 1]], color: '#FFDC00' },
        { shape: [[1, 1], [1, 1]], color: '#B10DC9' },
        { shape: [[0, 1, 1], [1, 1, 0]], color: '#FF851B' },
        { shape: [[1, 1, 0], [0, 1, 1]], color: '#7FDBFF' }
    ];

    // Inicialização
    function init() {
        resetGame();
        spawnPiece();
        drawNextPiece();
        
        document.addEventListener('keydown', handleKeyPress);
        
        document.querySelectorAll('.control-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const controls = ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'p', 'r'];
                const fakeKeyEvent = { key: controls[index], preventDefault: () => {} };
                handleKeyPress(fakeKeyEvent);
            });
        });
        
        requestAnimationFrame(gameLoop);
    }

    // Game loop
    function gameLoop(time = 0) {
        if (gameOver || isPaused) return;
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            dropPiece();
            dropCounter = 0;
        }
        
        draw();
        requestAnimationFrame(gameLoop);
    }

    // Funções do jogo com melhorias
    function spawnPiece() {
        if (nextPiece) {
            currentPiece = {
                shape: nextPiece.shape,
                color: nextPiece.color,
                position: { x: Math.floor(columns / 2) - Math.floor(nextPiece.shape[0].length / 2), y: 0 }
            };
        } else {
            const randomIndex = Math.floor(Math.random() * pieces.length);
            currentPiece = {
                shape: pieces[randomIndex].shape,
                color: pieces[randomIndex].color,
                position: { x: Math.floor(columns / 2) - 1, y: 0 }
            };
        }

        const randomIndex = Math.floor(Math.random() * pieces.length);
        nextPiece = {
            shape: pieces[randomIndex].shape,
            color: pieces[randomIndex].color
        };

        if (checkCollision()) {
            gameOver = true;
            showGameOver();
        }
    }

    function showGameOver() {
        sounds.gameOver.play();
        alert(`Game Over! Pontuação: ${score}\nNível alcançado: ${level}`);
        resetGame();
    }

    function drawNextPiece() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        const blockSize = nextCanvas.width / 4;
        
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    nextCtx.fillStyle = nextPiece.color;
                    nextCtx.fillRect(
                        x * blockSize + 10, 
                        y * blockSize + 10, 
                        blockSize - 10, 
                        blockSize - 10
                    );
                    
                    nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    nextCtx.strokeRect(
                        x * blockSize + 10, 
                        y * blockSize + 10, 
                        blockSize - 10, 
                        blockSize - 10
                    );
                }
            });
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Desenha o tabuleiro com efeito de gradiente
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const gradient = ctx.createLinearGradient(
                        x * scale, y * scale,
                        x * scale + scale, y * scale + scale
                    );
                    gradient.addColorStop(0, value);
                    gradient.addColorStop(1, darkenColor(value, 20));
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                    
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.strokeRect(x * scale, y * scale, scale, scale);
                }
            });
        });

        // Desenha a peça atual com sombra
        if (currentPiece && !isPaused) {
            currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        ctx.fillStyle = currentPiece.color;
                        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                        ctx.shadowBlur = 10;
                        ctx.fillRect(
                            (currentPiece.position.x + x) * scale,
                            (currentPiece.position.y + y) * scale,
                            scale, 
                            scale
                        );
                        ctx.shadowColor = 'transparent';
                        
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                        ctx.strokeRect(
                            (currentPiece.position.x + x) * scale,
                            (currentPiece.position.y + y) * scale,
                            scale, 
                            scale
                        );
                    }
                });
            });
        }

        // Texto de pausa
        if (isPaused) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSADO', canvas.width / 2, canvas.height / 2);
            ctx.font = '20px Arial';
            ctx.fillText('Pressione P para continuar', canvas.width / 2, canvas.height / 2 + 40);
        }

        scoreElement.textContent = score;
        levelElement.textContent = level;
    }

    // Funções de controle do jogo com efeitos sonoros
    function dropPiece() {
        if (!currentPiece || isPaused) return;
        
        currentPiece.position.y++;
        if (checkCollision()) {
            currentPiece.position.y--;
            mergePiece();
            clearLines();
            spawnPiece();
            drawNextPiece();
            sounds.drop.play();
        }
    }

    function rotatePiece() {
        if (!currentPiece || isPaused) return;
        
        const originalShape = currentPiece.shape;
        currentPiece.shape = currentPiece.shape[0].map((_, i) => 
            currentPiece.shape.map(row => row[i]).reverse()
        );
        
        if (checkCollision()) {
            currentPiece.shape = originalShape;
        } else {
            sounds.rotate.play();
            rotationCount++;
        }
    }

    function movePiece(direction) {
        if (!currentPiece || isPaused) return;
        
        currentPiece.position.x += direction;
        if (checkCollision()) {
            currentPiece.position.x -= direction;
        }
    }

    function checkCollision() {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x] &&
                    (currentPiece.position.y + y >= rows ||
                     currentPiece.position.x + x < 0 ||
                     currentPiece.position.x + x >= columns ||
                     board[currentPiece.position.y + y][currentPiece.position.x + x])) {
                    return true;
                }
            }
        }
        return false;
    }

    function mergePiece() {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    board[currentPiece.position.y + y][currentPiece.position.x + x] = currentPiece.color;
                }
            });
        });
    }

    // Sistema de limpeza de linhas com efeitos visuais
    function clearLines() {
        let linesCleared = 0;
        
        for (let y = rows - 1; y >= 0; y--) {
            if (board[y].every(cell => cell)) {
                createLineClearEffect(y);
                board.splice(y, 1);
                board.unshift(Array(columns).fill(0));
                linesCleared++;
                y++;
            }
        }
        
        if (linesCleared > 0) {
            sounds.clear.play();
            score += [100, 300, 500, 800][linesCleared - 1] * level;
            totalLinesCleared += linesCleared;
            
            // Atualiza nível
            if (totalLinesCleared >= level * 10) {
                level++;
                levelElement.textContent = level;
                dropInterval = Math.max(200, dropInterval - 50);
                
                // Muda tema
                currentTheme = themeColors[level % themeColors.length];
                document.documentElement.style.setProperty('--theme-primary', currentTheme.primary);
                document.documentElement.style.setProperty('--theme-secondary', currentTheme.secondary);
            }
            
            // Verifica conquistas
            if (linesCleared >= 4 && !achievements.quickClear.unlocked) {
                achievements.quickClear.unlocked = true;
                showAchievement(achievements.quickClear);
            }
            
            if (level >= 3 && !achievements.speedster.unlocked) {
                achievements.speedster.unlocked = true;
                showAchievement(achievements.speedster);
            }
            
            // Efeito visual na pontuação
            scoreElement.classList.add('score-pop');
            setTimeout(() => scoreElement.classList.remove('score-pop'), 300);
        }
    }

    // Efeito visual ao limpar linha
    function createLineClearEffect(y) {
        const effectDuration = 300;
        const startTime = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / effectDuration, 1);
            
            ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * (1 - progress)})`;
            ctx.fillRect(0, y * scale, canvas.width, scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }

    // Mostra conquistas
    function showAchievement(achievement) {
        const achievementEl = document.createElement('div');
        achievementEl.className = 'achievement-notification';
        achievementEl.innerHTML = `
            <div class="achievement-badge">🏆</div>
            <div class="achievement-text">
                <strong>${achievement.name}</strong><br>
                <small>${achievement.desc}</small>
            </div>
        `;
        document.body.appendChild(achievementEl);
        
        setTimeout(() => {
            achievementEl.classList.add('show');
            setTimeout(() => {
                achievementEl.classList.remove('show');
                setTimeout(() => achievementEl.remove(), 500);
            }, 3000);
        }, 100);
    }

    function togglePause() {
        isPaused = !isPaused;
    }

    function resetGame() {
        board = Array(rows).fill().map(() => Array(columns).fill(0));
        score = 0;
        level = 1;
        totalLinesCleared = 0;
        dropInterval = 1000;
        gameOver = false;
        isPaused = false;
        spawnPiece();
        drawNextPiece();
    }

    function handleKeyPress(event) {
        if (gameOver) return;
        
        switch(event.key) {
            case 'ArrowLeft': movePiece(-1); break;
            case 'ArrowRight': movePiece(1); break;
            case 'ArrowDown': dropPiece(); break;
            case 'ArrowUp': rotatePiece(); break;
            case ' ': 
                while (!checkCollision()) currentPiece.position.y++;
                currentPiece.position.y--;
                mergePiece();
                clearLines();
                spawnPiece();
                drawNextPiece();
                break;
            case 'p': case 'P': togglePause(); break;
            case 'r': case 'R': resetGame(); break;
        }
        
        event.preventDefault();
    }

    // Função auxiliar para escurecer cores
    function darkenColor(color, percent) {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return '#' + (
            0x1000000 +
            (R < 0 ? 0 : R) * 0x10000 +
            (G < 0 ? 0 : G) * 0x100 +
            (B < 0 ? 0 : B)
        ).toString(16).slice(1);
    }

    init();
});