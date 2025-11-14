import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { GameManager } from '../../shared/game-manager.js';
import { auth, onAuthStateChanged } from '../../shared/firebase-config.js';
import { TouchControls, isMobileDevice } from '../../shared/touch-controls.js';

class CubeJumperGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.platforms = [];
        this.currentPlatform = null;
        this.nextPlatform = null;
        
        this.score = 0;
        this.combo = 0;
        this.gameState = 'start';
        this.isJumping = false;
        this.jumpPower = 0;
        this.jumpChargeTime = 0;
        this.maxJumpPower = 8;
        this.gravity = 0.3;
        this.velocity = new THREE.Vector3();
        this.cameraAngle = 0;
        
        this.keys = {};
        this.mouseDown = false;
        this.gameManager = new GameManager('cube-jumper');
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
        this.createInitialPlatforms();
        this.setupEventListeners();
        this.updateUI();
        
        if (auth.currentUser && this.gameManager.playerData) {
            document.getElementById('highScore').textContent = this.gameManager.playerData.highScore || 0;
        }
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 30, 100);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 15, 15);
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
    }
    
    setupPlayer() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0066,
            emissive: 0x660033
        });
        this.player = new THREE.Mesh(geometry, material);
        this.player.castShadow = true;
        this.player.position.set(0, 1, 0);
        this.scene.add(this.player);
    }
    
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }
    
    createPlatform(position, color = null) {
        const size = 2 + Math.random() * 2;
        const height = 0.5;
        const geometry = new THREE.BoxGeometry(size, height, size);
        const material = new THREE.MeshPhongMaterial({
            color: color || this.getRandomColor()
        });
        const platform = new THREE.Mesh(geometry, material);
        platform.position.copy(position);
        platform.receiveShadow = true;
        platform.castShadow = true;
        platform.userData.size = size;
        
        this.scene.add(platform);
        this.platforms.push(platform);
        
        return platform;
    }
    
    getRandomColor() {
        const colors = [0x6366f1, 0x8b5cf6, 0xec4899, 0x10b981, 0xf59e0b, 0x3b82f6];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    createInitialPlatforms() {
        this.currentPlatform = this.createPlatform(new THREE.Vector3(0, 0, 0), 0x10b981);
        this.spawnNextPlatform();
    }
    
    spawnNextPlatform() {
        const distance = 3 + Math.random() * 4;
        const angle = Math.random() * Math.PI * 2;
        const height = -1 + Math.random() * 2;
        
        const x = this.currentPlatform.position.x + Math.cos(angle) * distance;
        const y = this.currentPlatform.position.y + height;
        const z = this.currentPlatform.position.z + Math.sin(angle) * distance;
        
        this.nextPlatform = this.createPlatform(new THREE.Vector3(x, y, z));
        
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 20);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        const indicator = new THREE.Mesh(geometry, material);
        indicator.position.copy(this.nextPlatform.position);
        indicator.position.y += 3;
        this.nextPlatform.userData.indicator = indicator;
        this.scene.add(indicator);
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (this.gameState === 'playing' && (e.key === ' ') && !this.isJumping) {
                e.preventDefault();
                this.startCharging();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            
            if (this.gameState === 'playing' && e.key === ' ' && !this.isJumping) {
                this.jump();
            }
        });
        
        window.addEventListener('mousedown', () => {
            if (this.gameState === 'playing' && !this.isJumping) {
                this.mouseDown = true;
                this.startCharging();
            }
        });
        
        window.addEventListener('mouseup', () => {
            if (this.gameState === 'playing' && this.mouseDown && !this.isJumping) {
                this.mouseDown = false;
                this.jump();
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
    
    startCharging() {
        this.jumpChargeTime = Date.now();
    }
    
    jump() {
        if (!this.nextPlatform) return;
        
        const chargeTime = Math.min(Date.now() - this.jumpChargeTime, 1000);
        this.jumpPower = (chargeTime / 1000) * this.maxJumpPower + 2;
        
        const direction = new THREE.Vector3()
            .subVectors(this.nextPlatform.position, this.player.position)
            .normalize();
        
        this.velocity.copy(direction.multiplyScalar(this.jumpPower * 0.15));
        this.velocity.y = this.jumpPower * 0.15;
        this.isJumping = true;
        
        this.player.material.emissiveIntensity = 1;
    }
    
    startGame() {
        this.gameState = 'playing';
        this.startTime = Date.now();
        document.getElementById('startPanel').classList.add('hidden');
        this.gameManager.incrementGamesPlayed();
        this.animate();
    }
    
    restartGame() {
        this.platforms.forEach(p => {
            this.scene.remove(p);
            if (p.userData.indicator) this.scene.remove(p.userData.indicator);
        });
        this.platforms = [];
        
        this.score = 0;
        this.combo = 0;
        this.gameState = 'playing';
        this.isJumping = false;
        this.jumpPower = 0;
        this.velocity.set(0, 0, 0);
        this.player.position.set(0, 1, 0);
        this.cameraAngle = 0;
        this.startTime = Date.now();
        
        this.createInitialPlatforms();
        document.getElementById('gameOverPanel').classList.add('hidden');
        this.updateUI();
        this.gameManager.incrementGamesPlayed();
        this.animate();
    }
    
    async gameOver() {
        this.gameState = 'gameover';
        const playTime = Math.floor((Date.now() - this.startTime) / 1000);
        await this.gameManager.addPlayTime(playTime);
        
        document.getElementById('finalScore').textContent = this.score;
        
        const isNewHighScore = await this.gameManager.updateScore(this.score);
        if (isNewHighScore) {
            document.getElementById('newHighScore').style.display = 'block';
            document.getElementById('highScore').textContent = this.score;
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
                <span class="leaderboard-score">${entry.score}</span>
            `;
            list.appendChild(li);
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('combo').textContent = this.combo + 'x';
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        if (this.keys['ArrowLeft']) {
            this.cameraAngle += 0.02;
        }
        if (this.keys['ArrowRight']) {
            this.cameraAngle -= 0.02;
        }
        
        if (this.isJumping) {
            this.player.position.add(this.velocity);
            this.velocity.y -= this.gravity * 0.016;
            
            this.player.rotation.x += 0.1;
            this.player.rotation.z += 0.05;
            
            this.player.material.emissiveIntensity = Math.max(0.1, this.player.material.emissiveIntensity - 0.02);
            
            if (this.player.position.y < -20) {
                this.gameOver();
                return;
            }
            
            if (this.nextPlatform) {
                const distanceToPlatform = this.player.position.distanceTo(this.nextPlatform.position);
                const platformRadius = this.nextPlatform.userData.size / 2;
                
                if (distanceToPlatform < platformRadius + 1 && 
                    Math.abs(this.player.position.y - this.nextPlatform.position.y) < 1 &&
                    this.velocity.y < 0) {
                    
                    this.player.position.y = this.nextPlatform.position.y + 0.5;
                    this.isJumping = false;
                    this.velocity.set(0, 0, 0);
                    this.player.rotation.set(0, 0, 0);
                    
                    this.score += 10 + this.combo * 5;
                    this.combo++;
                    this.updateUI();
                    
                    if (this.currentPlatform.userData.indicator) {
                        this.scene.remove(this.currentPlatform.userData.indicator);
                    }
                    
                    const oldPlatform = this.platforms[0];
                    if (this.platforms.length > 5) {
                        this.scene.remove(oldPlatform);
                        if (oldPlatform.userData.indicator) {
                            this.scene.remove(oldPlatform.userData.indicator);
                        }
                        this.platforms.shift();
                    }
                    
                    this.currentPlatform = this.nextPlatform;
                    this.spawnNextPlatform();
                }
            }
        } else {
            this.combo = 0;
        }
        
        if (this.nextPlatform && this.nextPlatform.userData.indicator) {
            this.nextPlatform.userData.indicator.rotation.y += 0.05;
            this.nextPlatform.userData.indicator.position.y += Math.sin(Date.now() * 0.003) * 0.02;
        }
        
        const targetPos = this.player.position.clone();
        const radius = 15;
        this.camera.position.x = targetPos.x + Math.sin(this.cameraAngle) * radius;
        this.camera.position.z = targetPos.z + Math.cos(this.cameraAngle) * radius;
        this.camera.position.y = targetPos.y + 10;
        this.camera.lookAt(targetPos);
    }
    
    animate() {
        if (this.gameState !== 'playing') return;
        
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

const game = new CubeJumperGame();
