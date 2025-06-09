    import * as THREE from 'https://esm.sh/three@0.160.0';
    import { TransformControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/TransformControls.js';

window.addEventListener('DOMContentLoaded', () => {

      let camera, scene, renderer;
      let yawObject, pitchObject;
      let transformControls;
      let raycaster = new THREE.Raycaster();
      let mouse = new THREE.Vector2();
      const keys = {};
      let isShiftDown = false;
      let isDragging = false;
      let selectableObjects = [];
      let selectedObject = null;
      const objects = [];

      const contextMenu = document.getElementById('context-menu');
      const deleteButton = document.getElementById('delete-object');

      const subtypeSelect = document.getElementById('subtype-select');

  
const textureLoader = new THREE.TextureLoader();
const gridTexture = textureLoader.load('images/texture_08.png', (texture) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
});

  
      
      //subtype selector stuff
const SUBTYPE_COLORS = {
  ground: 0x4CAF50,
  wall: 0xF44336,
  lighting: 0xffffff // Default white for lights
};

      init();
      animate();

      // Set snapping values
const SNAP_TRANSLATE = 0.25;
const SNAP_ROTATE = THREE.MathUtils.degToRad(15); // 15 degrees snapping
const SNAP_SCALE = 0.25;

      //subtype editor
      const selectedSubtypeDropdown = document.getElementById("selected-subtype");
const subtypeEditor = document.getElementById("subtype-editor");

// Hide by default
subtypeEditor.style.display = "none";

selectedSubtypeDropdown.addEventListener("change", () => {
  if (!selectedObject) return;
  
  const record = objects.find(o => o.obj === selectedObject);
  if (record) {
    const newSubtype = selectedSubtypeDropdown.value;
    record.subtype = newSubtype;
    
    // Update material color
    const color = SUBTYPE_COLORS[newSubtype] || SUBTYPE_COLORS.default;
    selectedObject.material.color.setHex(color);
  }
});

    const lightEditor = document.getElementById("light-editor");
const lightColorPicker = document.getElementById("light-color");

lightColorPicker.addEventListener("input", () => {
  if (!selectedObject) return;
  const record = objects.find(o => o.obj === selectedObject);
  if (record && record.subtype === "lighting") {
    const color = new THREE.Color(lightColorPicker.value);
    selectedObject.material.color.setHex(color.getHex());
    record.color = color.getHex(); // Store the color in the object record
  }
});
      
window.addEventListener("keydown", (e) => {
  if (e.key === "Control") {
    transformControls.setTranslationSnap(SNAP_TRANSLATE);
    transformControls.setRotationSnap(SNAP_ROTATE);
    transformControls.setScaleSnap(SNAP_SCALE);
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "Control") {
    transformControls.setTranslationSnap(null);
    transformControls.setRotationSnap(null);
    transformControls.setScaleSnap(null);
  }
});

    const savedMapData = localStorage.getItem('mapData');
  if (savedMapData) {
    try {
      const data = JSON.parse(savedMapData);
      clearScene();
      data.forEach((item) => {
        const obj = createObject(item);
        objects.push({ 
          name: item.name, 
          obj, 
          subtype: item.subType || "ground" 
        });
        scene.add(obj);
        if (item.name !== "PlayerSpawn") selectableObjects.push(obj);
      });
      // Clear the stored data so it doesn't reload next time
      localStorage.removeItem('mapData');
    } catch (err) {
      console.error("Error loading map from localStorage:", err);
    }
  }
  
  
      function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x222222);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        yawObject = new THREE.Object3D();
        pitchObject = new THREE.Object3D();
        pitchObject.add(camera);
        yawObject.add(pitchObject);
        yawObject.position.set(0, 5, 10);
        scene.add(yawObject);

        const light = new THREE.DirectionalLight(0xffffff, 0.5);
        light.position.set(10, 10, 10);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const gridHelper = new THREE.GridHelper(250, 250);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.2;
        scene.add(gridHelper);

        transformControls = new TransformControls(camera, renderer.domElement);
        transformControls.addEventListener("dragging-changed", e => {
          isDragging = e.value;
        });
        scene.add(transformControls);

        document.getElementById('add-block').addEventListener('click', () => addBlock(subtypeSelect.value));
        document.getElementById('add-player-spawn').addEventListener('click', addPlayerSpawnPoint);
        document.getElementById('save-json').addEventListener('click', saveMap);
        document.getElementById('load-json').addEventListener('click', loadMap);

        const addObjectBtn = document.getElementById("add-object");
        const dropdownContent = addObjectBtn.nextElementSibling;
        addObjectBtn.addEventListener("click", () => {
          dropdownContent.style.display =
            dropdownContent.style.display === "block" ? "none" : "block";
        });
        window.addEventListener("click", (e) => {
          if (!addObjectBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.style.display = "none";
          }
        });

        const modeButtons = {
          translate: document.getElementById("mode-translate"),
          rotate: document.getElementById("mode-rotate"),
          scale: document.getElementById("mode-scale"),
        };
        function setMode(mode) {
          transformControls.setMode(mode);
          Object.entries(modeButtons).forEach(([key, btn]) => {
            btn.classList.toggle("active", key === mode);
          });
        }
        modeButtons.translate.addEventListener("click", () => setMode("translate"));
        modeButtons.rotate.addEventListener("click", () => setMode("rotate"));
        modeButtons.scale.addEventListener("click", () => setMode("scale"));
        setMode("translate");

        
        let copiedObjectData = null;

const copyButton = document.getElementById('copy-object');
const pasteButton = document.getElementById('paste-object');

    // Modify the keydown event listener
    window.addEventListener("keydown", (e) => {
          keys[e.code] = true;

        // Avoid interfering if typing in input/select
        const activeTag = document.activeElement.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

  if (e.ctrlKey && e.code === 'KeyC') {
    e.preventDefault();
    if (!selectedObject) return;
    copiedObjectData = {
      name: objects.find(o => o.obj === selectedObject)?.name || "Cube",
      subtype: objects.find(o => o.obj === selectedObject)?.subtype || "ground",
      position: selectedObject.position.clone(),
      rotation: selectedObject.rotation.toArray(),
      scale: selectedObject.scale.clone(),
    };
  }
  if (e.ctrlKey && e.code === 'KeyV') {
    e.preventDefault();
    if (!copiedObjectData) return;

    let obj;
    if (copiedObjectData.name === "PlayerSpawn") {
      obj = new THREE.Mesh(
        new THREE.SphereGeometry(0.5),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
    } else {
      obj = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
    }

    obj.position.copy(copiedObjectData.position).add(new THREE.Vector3(0.5, 0, 0.5));
    obj.rotation.fromArray(copiedObjectData.rotation);
    obj.scale.copy(copiedObjectData.scale);

    scene.add(obj);
    objects.push({ name: copiedObjectData.name, obj, subtype: copiedObjectData.subtype });
    if (copiedObjectData.name !== "PlayerSpawn") selectableObjects.push(obj);

    selectedObject = obj;
    transformControls.attach(selectedObject);
  }
});

        
// Copy currently selected object
copyButton.addEventListener('click', () => {
  if (!selectedObject) return;
  copiedObjectData = {
    name: objects.find(o => o.obj === selectedObject)?.name || "Cube",
    subtype: objects.find(o => o.obj === selectedObject)?.subtype || "ground",
    position: selectedObject.position.clone(),
    rotation: selectedObject.rotation.toArray(),
    scale: selectedObject.scale.clone(),
  };
  contextMenu.style.display = 'none';
});

// Paste copied object, slightly offset position
pasteButton.addEventListener('click', () => {
  if (!copiedObjectData) return;

  let obj;
  if (copiedObjectData.name === "PlayerSpawn") {
    obj = new THREE.Mesh(
      new THREE.SphereGeometry(0.5),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
  } else {
    const material = new THREE.MeshStandardMaterial({ 
      map: gridTexture.clone(),
      color: SUBTYPE_COLORS[copiedObjectData.subtype] || SUBTYPE_COLORS.ground
    });
    obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  }

  // Offset position slightly so it's visible
  obj.position.copy(copiedObjectData.position).add(new THREE.Vector3(1,1,1));
  obj.rotation.fromArray(copiedObjectData.rotation);
  obj.scale.copy(copiedObjectData.scale);

  scene.add(obj);
  objects.push({ 
    name: copiedObjectData.name, 
    obj, 
    subtype: copiedObjectData.subtype 
  });
  if (copiedObjectData.name !== "PlayerSpawn") selectableObjects.push(obj);

  // Select newly pasted object
  selectedObject = obj;
  transformControls.attach(selectedObject);

  contextMenu.style.display = 'none';
});  // This was missing

        
window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (isDragging) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(selectableObjects);

  if (intersects.length > 0) {
    selectedObject = intersects[0].object;
    transformControls.attach(selectedObject);
contextMenu.style.left = `${e.clientX}px`;
contextMenu.style.top = `${e.clientY}px`;
contextMenu.style.display = "block";

      if (record && record.subtype === "lighting") {
  subtypeEditor.style.display = "block";
  lightEditor.style.display = "block";
  selectedSubtypeDropdown.value = "lighting";
  lightColorPicker.value = "#" + record.color.toString(16).padStart(6, '0');
} else {
  lightEditor.style.display = "none";
}

const record = objects.find(o => o.obj === selectedObject);
if (record && record.name !== "PlayerSpawn") {
  subtypeEditor.style.display = "block";
  selectedSubtypeDropdown.value = record.subtype || "ground";
} else {
  subtypeEditor.style.display = "none";
}


  } else {
    selectedObject = null;
    transformControls.detach();
    contextMenu.style.display = "none";
  }
});


deleteButton.addEventListener("click", () => {
  if (selectedObject) {
    scene.remove(selectedObject);
    transformControls.detach();
    selectableObjects = selectableObjects.filter(obj => obj !== selectedObject);
    const i = objects.findIndex(o => o.obj === selectedObject);
    if (i !== -1) objects.splice(i, 1);
    selectedObject = null;
  }
  contextMenu.style.display = "none";
});


window.addEventListener("mousedown", (e) => {
  // Prevent deselect if clicking inside UI controls or context menu
  const isOnUI = e.target.closest('.controls') || e.target.closest('#ui-container') || e.target.closest('#context-menu');
  if (isOnUI) {
    // Just hide context menu if clicking outside it but inside UI,
    // but do NOT deselect selectedObject or detach transformControls
    if (!contextMenu.contains(e.target)) {
      contextMenu.style.display = "none";
    }
    return; // stop here, prevent deselect
  }

  // Hide context menu if clicking anywhere else
  contextMenu.style.display = "none";

  if (e.button === 0 && !isDragging && !isShiftDown) {
    onLeftClick(e);
  }
});



// === GLOBAL KEY HANDLING ===
window.addEventListener("keydown", e => {
  // Track every key
  keys[e.code] = true;
  
  // SHIFT pressed: engage “fly” mode & pointer lock
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    if (!isShiftDown) {
      isShiftDown = true;
      document.body.requestPointerLock().catch(err => console.warn("Lock failed:", err));
    }
  }
});

