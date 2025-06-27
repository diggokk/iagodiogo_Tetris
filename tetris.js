document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('nextPiece');
    const nextCtx = nextCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    
    // Configuração do jogo
    const scale = 20;
    const rows = canvas.height / scale;
    const columns = canvas.width / scale;
    let gameOver = false;
    let isPaused = false;
    let dropInterval = 1000; // Intervalo inicial (1 segundo)
    let dropCounter = 0;
    let lastTime = 0;
    
    // Peças do Tetris com cores vibrantes
    const pieces = [
        { shape: [[1, 1, 1, 1]], color: '#FF4136' }, // I
        { shape: [[1, 1, 1], [0, 1, 0]], color: '#2ECC40' }, // T
        { shape: [[1, 1, 1], [1, 0, 0]], color: '#0074D9' }, // L
        { shape: [[1, 1, 1], [0, 0, 1]], color: '#FFDC00' }, // J
        { shape: [[1, 1], [1, 1]], color: '#B10DC9' }, // O
        { shape: [[0, 1, 1], [1, 1, 0]], color: '#FF851B' }, // S
        { shape: [[1, 1, 0], [0, 1, 1]], color: '#7FDBFF' }  // Z
    ];
    
    // Estado do jogo
    let score = 0;
    let level = 1;
    let board = Array(rows).fill().map(() => Array(columns).fill(0));
    let currentPiece = null;
    let nextPiece = null;
    
    // Inicialização
    function init() {
        resetGame();
        spawnPiece();
        drawNextPiece();
        
        document.addEventListener('keydown', handleKeyPress);
        
        // Configura os botões de controle
        document.querySelectorAll('.control-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const controls = ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'p', 'r'];
                const fakeKeyEvent = { key: controls[index], preventDefault: () => {} };
                handleKeyPress(fakeKeyEvent);
            });
        });
        
        requestAnimationFrame(gameLoop);
    }
    
    // Game loop usando requestAnimationFrame
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
    
    // Cria uma peça aleatória
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
                position: { x: Math.floor(columns / 2) - Math.floor(pieces[randomIndex].shape[0].length / 2), y: 0 }
            };
        }
        
        // Verifica se já perdeu ao criar nova peça
        if (checkCollision()) {
            gameOver = true;
            showGameOver();
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * pieces.length);
        nextPiece = {
            shape: pieces[randomIndex].shape,
            color: pieces[randomIndex].color
        };
    }
    
    // Função para mostrar a mensagem de Game Over
    function showGameOver() {
        alert(`Game Over! Pontuação: ${score}`);
        resetGame();
    }
    
    // Desenha a peça da próxima jogada
    function drawNextPiece() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        if (nextPiece) {
            const blockSize = nextCanvas.width / 4;
            const offsetX = (nextCanvas.width - (nextPiece.shape[0].length * blockSize)) / 2;
            const offsetY = (nextCanvas.height - (nextPiece.shape.length * blockSize)) / 2;
            
            nextPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const gradient = nextCtx.createLinearGradient(
                            offsetX + x * blockSize, 
                            offsetY + y * blockSize, 
                            offsetX + x * blockSize + blockSize, 
                            offsetY + y * blockSize + blockSize
                        );
                        gradient.addColorStop(0, nextPiece.color);
                        gradient.addColorStop(1, darkenColor(nextPiece.color, 20));
                        
                        nextCtx.fillStyle = gradient;
                        nextCtx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                        nextCtx.shadowBlur = 5;
                        nextCtx.fillRect(
                            offsetX + x * blockSize, 
                            offsetY + y * blockSize, 
                            blockSize, 
                            blockSize
                        );
                        
                        nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        nextCtx.lineWidth = 2;
                        nextCtx.strokeRect(
                            offsetX + x * blockSize, 
                            offsetY + y * blockSize, 
                            blockSize, 
                            blockSize
                        );
                        
                        nextCtx.shadowColor = 'transparent';
                    }
                });
            });
        }
    }
    
    // Escurece uma cor
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
    
    // Desenha o tabuleiro
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Desenha as peças fixas no tabuleiro
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const gradient = ctx.createLinearGradient(
                        x * scale, 
                        y * scale, 
                        x * scale + scale, 
                        y * scale + scale
                    );
                    gradient.addColorStop(0, value);
                    gradient.addColorStop(1, darkenColor(value, 20));
                    
                    ctx.fillStyle = gradient;
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
                    ctx.shadowBlur = 5;
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                    
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x * scale, y * scale, scale, scale);
                    
                    ctx.shadowColor = 'transparent';
                }
            });
        });
        
        // Desenha a peça atual
        if (currentPiece && !isPaused) {
            currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const gradient = ctx.createLinearGradient(
                            (currentPiece.position.x + x) * scale, 
                            (currentPiece.position.y + y) * scale, 
                            (currentPiece.position.x + x) * scale + scale, 
                            (currentPiece.position.y + y) * scale + scale
                        );
                        gradient.addColorStop(0, currentPiece.color);
                        gradient.addColorStop(1, darkenColor(currentPiece.color, 15));
                        
                        ctx.fillStyle = gradient;
                        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                        ctx.shadowBlur = 10;
                        ctx.fillRect(
                            (currentPiece.position.x + x) * scale, 
                            (currentPiece.position.y + y) * scale, 
                            scale, 
                            scale
                        );
                        
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(
                            (currentPiece.position.x + x) * scale, 
                            (currentPiece.position.y + y) * scale, 
                            scale, 
                            scale
                        );
                        
                        ctx.shadowColor = 'transparent';
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
            ctx.fillText('Clique P para continuar', canvas.width / 2, canvas.height / 2 + 40);
        }
        
        // Atualiza a pontuação no painel
        scoreElement.textContent = score;
    }
    
    // Movimenta a peça para baixo
    function dropPiece() {
        if (!currentPiece || isPaused) return;
        
        currentPiece.position.y++;
        if (checkCollision()) {
            currentPiece.position.y--;
            mergePiece();
            clearLines();
            spawnPiece();
            drawNextPiece();
        }
    }
    
    // Movimento rápido para baixo
    function hardDrop() {
        if (!currentPiece || isPaused) return;
        
        while (!checkCollision()) {
            currentPiece.position.y++;
        }
        currentPiece.position.y--;
        mergePiece();
        clearLines();
        spawnPiece();
        drawNextPiece();
    }
    
    // Rotaciona a peça
    function rotatePiece() {
        if (!currentPiece || isPaused) return;
        
        const originalShape = currentPiece.shape;
        // Transpõe a matriz e inverte as linhas para rotacionar
        const rotated = currentPiece.shape[0].map((_, i) => 
            currentPiece.shape.map(row => row[i]).reverse()
        );
        
        currentPiece.shape = rotated;
        
        // Verifica se a rotação causa colisão
        if (checkCollision()) {
            // Tenta mover para a esquerda ou direita para evitar colisão
            const originalX = currentPiece.position.x;
            
            currentPiece.position.x++;
            if (checkCollision()) {
                currentPiece.position.x -= 2;
                if (checkCollision()) {
                    currentPiece.position.x = originalX;
                    currentPiece.shape = originalShape; // Reverte se não conseguir
                }
            }
        }
    }
    
    // Movimenta a peça horizontalmente
    function movePiece(direction) {
        if (!currentPiece || isPaused) return;
        
        currentPiece.position.x += direction;
        if (checkCollision()) {
            currentPiece.position.x -= direction;
        }
    }
    
    // Verifica colisão
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
    
    // Funde a peça atual ao tabuleiro
    function mergePiece() {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    board[currentPiece.position.y + y][currentPiece.position.x + x] = currentPiece.color;
                }
            });
        });
    }
    
    // Limpa linhas completas
    function clearLines() {
        let linesCleared = 0;
        
        for (let y = rows - 1; y >= 0; y--) {
            if (board[y].every(cell => cell)) {
                board.splice(y, 1);
                board.unshift(Array(columns).fill(0));
                y++; // Re-verifica a linha atual depois do splice
                linesCleared++;
            }
        }
        
        // Atualiza pontuação e nível
        if (linesCleared > 0) {
            const points = [0, 40, 100, 300, 1200]; // Pontos por 0, 1, 2, 3, 4 linhas
            score += linesCleared * 100;
            scoreElement.textContent = score;
            
            // A cada 10 linhas aumenta o nível e dificuldade
            const newLevel = Math.floor(score / 1000) + 1;
            if (newLevel > level) {
                level = newLevel;
                dropInterval = Math.max(100, 1000 - (level - 1) * 100); // Diminui o intervalo até mínimo de 100ms
            }
        }
    }
    
    // Pausa/continua o jogo
    function togglePause() {
        isPaused = !isPaused;
    }
    
    // Reinicia o jogo
    function resetGame() {
        board = Array(rows).fill().map(() => Array(columns).fill(0));
        score = 0;
        level = 1;
        dropInterval = 1000;
        gameOver = false;
        isPaused = false;
        spawnPiece();
        drawNextPiece();
    }
    
    // Manipulador de teclado
    function handleKeyPress(event) {
        if (event.key === 'ArrowLeft') {
            movePiece(-1);
        } else if (event.key === 'ArrowRight') {
            movePiece(1);
        } else if (event.key === 'ArrowDown') {
            dropPiece();
        } else if (event.key === 'ArrowUp') {
            rotatePiece();
        } else if (event.key === ' ') {
            hardDrop();
        } else if (event.key.toLowerCase() === 'p') {
            togglePause();
        } else if (event.key.toLowerCase() === 'r') {
            resetGame();
        }
        
        event.preventDefault();
    }
    
    // Inicia o jogo
    init();
});
