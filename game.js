  import * as THREE from 'https://esm.sh/three@0.160.0';

  let scene, camera, renderer;
  let player, velocity, canJump = false;
  let pitchObject, yawObject;
  const keys = {};
  const playerSize = 1;

  const platforms = [];
  const gravity = 0.01;
  const jumpStrength = 0.2;
  const fallThreshold = -10;

  const baseSpeed = 0.125;
  const acceleration = 0.2;    // Slightly faster acceleration
  const deceleration = 0.15;   // Slower deceleration for smooth stop

  let slideSpeed = 0;
  const maxSlideSpeed = 0.12;  // Slightly faster slide
  const slideDecay = 0.008;    // Smooth decay
  const maxSlideTime = 60;
  let slideTimer = 0;
  let isSliding = false;

  let justRespawned = 0;
  let spawnPosition = new THREE.Vector3(0, 5, 0);

  // To prevent jump holding repeat:
  let jumpPressedLastFrame = false;
  
  //to make sliding better
  let hasSlideBoosted = false;


  init();
  animate();

  function init() {
    scene = new THREE.Scene();
    
    // Improved lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 20);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    
    // Shadow quality settings
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    
    // THIS IS THE KEY LINE FOR SHADOW DARKNESS
    directionalLight.shadow.darkness = 0; // Change this value (0-1) to adjust shadow darkness
    
      scene.add(directionalLight);

    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    pitchObject = new THREE.Object3D();
    pitchObject.add(camera);
    yawObject = new THREE.Object3D();
    yawObject.position.y = playerSize;
    yawObject.add(pitchObject);

    player = new THREE.Object3D();
    velocity = new THREE.Vector3();
    player.add(yawObject);
    scene.add(player);

    // Load map
    let rawMap = [];
    try {
      rawMap = JSON.parse(localStorage.getItem('mapData') || '[]');
    } catch (e) {
      console.warn("Invalid mapData JSON.");
    }
    let mapData = Array.isArray(rawMap) ? { objects: rawMap } : rawMap;

    // Set spawn position
    const spawn = Array.isArray(mapData.objects) ? mapData.objects.find(o => o.type === 'PlayerSpawn') : null;
    if (spawn && Array.isArray(spawn.position)) {
      spawnPosition.set(...spawn.position);
    }
    player.position.copy(spawnPosition);

    // Texture loader
    const loader = new THREE.TextureLoader();
    const texture = loader.load('https://cdn.glitch.global/8c3c2ac5-dbc2-496b-94c7-e63c1a54bb92/texture_01.png?v=1748571085535');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    // Create platforms with StandardMaterial
    if (Array.isArray(mapData.objects)) {
      mapData.objects.forEach(obj => {
        if (obj.type === 'Platform') {
          const geo = new THREE.BoxGeometry(1,1,1);
          const mat = new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.7,
            metalness: 0.1
          });
          const mesh = new THREE.Mesh(geo, mat);

          mesh.position.set(...obj.position);
          mesh.rotation.set(...obj.rotation.slice(0,3));
          mesh.scale.set(...obj.scale);

          mesh.userData.subType = obj.subType || 'ground';
          mesh.userData.boundingBox = new THREE.Box3().setFromObject(mesh);
          
          // Enable shadows for platforms
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          scene.add(mesh);
          platforms.push(mesh);
          
// Modify the light creation in game.js
else if (obj.type === 'Light') {

  const light = new THREE.PointLight(
    obj.color || 0xffffff,
    1,                    // Intensity
    obj.range || 10,      // Use saved range or default
    2                     // Decay
  );
  light.position.set(...obj.position);
  light.castShadow = true;
  
      light.shadow.mapSize.width = 512;
      light.shadow.mapSize.height = 512;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 20;
  
  // Remove the visual indicator in game
  // (Don't add any mesh, just the light)
  
  scene.add(light);
}
  });
}
    
    
    // Create renderer with shadow support
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
        document.body.appendChild(renderer.domElement);

    document.addEventListener('keydown', e => keys[e.code] = true);
    document.addEventListener('keyup', e => keys[e.code] = false);

    const instructions = document.getElementById('instructions');
    instructions.addEventListener('click', () => {
      instructions.style.display = 'none';
      renderer.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === renderer.domElement) {
        document.addEventListener('mousemove', onMouseMove, false);
      } else {
        document.removeEventListener('mousemove', onMouseMove, false);
        instructions.style.display = 'flex';
      }
    });
  }

  function onMouseMove(event) {
    yawObject.rotation.y -= (event.movementX || 0) * 0.002;
    pitchObject.rotation.x -= (event.movementY || 0) * 0.002;
    pitchObject.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitchObject.rotation.x));
  }

  
