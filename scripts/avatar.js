//Подключение библиотеки Three.js и дополнительных модулей
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CCDIKSolver, CCDIKHelper } from 'three/addons/animation/CCDIKSolver.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

//Объявление переменных
//const
const container = document.createElement('div');
const loader = new GLTFLoader();
//const targetBone = new THREE.Bone();
const OOI = {};
let IKSolver;

let avatar, camera, t, tCam, OrbCtrl, transformControls, scene, renderer, progressBarDiv, spotLight, dirLight, buBackgroundColor, settings;
let transitionTime = 1000;
var guix, guiy, guiz;

init();
animate();

//Функция инициализации сцены и её компонентов
function init() {
    document.body.appendChild(container);
    window.addEventListener('resize', onWindowResize);
    //Создание сцены
    createScene( "#000000" );
    //Создание перспективной камеры
    createPerspectiveCamera( 
        45, window.innerWidth / window.innerHeight,
        1, 2000, 0, 175, 125
    );
    //Создание таргета
    createTarget( 0, 175, 0 );
    //Создание заполняющего света
    createHemisphereLight( 0xffffff, 0x444444, 0, 300, 0 );
    //Создание обратного света
    //с параллельными испускаемыми лучами
    createDirectionalLight( "#ffffff", 0.5, 25, 190, -80 );
    //Создание света, излучающегося
    //из точки в одном направлении по конусу
    createSpotLight( "#ffffff", 3, -120, 230, 200 );
    //Создание визуализатора сцены
    createRenderer();
    //Создание элемента управления камерой
    createOrbitControls();
    //Создание строки состояния загрузки аватара
    showProgressBar();
    //Обновление строки состояния загрузки аватара
    updateProgressBar( 0 );
    //Импорт аватара
    loadModel( 'models/AvatarRig_02.glb' );
}

//Функция создания сцены
function createScene(color1) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(color1);
    scene.fog = new THREE.Fog( color1, 0, 0 );
}

//Функция масштабирования окна
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

//Функция создания перспективной камеры
function createPerspectiveCamera(fov, aspect, near, far, x, y, z) {
    camera = new THREE.PerspectiveCamera(
        fov,
        aspect,
        near,
        far
    );
    camera.position.set(x, y, z);
}

//Функция создания таргета
function createTarget(x, y, z) {
    t = new THREE.Object3D();
    t.translateX(x);
    t.translateY(y);
    t.translateZ(z);
    tCam = new THREE.Object3D();
    tCam.translateX(x);
    tCam.translateY(y);
    tCam.translateZ(z + 100);
}

//Функция создания заполняющего света
function createHemisphereLight(
    skyColor,
    groundColor,
    x, y, z
) {
    const hemiLight = new THREE.HemisphereLight(
        skyColor,
        groundColor
    );
    hemiLight.position.set(x, y, z);
    scene.add(hemiLight);
}

//Функция создания обратного света
//с параллельными испускаемыми лучами
function createDirectionalLight(color, intensity, x, y, z) {
    dirLight = new THREE.DirectionalLight(color, intensity);
    dirLight.position.set(x, y, z);
    dirLight.target = t;
    dirLight.target.updateMatrixWorld();
    dirLight.castShadow = true;
    dirLight.shadow.radius = 500;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = - 200;
    dirLight.shadow.camera.left = - 120;
    dirLight.shadow.camera.right = 120;
    dirLight.shadow.camera.near = 0;
    dirLight.shadow.camera.far = 1000;
    scene.add(dirLight);
}

//Функция создания света, излучающегося из точки в одном направлении по конусу
function createSpotLight(color, intensity, x, y, z) {
    spotLight = new THREE.SpotLight(color, intensity);
    spotLight.shadow.bias = -0.0001;
    spotLight.position.set(x, y, z);
    spotLight.angle = Math.PI / 8;
    spotLight.penumbra = 0.1;
    spotLight.decay = 1.0;
    spotLight.distance = 350;
    spotLight.target = t;
    spotLight.target.updateMatrixWorld();
    spotLight.castShadow = true;
    spotLight.shadow.radius = 1.5;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    spotLight.shadow.camera.near = 175;
    spotLight.shadow.camera.far = 350;
    spotLight.shadow.focus = 1;
    scene.add(spotLight);
}

