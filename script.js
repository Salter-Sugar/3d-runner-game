
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scoreElement = document.getElementById("score");

// Fallback-safe coin sound
let coinSound;
try {
  coinSound = new Audio("https://cdn.jsdelivr.net/gh/naptha/talkie/audio/coin.wav");
  coinSound.crossOrigin = "anonymous";
} catch (err) {
  console.warn("Audio failed to load:", err);
}

const createScene = () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.1, 0.3, 0.6);

  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 1.2;

  const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000 }, scene);
  const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
  skyMat.backFaceCulling = false;
  skyMat.reflectionTexture = new BABYLON.CubeTexture("https://playground.babylonjs.com/textures/skybox", scene);
  skyMat.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
  skyMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyMat.specularColor = new BABYLON.Color3(0, 0, 0);
  skybox.material = skyMat;

  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 6, height: 2000 }, scene);
  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/floor.jpg", scene);
  groundMat.diffuseTexture.uScale = 1;
  groundMat.diffuseTexture.vScale = 200;
  ground.material = groundMat;

  const player = new BABYLON.TransformNode("player", scene);
  BABYLON.SceneLoader.ImportMesh(null, "https://models.babylonjs.com/", "alien.glb", scene, function (meshes) {
    meshes.forEach(m => {
      m.parent = player;
      m.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
    });
  });

  player.position.set(0, 0.8, -10);

  const camera = new BABYLON.FollowCamera("FollowCam", player.position, scene);
  camera.radius = 10;
  camera.heightOffset = 4;
  camera.rotationOffset = 180;
  camera.cameraAcceleration = 0.05;
  camera.maxCameraSpeed = 20;
  camera.lockedTarget = player;

  let currentLane = 0;
  let targetX = 0;
  let velocityY = 0;
  let isJumping = false;
  let score = 0;
  const gravity = -0.01;

  window.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" && currentLane > -2) {
      currentLane -= 2;
      targetX = currentLane;
    } else if (e.key === "ArrowRight" && currentLane < 2) {
      currentLane += 2;
      targetX = currentLane;
    } else if (e.key === " " && !isJumping) {
      velocityY = 0.2;
      isJumping = true;
    }
  });

  const coins = [], obstacles = [], decorations = [];

  const spawnObstacle = () => {
    const box = BABYLON.MeshBuilder.CreateBox("obstacle", { height: 1.5, width: 1, depth: 1 }, scene);
    box.position.set([-2, 0, 2][Math.floor(Math.random() * 3)], 0.75, player.position.z + 80);
    const mat = new BABYLON.StandardMaterial("mat", scene);
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    box.material = mat;
    obstacles.push(box);
  };

  const spawnCoin = () => {
    const coin = BABYLON.MeshBuilder.CreateCylinder("coin", { height: 0.1, diameter: 0.5 }, scene);
    coin.position.set([-2, 0, 2][Math.floor(Math.random() * 3)], 1, player.position.z + 85);
    const mat = new BABYLON.StandardMaterial("coinMat", scene);
    mat.diffuseColor = new BABYLON.Color3(1, 0.84, 0);
    coin.material = mat;
    coin.rotation.z = Math.PI / 2;
    coins.push(coin);
  };

  const spawnDecoration = () => {
    const deco = BABYLON.MeshBuilder.CreateBox("deco", { height: 3, width: 0.3, depth: 0.3 }, scene);
    deco.position.set(Math.random() > 0.5 ? 3.5 : -3.5, 1.5, player.position.z + 90);
    const mat = new BABYLON.StandardMaterial("decoMat", scene);
    mat.emissiveColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
    deco.material = mat;
    decorations.push(deco);
  };

  setInterval(spawnObstacle, 2000);
  setInterval(spawnCoin, 1500);
  setInterval(spawnDecoration, 2500);

  const glow = new BABYLON.GlowLayer("glow", scene);
  glow.intensity = 0.5;

  scene.registerBeforeRender(() => {
    player.position.z += 0.2;
    player.position.x += (targetX - player.position.x) * 0.2;

    if (isJumping) {
      velocityY += gravity;
      player.position.y += velocityY;
      if (player.position.y <= 0.8) {
        player.position.y = 0.8;
        velocityY = 0;
        isJumping = false;
      }
    }

    coins.forEach((coin, i) => {
      coin.rotation.y += 0.1;
      if (coin.intersectsMesh(player, false)) {
        coin.dispose();
        coins.splice(i, 1);
        score += 10;
        scoreElement.textContent = score;
        if (coinSound) coinSound.play().catch(err => console.warn("Audio error:", err));
      }
    });

    obstacles.forEach(obs => {
      if (obs.intersectsMesh(player, false) && player.position.y < 1.2) {
        alert("Game Over! Final Score: " + score);
        engine.stopRenderLoop();
      }
    });
  });

  return scene;
};

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
