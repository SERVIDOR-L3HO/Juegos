import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { GameManager } from '../../shared/game-manager.js';
import { auth, onAuthStateChanged } from '../../shared/firebase-config.js';
import { TouchControls, isMobileDevice } from '../../shared/touch-controls.js';

class RunnerGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.obstacles = [];
        this.coins = [];
        this.tunnelSegments = [];
        
        this.distance = 0;
        this.speed = 0.3;
        this.lane = 0;
        this.lanes = [-3, 0, 3];
        this.gameState = 'start';
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.isDucking = false;
        
        this.keys = {};
        this.gameManager = new GameManager('runner-3d');
        this.startTime = 0;
        this.touchControls = null;
        this.isMobile = isMobileDevice();
        
        this.init();
    }
    
    async init() {
        await this.gameManager.init();
        this.setupScene();
        this.setupPlayer();
        this.setupLights();
        this.createTunnel();
        this.setupEventListeners();
        this.updateUI();
        
        if (auth.currentUser && this.gameManager.playerData) {
            document.getElementById('highScore').textContent = this.gameManager.playerData.highScore || 0;
        }
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000033, 0.015);
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 5);
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }
    
    setupPlayer() {
        const geometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.3
        });
        this.player = new THREE.Mesh(geometry, material);
        this.player.position.set(0, 1, 0);
        this.scene.add(this.player);
    }
    
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const frontLight = new THREE.PointLight(0x00ffff, 2, 20);
        frontLight.position.set(0, 5, -10);
        this.scene.add(frontLight);
        
        const backLight = new THREE.DirectionalLight(0x4444ff, 0.5);
        backLight.position.set(0, 10, 20);
        this.scene.add(backLight);
    }
    
    createTunnel() {
        for (let i = 0; i < 40; i++) {
            this.addTunnelSegment(i * -10);
        }
    }
    
    addTunnelSegment(zPos) {
        const tubeGeometry = new THREE.TorusGeometry(8, 0.3, 8, 30);
        const tubeMaterial = new THREE.MeshPhongMaterial({
            color: 0x6600cc,
            emissive: 0x330066,
            wireframe: true
        });
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube.position.z = zPos;
        tube.rotation.x = Math.PI / 2;
        this.scene.add(tube);
        this.tunnelSegments.push(tube);
    }
    
    spawnObstacle(zPos) {
        const types = ['box', 'pyramid', 'bar'];
        const type = types[Math.floor(Math.random() * types.length)];
        let obstacle;
        
        if (type === 'box') {
            const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            const material = new THREE.MeshPhongMaterial({
                color: 0xff0000,
                emissive: 0x660000
            });
            obstacle = new THREE.Mesh(geometry, material);
            obstacle.userData.height = 1.5;
        } else if (type === 'pyramid') {
            const geometry = new THREE.ConeGeometry(1, 2, 4);
            const material = new THREE.MeshPhongMaterial({
                color: 0xff6600,
                emissive: 0x663300
            });
            obstacle = new THREE.Mesh(geometry, material);
            obstacle.userData.height = 2;
        } else {
            const geometry = new THREE.BoxGeometry(1.5, 0.5, 1);
            const material = new THREE.MeshPhongMaterial({
                color: 0xff00ff,
                emissive: 0x660066
            });
            obstacle = new THREE.Mesh(geometry, material);
            obstacle.position.y = 2.5;
            obstacle.userData.height = 0.5;
            obstacle.userData.isHigh = true;
        }
        
        const lane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        obstacle.position.set(lane, obstacle.userData.isHigh ? 2.5 : 0.75, zPos);
        obstacle.userData.type = 'obstacle';
        
        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
    }
    
    spawnCoin(zPos) {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 20);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        const coin = new THREE.Mesh(geometry, material);
        
        const lane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        coin.position.set(lane, 1.5, zPos);
        coin.rotation.x = Math.PI / 2;
        coin.userData.type = 'coin';
        coin.userData.rotation = 0;
        
        this.scene.add(coin);
        this.coins.push(coin);
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (this.gameState !== 'playing') return;
            
            this.keys[e.key] = true;
            
            if ((e.key === ' ' || e.key === 'ArrowUp') && !this.isJumping && !this.isDucking) {
                e.preventDefault();
                this.isJumping = true;
                this.jumpVelocity = 0.4;
            }
            
            if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && !this.isJumping) {
                this.isDucking = true;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                this.isDucking = false;
            }
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restartGame());
        
        onAuthStateChanged(auth, (user) => {
            if (user && this.gameManager.playerData) {
                document.getElementById('highScore').textContent = this.gameManager.playerData.highScore || 0;
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.startTime = Date.now();
        document.getElementById('startPanel').classList.add('hidden');
        this.gameManager.incrementGamesPlayed();
        this.animate();
    }
    
    restartGame() {
        this.distance = 0;
        this.speed = 0.3;
        this.lane = 0;
        this.gameState = 'playing';
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.isDucking = false;
        this.startTime = Date.now();
        
        this.obstacles.forEach(o => this.scene.remove(o));
        this.coins.forEach(c => this.scene.remove(c));
        this.obstacles = [];
        this.coins = [];
        
        this.player.position.set(0, 1, 0);
        
        document.getElementById('gameOverPanel').classList.add('hidden');
        this.updateUI();
        this.gameManager.incrementGamesPlayed();
        this.animate();
    }
    
    async gameOver() {
        this.gameState = 'gameover';
        const playTime = Math.floor((Date.now() - this.startTime) / 1000);
        await this.gameManager.addPlayTime(playTime);
        
        const finalDist = Math.floor(this.distance);
        document.getElementById('finalDistance').textContent = finalDist;
        
        const isNewHighScore = await this.gameManager.updateScore(finalDist);
        if (isNewHighScore) {
            document.getElementById('newHighScore').style.display = 'block';
            document.getElementById('highScore').textContent = finalDist + 'm';
        }
        
        const leaderboard = await this.gameManager.getLeaderboard(10);
        this.displayLeaderboard(leaderboard);
        
        document.getElementById('gameOverPanel').classList.remove('hidden');
    }
    
    displayLeaderboard(scores) {
        const list = document.getElementById('leaderboardList');
        list.innerHTML = '';
        
        scores.forEach((entry, index) => {
            const li = document.createElement('li');
            li.className = 'leaderboard-item';
            li.innerHTML = `
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${entry.userName}</span>
                <span class="leaderboard-score">${entry.score}m</span>
            `;
            list.appendChild(li);
        });
    }
    
    updateUI() {
        document.getElementById('distance').textContent = Math.floor(this.distance) + 'm';
        document.getElementById('speed').textContent = (this.speed / 0.3).toFixed(1) + 'x';
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.distance += this.speed;
        this.speed += 0.0001;
        
        const laneSpeed = 0.2;
        const targetX = this.lanes[this.lane];
        if (this.player.position.x < targetX) {
            this.player.position.x = Math.min(this.player.position.x + laneSpeed, targetX);
        } else if (this.player.position.x > targetX) {
            this.player.position.x = Math.max(this.player.position.x - laneSpeed, targetX);
        }
        
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            if (this.lane > 0 && !this.keys.leftProcessed) {
                this.lane--;
                this.keys.leftProcessed = true;
            }
        } else {
            this.keys.leftProcessed = false;
        }
        
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            if (this.lane < 2 && !this.keys.rightProcessed) {
                this.lane++;
                this.keys.rightProcessed = true;
            }
        } else {
            this.keys.rightProcessed = false;
        }
        
        if (this.isJumping) {
            this.player.position.y += this.jumpVelocity;
            this.jumpVelocity -= 0.02;
            
            if (this.player.position.y <= 1) {
                this.player.position.y = 1;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }
        
        if (this.isDucking) {
            this.player.scale.y = 0.5;
            this.player.position.y = 0.6;
        } else if (!this.isJumping) {
            this.player.scale.y = 1;
            this.player.position.y = 1;
        }
        
        this.tunnelSegments.forEach((segment, i) => {
            segment.position.z += this.speed;
            segment.rotation.z += 0.01;
            
            if (segment.position.z > 10) {
                segment.position.z = this.tunnelSegments[this.tunnelSegments.length - 1].position.z - 10;
                this.tunnelSegments.push(this.tunnelSegments.shift());
            }
        });
        
        if (Math.random() < 0.01) {
            this.spawnObstacle(-50 - Math.random() * 20);
        }
        if (Math.random() < 0.03) {
            this.spawnCoin(-30 - Math.random() * 20);
        }
        
        this.obstacles.forEach((obstacle, i) => {
            obstacle.position.z += this.speed;
            obstacle.rotation.y += 0.05;
            
            if (obstacle.position.z > 5) {
                this.scene.remove(obstacle);
                this.obstacles.splice(i, 1);
                return;
            }
            
            const playerBox = new THREE.Box3().setFromObject(this.player);
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            
            if (playerBox.intersectsBox(obstacleBox)) {
                this.gameOver();
            }
        });
        
        this.coins.forEach((coin, i) => {
            coin.position.z += this.speed;
            coin.userData.rotation += 0.1;
            coin.rotation.z = coin.userData.rotation;
            
            if (coin.position.z > 5) {
                this.scene.remove(coin);
                this.coins.splice(i, 1);
                return;
            }
            
            if (coin.position.distanceTo(this.player.position) < 1) {
                this.distance += 5;
                this.scene.remove(coin);
                this.coins.splice(i, 1);
            }
        });
        
        this.camera.position.z = this.player.position.z + 5;
        this.camera.position.x = this.player.position.x * 0.2;
        this.camera.lookAt(this.player.position.x, 0, -10);
        
        if (Math.floor(this.distance) % 50 === 0 && this.distance > 0) {
            this.updateUI();
        }
    }
    
    animate() {
        if (this.gameState !== 'playing') return;
        
        requestAnimationFrame(() => this.animate());
        this.update();
        this.updateUI();
        this.renderer.render(this.scene, this.camera);
    }
}

const game = new RunnerGame();