window.addEventListener("keyup", e => {
  // Stop tracking
  keys[e.code] = false;

  // SHIFT released: exit “fly” mode & pointer lock
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    isShiftDown = false;
    document.exitPointerLock();
  }
});


function requestPointerLockOnce() {
  document.body.requestPointerLock().catch(err => {
    console.log("Pointer lock error:", err);
  });
}

window.addEventListener("mousemove", (e) => {
  if (!isShiftDown || isDragging) return;
  yawObject.rotation.y -= e.movementX * 0.002;
  pitchObject.rotation.x -= e.movementY * 0.002;
  pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitchObject.rotation.x));
});

transformControls.addEventListener('objectChange', () => {
  if (selectedObject) {
    updateTextureRepeat(selectedObject);
  }
});


        window.addEventListener("resize", () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        });
      }


      function updateTextureRepeat(obj) {
  if (obj.material && obj.material.map) {
    const scale = obj.scale;
    const tileFactor = 0.5;
    obj.material.map.repeat.set(scale.x * tileFactor, scale.z * tileFactor); // Use X and Z for top face tiling
    obj.material.map.needsUpdate = true;
  }
}
      
function addBlock(subtype = "ground") {
  // 1. Create texture (original functionality)
  const blockTexture = gridTexture.clone();
  blockTexture.wrapS = THREE.RepeatWrapping;
  blockTexture.wrapT = THREE.RepeatWrapping;
  blockTexture.repeat.set(1, 1);

  // 2. Create material with BOTH texture AND subtype color
  const material = new THREE.MeshStandardMaterial({ 
    map: blockTexture,
    color: SUBTYPE_COLORS[subtype] // Add color while keeping texture
  });

  // 3. Create object (original functionality)
  const obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  obj.position.set(0, 0, 0);
  scene.add(obj);
  
  // 4. Store object data (original with subtype tracking)
  objects.push({ 
    name: "Cube", 
    obj: obj, 
    subtype: subtype 
  });
  
  selectableObjects.push(obj);
  updateTextureRepeat(obj);
  
  // 5. Select new object (original functionality)
  selectedObject = obj;
  transformControls.attach(selectedObject);
}



