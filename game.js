import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

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
    const acceleration = 0.2;
    const deceleration = 0.15;

    let slideSpeed = 0;
    const maxSlideSpeed = 0.12;
    const slideDecay = 0.008;
    const maxSlideTime = 60;
    let slideTimer = 0;
    let isSliding = false;

    let justRespawned = 0;
    let spawnPosition = new THREE.Vector3(0, 5, 0);

    let jumpPressedLastFrame = false;
    let hasSlideBoosted = false;

    function showError(message) {
      const errorDiv = document.getElementById('error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      console.error(message);
    }

    try {
      init();
      animate();
    } catch (error) {
      showError('Failed to initialize: ' + error.message);
    }

    function init() {
      try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue fallback
        
        // Improved lighting setup
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        
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

        // Create some default platforms if no map data
        createDefaultPlatforms();

        // Set spawn position
        player.position.copy(spawnPosition);

        // Create renderer with shadow support
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x87CEEB);
        document.body.appendChild(renderer.domElement);

        setupControls();
        
        console.log('3D renderer initialized successfully');
      } catch (error) {
        showError('Initialization error: ' + error.message);
        throw error;
      }
    }

    function createDefaultPlatforms() {
      // Create a simple textured material
      const material = new THREE.MeshLambertMaterial({ 
        color: 0x8B4513,
        wireframe: false
      });

      // Ground platform
      const groundGeo = new THREE.BoxGeometry(10, 1, 10);
      const groundMesh = new THREE.Mesh(groundGeo, material);
      groundMesh.position.set(0, -1, 0);
      groundMesh.userData.subType = 'ground';
      groundMesh.userData.boundingBox = new THREE.Box3().setFromObject(groundMesh);
      groundMesh.castShadow = true;
      groundMesh.receiveShadow = true;
      scene.add(groundMesh);
      platforms.push(groundMesh);

      // A few more platforms for testing
      const platform1 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 3), material);
      platform1.position.set(5, 1, 5);
      platform1.userData.subType = 'ground';
      platform1.userData.boundingBox = new THREE.Box3().setFromObject(platform1);
      platform1.castShadow = true;
      platform1.receiveShadow = true;
      scene.add(platform1);
      platforms.push(platform1);

      const platform2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2), material);
      platform2.position.set(-3, 2, -3);
      platform2.userData.subType = 'ground';
      platform2.userData.boundingBox = new THREE.Box3().setFromObject(platform2);
      platform2.castShadow = true;
      platform2.receiveShadow = true;
      scene.add(platform2);
      platforms.push(platform2);

      // Wall example
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 5), material);
      wall.position.set(0, 1, -8);
      wall.userData.subType = 'wall';
      wall.userData.boundingBox = new THREE.Box3().setFromObject(wall);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
      platforms.push(wall);
    }

    function setupControls() {
      document.addEventListener('keydown', e => keys[e.code] = true);        
      document.addEventListener('keyup', e => keys[e.code] = false);

      const instructions = document.getElementById('instructions');
      instructions.addEventListener('click', () => {
        instructions.style.display = 'none';
        if (renderer && renderer.domElement) {
          renderer.domElement.requestPointerLock();
        }
      });

      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === renderer.domElement) {
          document.addEventListener('mousemove', onMouseMove, false);
        } else {
          document.removeEventListener('mousemove', onMouseMove, false);
          instructions.style.display = 'flex';
        }
      });

      window.addEventListener('resize', () => {
        if (camera && renderer) {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        }
      });
    }

    function onMouseMove(event) {
      if (yawObject && pitchObject) {
        yawObject.rotation.y -= (event.movementX || 0) * 0.002;
        pitchObject.rotation.x -= (event.movementY || 0) * 0.002;
        pitchObject.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitchObject.rotation.x));
      }
    }

    function update() {
      try {
        // Handle horizontal input and sliding
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
          yawObject.position.y = THREE.MathUtils.lerp(yawObject.position.y, playerSize, 0.2);
          camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, 0.1);
        }

        // Apply horizontal velocity
        player.position.x += velocity.x;
        player.position.z += velocity.z;

        // Ground detection
        let onGroundNow = false;
        if (justRespawned > 0) {
          justRespawned--;
        } else {
          const down = new THREE.Vector3(0, -1, 0);
          const rayOrigin = player.position.clone();
          rayOrigin.y += 0.1;
          const raycaster = new THREE.Raycaster(rayOrigin, down, 0, 0.3);
          const groundHits = raycaster.intersectObjects(platforms, false);

          if (groundHits.length > 0 && velocity.y <= 0) {
            const hit = groundHits[0];
            player.position.y = hit.point.y;
            velocity.y = 0;
            onGroundNow = true;
          }
        }

        canJump = onGroundNow;

        // Apply gravity
        if (!onGroundNow) {
          velocity.y -= gravity;
          player.position.y += velocity.y;
        }

        // Player bounding box for wall collisions
        const playerHeight = isSliding ? 0.25 : 1.05;
        const playerCenterY = player.position.y + playerHeight / 2;

        const playerBox = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(player.position.x, playerCenterY, player.position.z),
          new THREE.Vector3(0.5, playerHeight, 0.5)
        );

        // Wall collision
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

        // Jumping
        if (keys['Space']) {
          if (canJump && !jumpPressedLastFrame) {
            velocity.y = jumpStrength;
            canJump = false;
          }
          jumpPressedLastFrame = true;
        } else {
          jumpPressedLastFrame = false;
        }

        // Respawn if fallen
        if (player.position.y < fallThreshold) {
          player.position.copy(spawnPosition);
          player.position.y += 0.2;
          velocity.set(0, 0, 0);
          justRespawned = 10;
        }

        // Update speed debug
        const debug = document.getElementById('debug');
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);        
        if (debug) debug.textContent = `Speed: ${speed.toFixed(2)}`;

      } catch (error) {
        showError('Update error: ' + error.message);
      }
    }

    function animate() {
      try {
        requestAnimationFrame(animate);
        update();
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      } catch (error) {
        showError('Render error: ' + error.message);
      }
    }
