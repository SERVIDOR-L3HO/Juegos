import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { GameManager, formatTime } from '../../shared/game-manager.js';
import { auth, onAuthStateChanged } from '../../shared/firebase-config.js';
import { TouchControls, isMobileDevice } from '../../shared/touch-controls.js';

class RacingGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.car = null;
        this.track = [];
        this.checkpoints = [];
        
        this.time = 0;
        this.startTime = 0;
        this.checkpointsPassed = 0;
        this.totalCheckpoints = 5;
        this.speed = 0;
        this.maxSpeed = 1.5;
        this.acceleration = 0.02;
        this.friction = 0.98;
        this.turnSpeed = 0;
        this.carAngle = 0;
        
        this.gameState = 'start';
        this.keys = {};
        this.gameManager = new GameManager('racing');
        this.touchControls = null;
        this.isMobile = isMobileDevice();
        
        this.init();
    }
    
    async init() {
        await this.gameManager.init();
        this.setupScene();
        this.setupCar();
        this.setupLights();
        this.createTrack();
        this.createCheckpoints();
        this.setupEventListeners();
        this.updateUI();
        
        if (auth.currentUser && this.gameManager.playerData && this.gameManager.playerData.highScore > 0) {
            document.getElementById('highScore').textContent = formatTime(this.gameManager.playerData.highScore);
        }
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 8, 12);
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
    }
    
    setupCar() {
        const carGroup = new THREE.Group();
        
        const bodyGeometry = new THREE.BoxGeometry(1.5, 0.6, 2.5);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0x660000
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        body.castShadow = true;
        carGroup.add(body);
        
        const roofGeometry = new THREE.BoxGeometry(1.2, 0.5, 1.2);
        const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
        roof.position.y = 0.85;
        roof.position.z = -0.2;
        roof.castShadow = true;
        carGroup.add(roof);
        
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        const wheelPositions = [
            [-0.8, 0, 0.8],
            [0.8, 0, 0.8],
            [-0.8, 0, -0.8],
            [0.8, 0, -0.8]
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            wheel.castShadow = true;
            carGroup.add(wheel);
        });
        
        const lightGeometry = new THREE.SphereGeometry(0.15);
        const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const lightPositions = [
            [-0.5, 0.3, 1.3],
            [0.5, 0.3, 1.3]
        ];
        
        lightPositions.forEach(pos => {
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(...pos);
            carGroup.add(light);
            
            const pointLight = new THREE.PointLight(0xffff00, 1, 10);
            pointLight.position.set(...pos);
            carGroup.add(pointLight);
        });
        
        this.car = carGroup;
        this.car.position.set(0, 0.5, 0);
        this.scene.add(this.car);
    }
    
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 30, 20);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
    }
    
    createTrack() {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x228b22,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        const trackPoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(20, 0, 0),
            new THREE.Vector3(30, 0, 15),
            new THREE.Vector3(25, 0, 30),
            new THREE.Vector3(10, 0, 35),
            new THREE.Vector3(-10, 0, 30),
            new THREE.Vector3(-20, 0, 15),
            new THREE.Vector3(-15, 0, 0),
            new THREE.Vector3(0, 0, 0)
        ];
        
        for (let i = 0; i < trackPoints.length - 1; i++) {
            const start = trackPoints[i];
            const end = trackPoints[i + 1];
            const length = start.distanceTo(end);
            
            const geometry = new THREE.BoxGeometry(6, 0.1, length);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0x444444
            });
            const segment = new THREE.Mesh(geometry, material);
            
            segment.position.copy(start).lerp(end, 0.5);
            segment.position.y = 0;
            
            const direction = new THREE.Vector3().subVectors(end, start);
            const angle = Math.atan2(direction.x, direction.z);
            segment.rotation.y = angle;
            
            segment.receiveShadow = true;
            this.scene.add(segment);
            this.track.push(segment);
        }
        
        trackPoints.forEach((point, i) => {
            if (i === 0 || i === trackPoints.length - 1) return;
            
            const barrierGeometry = new THREE.BoxGeometry(8, 1, 0.5);
            const barrierMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff0000,
                emissive: 0x660000
            });
            
            const barrier1 = new THREE.Mesh(barrierGeometry, barrierMaterial);
            const barrier2 = new THREE.Mesh(barrierGeometry, barrierMaterial);
            
            const perpendicular = new THREE.Vector3(-point.z, 0, point.x).normalize();
            
            barrier1.position.copy(point).add(perpendicular.clone().multiplyScalar(4));
            barrier1.position.y = 0.5;
            barrier2.position.copy(point).add(perpendicular.clone().multiplyScalar(-4));
            barrier2.position.y = 0.5;
            
            const angle = Math.atan2(point.x, point.z);
            barrier1.rotation.y = angle;
            barrier2.rotation.y = angle;
            
            barrier1.castShadow = true;
            barrier2.castShadow = true;
            
            this.scene.add(barrier1);
            this.scene.add(barrier2);
        });
    }
    
    createCheckpoints() {
        const checkpointPositions = [
            new THREE.Vector3(10, 1, 0),
            new THREE.Vector3(28, 1, 10),
            new THREE.Vector3(15, 1, 33),
            new THREE.Vector3(-10, 1, 25),
            new THREE.Vector3(-18, 1, 8)
        ];
        
        checkpointPositions.forEach((pos, i) => {
            const geometry = new THREE.RingGeometry(2, 2.5, 32);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });
            const checkpoint = new THREE.Mesh(geometry, material);
            checkpoint.position.copy(pos);
            checkpoint.rotation.x = Math.PI / 2;
            checkpoint.userData.index = i;
            checkpoint.userData.passed = false;
            
            this.scene.add(checkpoint);
            this.checkpoints.push(checkpoint);
        });
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restartGame());
        
        onAuthStateChanged(auth, (user) => {
            if (user && this.gameManager.playerData && this.gameManager.playerData.highScore > 0) {
                document.getElementById('highScore').textContent = formatTime(this.gameManager.playerData.highScore);
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
        this.time = 0;
        this.speed = 0;
        this.turnSpeed = 0;
        this.carAngle = 0;
        this.checkpointsPassed = 0;
        this.gameState = 'playing';
        this.startTime = Date.now();
        
        this.car.position.set(0, 0.5, 0);
        this.car.rotation.y = 0;
        
        this.checkpoints.forEach(cp => cp.userData.passed = false);
        
        document.getElementById('finishPanel').classList.add('hidden');
        this.updateUI();
        this.gameManager.incrementGamesPlayed();
        this.animate();
    }
    
    async finishRace() {
        this.gameState = 'finished';
        const finalTime = this.time;
        const playTime = Math.floor((Date.now() - this.startTime) / 1000);
        await this.gameManager.addPlayTime(playTime);
        
        document.getElementById('finalTime').textContent = formatTime(finalTime);
        
        const isNewHighScore = await this.gameManager.updateScore(finalTime);
        if (isNewHighScore) {
            document.getElementById('newHighScore').style.display = 'block';
            document.getElementById('highScore').textContent = formatTime(finalTime);
        }
        
        const leaderboard = await this.gameManager.getLeaderboard(10);
        this.displayLeaderboard(leaderboard);
        
        document.getElementById('finishPanel').classList.remove('hidden');
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
                <span class="leaderboard-score">${formatTime(entry.score)}</span>
            `;
            list.appendChild(li);
        });
    }
    
    updateUI() {
        document.getElementById('time').textContent = formatTime(this.time);
        document.getElementById('speed').textContent = Math.floor(Math.abs(this.speed) * 100);
        document.getElementById('checkpoint').textContent = `${this.checkpointsPassed}/${this.totalCheckpoints}`;
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.time += 1/60;
        
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            this.speed = Math.min(this.speed + this.acceleration, this.maxSpeed);
        }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            this.speed = Math.max(this.speed - this.acceleration, -this.maxSpeed * 0.5);
        }
        
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.turnSpeed = 0.05;
        } else if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.turnSpeed = -0.05;
        } else {
            this.turnSpeed *= 0.9;
        }
        
        this.speed *= this.friction;
        
        if (Math.abs(this.speed) > 0.1) {
            this.carAngle += this.turnSpeed * Math.abs(this.speed);
        }
        
        this.car.rotation.y = this.carAngle;
        
        const forward = new THREE.Vector3(
            Math.sin(this.carAngle),
            0,
            Math.cos(this.carAngle)
        );
        
        this.car.position.add(forward.multiplyScalar(this.speed));
        
        this.checkpoints.forEach((checkpoint, i) => {
            if (!checkpoint.userData.passed) {
                const distance = this.car.position.distanceTo(checkpoint.position);
                if (distance < 3) {
                    checkpoint.userData.passed = true;
                    checkpoint.material.color.setHex(0x0000ff);
                    this.checkpointsPassed++;
                    
                    if (this.checkpointsPassed >= this.totalCheckpoints) {
                        this.finishRace();
                    }
                }
            }
            
            checkpoint.rotation.z += 0.02;
        });
        
        const cameraOffset = new THREE.Vector3(
            Math.sin(this.carAngle) * -8,
            6,
            Math.cos(this.carAngle) * -8
        );
        
        this.camera.position.copy(this.car.position).add(cameraOffset);
        this.camera.lookAt(this.car.position);
        
        this.updateUI();
    }
    
    animate() {
        if (this.gameState !== 'playing') return;
        
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

const game = new RacingGame();