function addPlayerSpawnPoint() {
  const obj = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshBasicMaterial({ 
      color: 0xff0000, // Keep the iconic red color
      transparent: true,
      opacity: 0.8 // Slightly transparent
    })
  );
  obj.position.set(0, 0, 0);
  scene.add(obj);
  
  // Add to BOTH tracking arrays
  objects.push({ 
    name: "PlayerSpawn", 
    obj: obj, 
    subtype: "spawn" // Explicit spawn subtype
  });
  selectableObjects.push(obj); // ← THIS WAS MISSING

  // Select it immediately
  selectedObject = obj;
  transformControls.attach(selectedObject);
}

    document.getElementById('add-light').addEventListener('click', addLight);

function addLight() {
  const obj = new THREE.Mesh(
    new THREE.SphereGeometry(0.3),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  obj.position.set(0, 0, 0);
  scene.add(obj);
  
  objects.push({ 
    name: "Light", 
    obj: obj, 
    subtype: "lighting",
    color: 0xffffff // Default white
  });
  
  selectableObjects.push(obj);
  selectedObject = obj;
  transformControls.attach(selectedObject);
  
  // Show editors
  subtypeEditor.style.display = "block";
  lightEditor.style.display = "block";
  selectedSubtypeDropdown.value = "lighting";
}



function saveMap() {
  const data = objects.map(({ name, obj, subtype, color }) => ({
    type: name === "PlayerSpawn" ? "PlayerSpawn" : name === "Light" ? "Light" : "Platform",
    name,
    subType: subtype || (name === "Light" ? "lighting" : "ground"),
    position: obj.position.toArray(),
    rotation: [...obj.rotation.toArray(), obj.rotation.order],
    scale: obj.scale.toArray(),
    color: name === "Light" ? (color || 0xffffff) : undefined
  }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "map.json";
        a.click();
        URL.revokeObjectURL(url);
      }

      function loadMap() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            const data = JSON.parse(event.target.result);
            clearScene();
            data.forEach((item) => {
              const obj = createObject(item);
              objects.push({ name: item.name, obj, subtype: item.subType });
              scene.add(obj);
              if (item.name !== "PlayerSpawn") selectableObjects.push(obj);
            });
          };
          reader.readAsText(file);
        });
        input.click();
      }


