# 🎮 Arcade 3D Pro - Plataforma de Juegos Web 3D

## Descripción General

Plataforma profesional de juegos 3D construida con **Three.js** y **Firebase**. Incluye 4 juegos completos con gráficos 3D, física, sistema de puntuación en tiempo real, autenticación de usuarios y tablas de clasificación globales.

## Tecnologías Utilizadas

- **Frontend 3D**: Three.js (WebGL)
- **Backend**: Firebase (Authentication, Realtime Database)
- **Servidor**: Python HTTP Server
- **Autenticación**: Google OAuth 2.0
- **Almacenamiento**: Firebase Realtime Database

## Estructura del Proyecto

```
.
├── index.html              # Página principal con todos los juegos
├── server.py               # Servidor HTTP Python
├── css/
│   └── main.css           # Estilos globales profesionales
├── shared/
│   ├── firebase-config.js # Configuración de Firebase
│   └── game-manager.js    # Sistema de gestión de juegos y datos
├── games/
│   ├── space-shooter/     # Juego 1: Disparador espacial 3D
│   │   ├── index.html
│   │   └── game.js
│   ├── runner-3d/         # Juego 2: Corredor infinito 3D
│   │   ├── index.html
│   │   └── game.js
│   ├── cube-jumper/       # Juego 3: Saltador de plataformas
│   │   ├── index.html
│   │   └── game.js
│   └── racing/            # Juego 4: Carreras 3D
│       ├── index.html
│       └── game.js
└── assets/               # Recursos (sonidos, modelos)
```

## Juegos Incluidos

### 1. 🚀 Space Shooter 3D
**Descripción**: Batalla espacial intensa donde destruyes asteroides y enemigos.

**Características**:
- Sistema de disparo con cooldown
- Enemigos con IA que disparan
- Asteroides con física rotacional
- Sistema de vidas
- Niveles progresivos
- Efectos de explosión con partículas

**Controles**:
- Flechas / WASD: Mover nave
- ESPACIO: Disparar
- P: Pausa

### 2. 🏃 Runner 3D
**Descripción**: Corre sin parar por un túnel 3D infinito esquivando obstáculos.

**Características**:
- Túnel procedural infinito
- Obstáculos de diferentes tipos (cajas, pirámides, barras)
- Sistema de carriles (3 líneas)
- Monedas coleccionables
- Velocidad incremental
- Salto y agacharse

**Controles**:
- Flechas Izq/Der o A/D: Cambiar de carril
- ESPACIO / Flecha Arriba: Saltar
- Flecha Abajo / S: Agacharse

### 3. 🎲 Cube Jumper
**Descripción**: Salta de plataforma en plataforma en un mundo flotante 3D.

**Características**:
- Plataformas generadas proceduralmente
- Sistema de salto con carga (mantener para saltar más lejos)
- Física de gravedad realista
- Sistema de combo
- Cámara rotacional
- Indicadores visuales de siguiente plataforma

**Controles**:
- ESPACIO / CLICK: Mantener para cargar salto, soltar para saltar
- Flechas Izq/Der: Rotar cámara

### 4. 🏎️ Racing 3D
**Descripción**: Carrera de velocidad en pista con checkpoints.

**Características**:
- Pista cerrada con curvas
- Sistema de física de vehículo
- 5 checkpoints a completar
- Barreras de seguridad
- Medición de tiempo precisa
- Controles realistas de aceleración y frenado

**Controles**:
- Flecha Arriba / W: Acelerar
- Flecha Abajo / S: Frenar/Reversa
- Flechas Izq/Der o A/D: Girar

## Sistema de Firebase

### Autenticación
- **Google OAuth**: Inicio de sesión con cuenta de Google
- Autenticación anónima opcional para jugar sin cuenta
- Gestión automática de sesiones

### Datos Guardados por Juego
Para cada juego, se guarda:
- `highScore`: Mejor puntuación
- `level`: Nivel máximo alcanzado
- `gamesPlayed`: Número de partidas jugadas
- `totalTime`: Tiempo total de juego (segundos)
- `lastPlayed`: Timestamp de última sesión
- `achievements`: Array de logros (futuro)

### Estructura de Base de Datos
```
firebase-database/
├── players/
│   └── {userId}/
│       └── games/
│           ├── space-shooter/
│           │   ├── highScore
│           │   ├── level
│           │   ├── gamesPlayed
│           │   └── totalTime
│           ├── runner-3d/
│           ├── cube-jumper/
│           └── racing/
└── leaderboards/
    ├── space-shooter/
    │   └── {entryId}/
    │       ├── userId
    │       ├── userName
    │       ├── score
    │       └── timestamp
    ├── runner-3d/
    ├── cube-jumper/
    └── racing/
```

## Características Técnicas

### Optimizaciones 3D
- **LOD (Level of Detail)**: Objetos distantes con menos detalle
- **Object Pooling**: Reutilización de objetos para mejor performance
- **Frustum Culling**: Solo renderiza objetos visibles
- **Shadow Mapping**: Sombras dinámicas en tiempo real

### Sistema de Partículas
- Explosiones con física
- Efectos de velocidad
- Rastros de movimiento

### Gestión de Estado
- Estados de juego: `start`, `playing`, `paused`, `gameover`
- Guardado automático periódico
- Sincronización en tiempo real con Firebase

### UI/UX
- HUD (Heads-Up Display) con información en tiempo real
- Paneles de inicio, pausa y game over
- Tablas de clasificación en vivo
- Animaciones y transiciones suaves
- Diseño responsive

## Cómo Ejecutar

1. **Iniciar el servidor**:
   ```bash
   python server.py
   ```

2. **Acceder a la plataforma**:
   - Página principal: `http://localhost:5000/`
   - Selecciona un juego y comienza a jugar

3. **Iniciar sesión** (opcional pero recomendado):
   - Click en "Iniciar Sesión con Google"
   - Tu progreso se guardará automáticamente

## Configuración de Firebase

El proyecto usa Firebase con las siguientes configuraciones:

- **Project ID**: `ligamx-daf3d`
- **Authentication**: Google OAuth habilitado
- **Database**: Firebase Realtime Database
- **Reglas de Seguridad**: Los jugadores solo pueden leer/escribir sus propios datos

### Reglas de Seguridad Recomendadas

```json
{
  "rules": {
    "players": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "leaderboards": {
      ".read": true,
      "$game": {
        ".write": "auth != null"
      }
    }
  }
}
```

## Deployment

El proyecto está configurado para **autoscale deployment** en Replit:
- Servidor Python optimizado para producción
- Cache control deshabilitado para iframe de Replit
- MIME types correctamente configurados
- Soporte para ES6 modules

## Próximas Características (Roadmap)

- [ ] Sistema de logros y badges
- [ ] Modos multijugador en tiempo real
- [ ] Más juegos (Puzzle 3D, Tower Defense, etc.)
- [ ] Sistema de rankings semanales/mensuales
- [ ] Personalización de avatares
- [ ] Modos de dificultad
- [ ] Efectos de sonido y música
- [ ] Soporte para gamepads/joysticks
- [ ] Sistema de monedas virtuales y tienda

## Créditos

- **Three.js**: Biblioteca 3D WebGL
- **Firebase**: Backend as a Service
- **Desarrollador**: Plataforma creada con IA para amigos

## Licencia

Proyecto educativo y de entretenimiento.