//skybox
  const skyboxTexture = new THREE.CubeTextureLoader().load([
  'images/px.png',
  'images/nx.png',
  'images/py.png',
  'images/ny.png',
  'images/pz.png',
  'images/nz.png'
]);
scene.background = skyboxTexture;
  
  function update() {
// 1) Handle horizontal input and sliding
const moveDir = new THREE.Vector3();
if (keys['KeyW']) moveDir.z -= 1;
if (keys['KeyS']) moveDir.z += 1;
if (keys['KeyA']) moveDir.x -= 1;
if (keys['KeyD']) moveDir.x += 1;
moveDir.normalize().applyEuler(new THREE.Euler(0, yawObject.rotation.y, 0));

if (!isSliding) {
  if (moveDir.length() > 0) {
    velocity.x += (moveDir.x * baseSpeed - velocity.x) * acceleration;
    velocity.z += (moveDir.z * baseSpeed - velocity.z) * acceleration;
  } else {
    velocity.x -= velocity.x * deceleration;
    velocity.z -= velocity.z * deceleration;
  }
}

if (keys['ShiftLeft'] && keys['KeyW'] && canJump && !isSliding) {
  isSliding = true;
  slideSpeed = maxSlideSpeed;
  slideTimer = maxSlideTime;
  hasSlideBoosted = false;
}

if (isSliding) {
  slideTimer--;
  slideSpeed = Math.max(slideSpeed - slideDecay, 0);

  // Lower player height for crouch effect
  yawObject.position.y = THREE.MathUtils.lerp(yawObject.position.y, 0.5, 0.2);

  if (!hasSlideBoosted) {
    const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yawObject.rotation.y, 0));
    velocity.x = forwardDir.x * slideSpeed;
    velocity.z = forwardDir.z * slideSpeed;
    hasSlideBoosted = true;
  }

  camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0.2, 0.1);

  if (slideSpeed <= 0 || slideTimer <= 0 || !keys['KeyW']) {
    isSliding = false;
  }
} else {
  // Return to normal height when not sliding
  yawObject.position.y = THREE.MathUtils.lerp(yawObject.position.y, playerSize, 0.2);
  camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, 0.1);
}

    // 2) Apply horizontal velocity exactly once
    player.position.x += velocity.x;
    player.position.z += velocity.z;

    // 3) Raycast-based ground detection (handles rotated platforms)
    let onGroundNow = false;
    if (justRespawned > 0) {
      justRespawned--;
    } else {
      const down = new THREE.Vector3(0, -1, 0);
      const rayOrigin = player.position.clone();
      rayOrigin.y += 0.1; // FIX: cast from just above the feet
      const raycaster = new THREE.Raycaster(rayOrigin, down, 0, 0.3); // FIX: tighter ray length
      const groundHits = raycaster.intersectObjects(platforms, false);

      if (groundHits.length > 0 && velocity.y <= 0) {
        const hit = groundHits[0];
        player.position.y = hit.point.y;
        velocity.y = 0;
        onGroundNow = true;
      }
    }

    canJump = onGroundNow;

    // 4) Apply gravity and vertical movement only if not snapped to ground
    if (!onGroundNow) {
      velocity.y -= gravity;
      player.position.y += velocity.y;
    }

    // 5) Build/update player bounding box for wall collisions (should be fixed with sliding height and stuff)
const playerHeight = isSliding ? 0.25 : 1.05;  // crouched height vs standing
const playerCenterY = player.position.y + playerHeight / 2;

const playerBox = new THREE.Box3().setFromCenterAndSize(
  new THREE.Vector3(player.position.x, playerCenterY, player.position.z),
  new THREE.Vector3(0.5, playerHeight, 0.5)
);
    
      
    // 6) Wall collision (horizontal only)
    platforms.forEach(platform => {
      if (platform.userData.subType === 'wall') {
        platform.userData.boundingBox.setFromObject(platform);

        if (playerBox.intersectsBox(platform.userData.boundingBox)) {
          const pBox = platform.userData.boundingBox;
          const overlapX = Math.min(playerBox.max.x, pBox.max.x) - Math.max(playerBox.min.x, pBox.min.x);
          const overlapZ = Math.min(playerBox.max.z, pBox.max.z) - Math.max(playerBox.min.z, pBox.min.z);

          if (overlapX > 0 && overlapZ > 0) {
            if (overlapX < overlapZ) {
              const playerCenterX = (playerBox.min.x + playerBox.max.x) / 2;
              const platCenterX = (pBox.min.x + pBox.max.x) / 2;
              if (playerCenterX < platCenterX) {
                player.position.x -= overlapX;
                velocity.x = Math.min(velocity.x, 0);
              } else {
                player.position.x += overlapX;
                velocity.x = Math.max(velocity.x, 0);
              }
            } else {
              const playerCenterZ = (playerBox.min.z + playerBox.max.z) / 2;
              const platCenterZ = (pBox.min.z + pBox.max.z) / 2;
              if (playerCenterZ < platCenterZ) {
                player.position.z -= overlapZ;
                velocity.z = Math.min(velocity.z, 0);
              } else {
                player.position.z += overlapZ;
                velocity.z = Math.max(velocity.z, 0);
              }
            }
          }
        }
      }
    });

    // 7) Jumping
    if (keys['Space']) {
      if (canJump && !jumpPressedLastFrame) {
        velocity.y = jumpStrength;
        canJump = false;
      }
      jumpPressedLastFrame = true;
    } else {
      jumpPressedLastFrame = false;
    }

    // 8) Respawn if fallen below threshold
    if (player.position.y < fallThreshold) {
      player.position.copy(spawnPosition);
      player.position.y += 0.2; // FIX: small lift to help raycast
      velocity.set(0, 0, 0);
      justRespawned = 10; // FIX: shorter grace time
    }
    
    // Update speed debug
    const debug = document.getElementById('debug');
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    debug.textContent = `Speed: ${speed.toFixed(2)}`;
  } // END update()

  function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
  }