// Optional: repeat and wrap for better look
gridTexture.wrapS = THREE.RepeatWrapping;
gridTexture.wrapT = THREE.RepeatWrapping;
gridTexture.repeat.set(1, 1);

function createObject(data) {
  let obj;
  const color = SUBTYPE_COLORS[data.subType] || SUBTYPE_COLORS.ground;

  if (data.type === "Platform" || data.name === "Cube") {
    const material = new THREE.MeshStandardMaterial({ 
      color: color,
      map: gridTexture.clone()
    });
    obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  } else if (data.type === "PlayerSpawn") {
    obj = new THREE.Mesh(
      new THREE.SphereGeometry(0.5),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
  } else if (data.type === "Light") {
    obj = new THREE.Mesh(
      new THREE.SphereGeometry(0.3),
      new THREE.MeshBasicMaterial({ color: data.color || 0xffffff })
    );
  } else {
    obj = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
  }

  if (data.type === "Platform" || data.name === "Cube") {
    const material = new THREE.MeshStandardMaterial({ 
      color: color,
      map: gridTexture.clone()
    });
    obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  } else if (data.type === "PlayerSpawn") {
    obj = new THREE.Mesh(
      new THREE.SphereGeometry(0.5),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
  } else {
    // Default fallback
    obj = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
  }

  obj.position.fromArray(data.position);
  obj.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
  obj.rotation.order = data.rotation[3] || "XYZ";
  obj.scale.fromArray(data.scale);

  return obj;
}


      function clearScene() {
        for (let i = scene.children.length - 1; i >= 0; i--) {
          const child = scene.children[i];
          if (child === yawObject || child === transformControls || child.isLight || child.type === "GridHelper") continue;
          scene.remove(child);
        }
        objects.length = 0;
        selectableObjects.length = 0;
        transformControls.detach();
        selectedObject = null;
      }

function onLeftClick(event) {
  // Skip if clicking on UI elements (unchanged)
  if (event.target.closest('.controls, #ui-container, #context-menu, #subtype-editor')) {
    return; 
  }

  // Raycasting setup (unchanged)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(selectableObjects);
  
  transformControls.detach();

  if (intersects.length > 0) {
    selectedObject = intersects[0].object;
    transformControls.attach(selectedObject);

    const record = objects.find(o => o.obj === selectedObject);
    if (!record) return;

    // Enhanced subtype editor handling
    if (record.name === "Cube") {
      subtypeEditor.style.display = "block";
      selectedSubtypeDropdown.value = record.subtype || "ground";
    } else if (record.name === "PlayerSpawn") {
      subtypeEditor.style.display = "none"; // Explicitly hide for spawns
    }
  } else {
    // Only deselect if clicking empty space (not UI)
    if (event.target.closest('canvas')) {
      selectedObject = null;
      subtypeEditor.style.display = "none";
    }
  }
    if (record.name === "Light") {
  subtypeEditor.style.display = "block";
  lightEditor.style.display = "block";
  selectedSubtypeDropdown.value = record.subtype || "lighting";
  lightColorPicker.value = "#" + (record.color || 0xffffff).toString(16).padStart(6, '0');
} else {
  lightEditor.style.display = "none";
}
}


function animate() {
  requestAnimationFrame(animate);
  if (isShiftDown) {
    const speed = 0.2;
    const direction = new THREE.Vector3();
    if (keys["KeyW"]) direction.z -= 1;
    if (keys["KeyS"]) direction.z += 1;
    if (keys["KeyA"]) direction.x -= 1;
    if (keys["KeyD"]) direction.x += 1;
    if (keys["KeyE"]) direction.y += 1;
    if (keys["KeyQ"]) direction.y -= 1;
    direction.normalize().applyEuler(yawObject.rotation);
    yawObject.position.addScaledVector(direction, speed);
  }
  
  renderer.render(scene, camera);

  // Update position label
  const label = document.getElementById('position-label');
  if (selectedObject) {
    const pos = selectedObject.position;
    label.textContent = `Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`;
  } else {
    label.textContent = 'Position: (none)';
  }
}
  
    });