//Функция обновления камеры
function updateCamera() {
    spotLight.target.updateMatrixWorld();
    spotLight.shadow.camera.updateProjectionMatrix();
}

updateCamera();

//Функция создания визуализатора сцены
function createRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.65;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.capabilities.getMaxAnisotropy();
    container.appendChild(renderer.domElement);
}

//Функция создания элемента управления камерой
function createOrbitControls() {
    OrbCtrl = new OrbitControls(camera, renderer.domElement);
    OrbCtrl.target.set(-25, 160, 20);
    OrbCtrl.update();
}

//Функция импорта аватара
function loadModel(name) {
    loader.load(name, function (object) {
        avatar = object.scene;
        avatar.traverse(function (child) {
            if ( child.name === 'DEF-shoulderR' ) OOI.rCollar = child;
			if ( child.name === 'DEF-upper_armR' ) OOI.rShldrBend = child;
            if ( child.name === 'DEF-upper_armR001' ) OOI.rShldrTwist = child;
			if ( child.name === 'DEF-forearmR' ) OOI.rForearmBend = child;
			if ( child.name === 'DEF-forearmR001' ) OOI.rForearmTwist = child;
			if ( child.name === 'DEF-handR' ) OOI.rHand = child;
            if ( child.name === 'hand_ikR' ) OOI.rTargetBone = child;
            if ( child.name === 'Body_9' ) OOI.RArm = child;
            if (child.isMesh) {
                child.receiveShadow = true;
                child.frustumCulled = true;
            }
        });
        avatar.scale.set(100, 100, 100);
        scene.add(avatar);

        transformControls = new TransformControls( camera, renderer.domElement );
		transformControls.size = .5;
		//transformControls.showY = false;
		//transformControls.showZ = false;
		transformControls.space = 'world';
		transformControls.attach( OOI.rTargetBone );
		scene.add( transformControls );
		transformControls.addEventListener( 'mouseDown', () => OrbCtrl.enabled = false );
		transformControls.addEventListener( 'mouseUp', () => OrbCtrl.enabled = true );

        OOI.RArm.add(avatar.children[0].children[1]);
        OOI.RArm.add(avatar.children[0].children[3]);

        const rShldrBendRotation_x = -0.32328148483753005;
        const rShldrBendRotation_y = -1.3808366951818996;
        const rShldrBendRotation_z = 0.45374598692631374;

        const rShldrBendEuler = new THREE.Euler(rShldrBendRotation_x, rShldrBendRotation_y, rShldrBendRotation_z);
        let rShldrBendNormVect = new THREE.Vector3().setFromEuler(rShldrBendEuler);
        rShldrBendNormVect.normalize();

        let rShldrBendVector3Min = new THREE.Vector3( 0, 0, 0 );
        rShldrBendVector3Min.applyAxisAngle(rShldrBendNormVect, rShldrBendRotation_y);

        let rShldrBendVector3Max = new THREE.Vector3(( 40 * Math.PI / 180 ), rShldrBendRotation_y, ( 110 * Math.PI / 180 ));

        OOI.rShldrBend.updateMatrixWorld;
        
			const iks = [
				{
					target: 674, // "rTargetBone"
					effector: 564, // "rHand"
					links: [

                        /*{
							index: 563, // "rForearmTwist"

                            rotationMin: new THREE.Vector3( 0, -1.3963, 0 ),
							rotationMax: new THREE.Vector3( 0, 1.5708, 0 )

                            //rotationMin: new THREE.Vector3( 0, -1.25, 0 ),
							//rotationMax: new THREE.Vector3( 0, 2.25, 0 )

						},
						{
							index: 562, // "rForearmBend"

                            rotationMin: new THREE.Vector3( -2.3562, 0, 0 ),
							rotationMax: new THREE.Vector3( 0.3491, 0, 0 )

						},
                        {
							index: 561, // "rShldrTwist"

                            rotationMin: new THREE.Vector3( 0, -1.3963, 0 ),
							rotationMax: new THREE.Vector3( 0, 1.6581, 0 )

						},
                        {
							index: 560, // "rShldrBend"

                            rotationMin: new THREE.Vector3( -1.5708, 0, -1.9199 ),
							rotationMax: new THREE.Vector3( 0.6981, 0, 0.6981 )

						},
                        {
							index: 548, // "rCollar"

                            rotationMin: new THREE.Vector3( -0.9599, -0.5236, -0.4538),
							rotationMax: new THREE.Vector3( 0.1745, 0.5236, 0.2967 )

						},*/


                        {
							index: 563, // "rForearmTwist"

                            //rotationMin: new THREE.Vector3(OOI.rForearmTwist.rotation._x, OOI.rForearmTwist.rotation._y, OOI.rForearmTwist.rotation._z),
                            //rotationMax: new THREE.Vector3(OOI.rForearmTwist.rotation._x, OOI.rForearmTwist.rotation._y, OOI.rForearmTwist.rotation._z)

                            rotationMin: new THREE.Vector3(OOI.rForearmTwist.rotation._x, OOI.rForearmTwist.rotation._y  - ( 90 * Math.PI / 180 ), OOI.rForearmTwist.rotation._z),
                            rotationMax: new THREE.Vector3(OOI.rForearmTwist.rotation._x, OOI.rForearmTwist.rotation._y  + ( 80 * Math.PI / 180 ), OOI.rForearmTwist.rotation._z)

						},
						{
							index: 562, // "rForearmBend"

                            //rotationMin: new THREE.Vector3(OOI.rForearmBend.rotation._x, OOI.rForearmBend.rotation._y, OOI.rForearmBend.rotation._z),
                            //rotationMax: new THREE.Vector3(OOI.rForearmBend.rotation._x, OOI.rForearmBend.rotation._y, OOI.rForearmBend.rotation._z)

                            rotationMin: new THREE.Vector3(OOI.rForearmBend.rotation._x - ( 20 * Math.PI / 180 ), 0, OOI.rForearmBend.rotation._z),
                            rotationMax: new THREE.Vector3(OOI.rForearmBend.rotation._x + ( 135 * Math.PI / 180 ), 0, OOI.rForearmBend.rotation._z)

						},
                        {
							index: 561, // "rShldrTwist"

                            //rotationMin: new THREE.Vector3(OOI.rShldrTwist.rotation._x, OOI.rShldrTwist.rotation._y, OOI.rShldrTwist.rotation._z),
                            //rotationMax: new THREE.Vector3(OOI.rShldrTwist.rotation._x, OOI.rShldrTwist.rotation._y, OOI.rShldrTwist.rotation._z)

                            rotationMin: new THREE.Vector3(OOI.rShldrTwist.rotation._x, OOI.rShldrTwist.rotation._y - ( 95 * Math.PI / 180 ), OOI.rShldrTwist.rotation._z),
                            rotationMax: new THREE.Vector3(OOI.rShldrTwist.rotation._x, OOI.rShldrTwist.rotation._y + ( 80 * Math.PI / 180 ), OOI.rShldrTwist.rotation._z)

						},
                        {
							index: 560, // "rShldrBend"

                            //rotationMin: rShldrBendVector3Min,
                            //rotationMax: rShldrBendVector3Min

                            rotationMin: new THREE.Euler(OOI.rShldrBend.rotation._x - ( 90 * Math.PI / 180 ), OOI.rShldrBend.rotation._y, OOI.rShldrBend.rotation._z - ( 40 * Math.PI / 180 )),
                            rotationMax: new THREE.Euler(OOI.rShldrBend.rotation._x + ( 40 * Math.PI / 180 ), 0, OOI.rShldrBend.rotation._z  + ( 110 * Math.PI / 180 ))

                            
                            //rotationMin: new THREE.Vector3( -Math.PI, 0, -Math.PI),
							//rotationMax: new THREE.Vector3( Math.PI, 0, Math.PI)
                            
						},
                        //{
						//	index: 548, // "rCollar"

                        //    rotationMin: new THREE.Vector3(OOI.rCollar.rotation._x - ( 10 * Math.PI / 180 ), OOI.rCollar.rotation._y  - ( 30 * Math.PI / 180 ), OOI.rCollar.rotation._z - ( 17 * Math.PI / 180 )),
						//	rotationMax: new THREE.Vector3(OOI.rCollar.rotation._x + ( 55 * Math.PI / 180 ), OOI.rCollar.rotation._y  + ( 30 * Math.PI / 180 ), OOI.rCollar.rotation._z + ( 26 * Math.PI / 180 ))

						//},

					],
				}
			];
			IKSolver = new CCDIKSolver( OOI.RArm, iks );
			const ccdikhelper = new CCDIKHelper( OOI.RArm, iks, 0.01 );
			scene.add( ccdikhelper );

        hideProgressBar();
        createPanel();
    }, onProgress);
}


