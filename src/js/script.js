// ゲーム状態の管理
class BingoGame {
    constructor() {
        this.availableNumbers = Array.from({length: 75}, (_, i) => i + 1);
        this.drawnNumbers = [];
        this.isDrawing = false;
        
        // DOM要素の取得
        this.drawButton = document.getElementById('drawButton');
        this.numberDisplay = document.getElementById('numberDisplay');
        this.statusText = document.getElementById('statusText');
        this.historyContainer = document.getElementById('historyContainer');
        this.remainingCount = document.getElementById('remainingCount');
        
        // イベントリスナーの設定
        this.drawButton.addEventListener('click', () => this.drawNumber());
        
        // 音声コンテキストの初期化（ユーザー操作後に有効化）
        this.audioContext = null;
        this.initAudioContext();
    }
    
    // 音声コンテキストの初期化
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API is not supported in this browser');
        }
    }
    
    // ドラムロール音の生成と再生
    playDrumRoll() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // ドラムロール風の低音
        oscillator.frequency.value = 80;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        
        return { oscillator, gainNode };
    }
    
    // ドラムロール音の停止
    stopDrumRoll(sound) {
        if (!sound) return;
        
        const { oscillator, gainNode } = sound;
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    // 当選音の再生
    playWinSound() {
        if (!this.audioContext) return;
        
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (高)
        
        notes.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const startTime = this.audioContext.currentTime + index * 0.1;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.5);
        });
    }
    
    // ビンゴの列を判定（B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75）
    getBingoColumn(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }
    
    // ボールの色クラスを取得
    getBallColorClass(number) {
        const column = this.getBingoColumn(number);
        return `ball-${column.toLowerCase()}`;
    }
    
    // 数字を引く処理
    async drawNumber() {
        // すでに抽選中、または全ての数字が出た場合は何もしない
        if (this.isDrawing || this.availableNumbers.length === 0) {
            if (this.availableNumbers.length === 0) {
                this.statusText.textContent = '全ての数字が出ました！';
            }
            return;
        }
        
        this.isDrawing = true;
        this.drawButton.disabled = true;
        this.statusText.textContent = '抽選中...';
        
        // ドラムロール音を開始
        const drumRollSound = this.playDrumRoll();
        
        // ルーレットアニメーション
        await this.rouletteAnimation();
        
        // ドラムロール音を停止
        this.stopDrumRoll(drumRollSound);
        
        // ランダムに数字を選択
        const randomIndex = Math.floor(Math.random() * this.availableNumbers.length);
        const selectedNumber = this.availableNumbers[randomIndex];
        
        // 選択された数字を配列から削除
        this.availableNumbers.splice(randomIndex, 1);
        this.drawnNumbers.push(selectedNumber);
        
        // 数字を表示
        this.numberDisplay.textContent = selectedNumber;
        this.numberDisplay.classList.remove('spinning');
        this.numberDisplay.classList.add('reveal', 'pulse-effect', 'shine-effect');
        
        // 当選音を再生
        this.playWinSound();
        
        // アニメーションクラスを削除
        setTimeout(() => {
            this.numberDisplay.classList.remove('reveal', 'pulse-effect', 'shine-effect');
        }, 2000);
        
        // 履歴に追加
        this.addToHistory(selectedNumber);
        
        // 残り数を更新
        this.remainingCount.textContent = this.availableNumbers.length;
        
        // ステータステキストを更新
        const column = this.getBingoColumn(selectedNumber);
        this.statusText.textContent = `${column} - ${selectedNumber}`;
        
        // ボタンを再度有効化
        this.isDrawing = false;
        if (this.availableNumbers.length > 0) {
            this.drawButton.disabled = false;
        } else {
            this.statusText.textContent = '全ての数字が出ました！🎉';
        }
    }
    
    // ルーレットアニメーション
    async rouletteAnimation() {
        const duration = 3000; // 3秒間
        const startTime = Date.now();
        let lastNumber = 0;
        
        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress < 1) {
                    // 進行度に応じて速度を落とす（二次関数的に減速）
                    const speed = Math.max(50, 500 * (1 - progress) * (1 - progress));
                    
                    // ランダムな数字を表示（まだ出ていない数字から）
                    if (this.availableNumbers.length > 0) {
                        const randomIndex = Math.floor(Math.random() * this.availableNumbers.length);
                        const randomNumber = this.availableNumbers[randomIndex];
                        
                        if (randomNumber !== lastNumber) {
                            this.numberDisplay.textContent = randomNumber;
                            this.numberDisplay.classList.add('spinning');
                            lastNumber = randomNumber;
                        }
                    }
                    
                    setTimeout(animate, speed);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }
    
    // 履歴にボールを追加
    addToHistory(number) {
        const ball = document.createElement('div');
        ball.className = `ball ${this.getBallColorClass(number)}`;
        ball.textContent = number;
        ball.title = `${this.getBingoColumn(number)} - ${number}`;
        
        // 履歴の先頭に追加（最新が上に来るように）
        this.historyContainer.insertBefore(ball, this.historyContainer.firstChild);
        
        // スクロールを一番上に
        this.historyContainer.scrollTop = 0;
    }
}

// ゲームの初期化
document.addEventListener('DOMContentLoaded', () => {
    const game = new BingoGame();
    
    // 音声コンテキストを最初のユーザー操作で有効化
    document.body.addEventListener('click', () => {
        if (game.audioContext && game.audioContext.state === 'suspended') {
            game.audioContext.resume();
        }
    }, { once: true });
});