//Функция создания строки состояния загрузки аватара
function showProgressBar() {
    progressBarDiv = document.createElement('div');
    progressBarDiv.innerText = 'Загрузка...';
    progressBarDiv.style.fontSize = '3em';
    progressBarDiv.style.color = '#888';
    progressBarDiv.style.display = 'block';
    progressBarDiv.style.position = 'absolute';
    progressBarDiv.style.top = '50%';
    progressBarDiv.style.width = '100%';
    progressBarDiv.style.textAlign = 'center';
    document.body.appendChild(progressBarDiv);
}
//Функция отслеживания прогресса загрузки аватара
function onProgress(xhr) {
    if (xhr.lengthComputable) {
        updateProgressBar(xhr.loaded / xhr.total);
    }
}
//Функция обновления строки состояния загрузки аватара
function updateProgressBar(fraction) {
    progressBarDiv.innerText =
    'Загрузка... ' + Math.round(fraction * 100, 2) + '%';
}

//Функция скрытия строки состояния
function hideProgressBar() {
    document.body.removeChild(progressBarDiv);
    //Цикл плавного проявления аватара на сцене
    let tween = new TWEEN.Tween(scene.fog)
        .to({far: 1000}, transitionTime*7.5)
        .easing(TWEEN.Easing.Circular.In)
        .start();
}

function createPanel() {
    const gui = new GUI({title: "Hand"});
    settings = {
        x: 0,
        y: 0,
        z: 0
    };

    guix = gui.add(settings, 'x').min(-1).max(1).step(0.025).listen();
    guiy = gui.add(settings, 'y').min(-1).max(1).step(0.025).listen();
    guiz = gui.add(settings, 'z').min(-1).max(1).step(0.025).listen();

    guix.onChange(function (val) {
        OOI.rTargetBone.position.x = val;
    });
    guiy.onChange(function (val) {
        OOI.rTargetBone.position.y = val;
    });
    guiz.onChange(function (val) {
        OOI.rTargetBone.position.z = val;
    });

    gui.open();

}

//Функция цикла рендеринга
function animate() {
    requestAnimationFrame(animate);
    camera.updateMatrixWorld();
    IKSolver?.update();
    renderer.render(scene, camera);
    if (typeof settings !== 'undefined') {
        settings.x = OOI.rTargetBone.position.x;
        settings.y = OOI.rTargetBone.position.y;
        settings.z = OOI.rTargetBone.position.z;
    }
    TWEEN.update();
}