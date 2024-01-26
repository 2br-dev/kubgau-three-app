import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TextureLoader } from 'three';
import { Raycaster } from 'three';

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';

import gsap, {Linear, Power1} from 'gsap';

export interface IMousePos{
	x:number, y:number, _x:number, _y:number
}

export interface IProgressData{
	total:number,
	loaded:number,
	percent:number
}

export interface IUploadingModel{
	id:string,
	modelpath:string,
	diffusetexture?:string,
	alphatexture?:string,
	isinteractive?:boolean
	isEmissive?:boolean
}

export interface IHoverData{
	object:THREE.Object3D | null,
	mousePos: IMousePos
}

class App{

	scene:THREE.Scene;
	camera:THREE.PerspectiveCamera;
	helperCamera:THREE.PerspectiveCamera;
	light:THREE.DirectionalLight;
	renderer:THREE.WebGLRenderer;
	canvas:HTMLCanvasElement;
	events: Array<any> = [];
	rotationXHelper:THREE.Mesh;
	rotationYHelper:THREE.Mesh;
	controls:OrbitControls;
	activeCamera: THREE.PerspectiveCamera;
	debug:boolean;
	raycaster:Raycaster;
	outlinepass:OutlinePass;
	outputpass:OutputPass;
	renderpass:RenderPass;
	composer:EffectComposer;
	effectFXAA:any;
	container:HTMLElement;

	mousepos:IMousePos;
	mouseStartPos:IMousePos;
	mouseEndPos:IMousePos;

	mousePressed:boolean;
	hasIntersection:boolean;


	selectedObjects:Array<THREE.Object3D> = [];

	/**
	 * Инициализация приложения ThreeJS
	 * @param canvas {HTMLCanvasElement} - Элемент DOMа, куда будет выводится рендер
	 * @param debug {boolean} - Режим отладки
	 */
	constructor(canvas:HTMLCanvasElement, debug:boolean = true){

		this.canvas = canvas;
		this.debug = debug;

		window.addEventListener('resize', this.windowResize.bind(this));
		this.canvas.addEventListener('mousemove', this.updateMouse.bind(this));
		this.canvas.addEventListener('mousedown', function(){ 
			this.mousePressed = true 
			this.mouseStartPos = this.mousepos;
			this.triggerEvent('mousedown', this.mousepos);
		}.bind(this));
		this.canvas.addEventListener('mouseup', function(){ 
			this.mousePressed = false 
			this.mouseEndPos = this.mousepos
			this.canvasClick();
			this.triggerEvent('mouseup', this.mousepos);
		}.bind(this));

		this.container = canvas.parentElement;

		this.mousepos = {
			x: 0,
			y: 0,
			_x: 0,
			_y: 0
		}

		this.scene = new THREE.Scene();
		this.raycaster = new THREE.Raycaster();

		
		this.makeRenderer();
	

		let rotationXGeometry = new THREE.BoxGeometry(.1, 3, .1);
		let rotationMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});

		this.rotationXHelper = new THREE.Mesh(rotationXGeometry, rotationMaterial);
		this.rotationXHelper.position.y = -10;
		this.scene.add(this.rotationXHelper);

		let rotationYGeometry = new THREE.BoxGeometry(.1, .1, 3);
		this.rotationYHelper = new THREE.Mesh(rotationYGeometry, rotationMaterial);
		
		this.scene.add(this.rotationYHelper);

		if(debug){
			this.rotationXHelper.visible = true;
			this.rotationYHelper.visible = true;
		}else{
			this.rotationXHelper.visible = false;
			this.rotationYHelper.visible = false;
		}
	
		this.setupCameras();

		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.maxDistance = 120;
		this.controls.minDistance = 40;
		
		this.controls.minPolarAngle = 0;
		this.controls.maxPolarAngle = Math.PI/2; 
		this.controls.minAzimuthAngle = 0;
		this.controls.maxAzimuthAngle= Math.PI/2;
		
		let max = new THREE.Vector3(16, 0, 16);
		let min = new THREE.Vector3(-16, 0, -16);
		let _v = new THREE.Vector3();


		this.controls.addEventListener("change", function(){
			_v.copy(this.controls.target);
			this.controls.target.clamp(min, max);
			_v.sub(this.controls.target);
			this.camera.position.sub(_v);
		}.bind(this));

		//== Пост-просесс ===============================================

		this.composer = new EffectComposer( this.renderer );
		this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		this.renderpass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(this.renderpass);

		// Подсветка
		this.outlinepass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
		this.outlinepass.edgeStrength = 1.0;
		this.outlinepass.edgeGlow = 4.0;
		this.outlinepass.edgeThickness = 1;
		this.outlinepass.pulsePeriod = 0;
		this.outlinepass.usePatternTexture = false;
		this.outlinepass.visibleEdgeColor.set( 0xffffff );
		this.outlinepass.hiddenEdgeColor.set( 0xffffff );
		this.outlinepass.renderToScreen = true;
		
		this.composer.addPass(this.outlinepass);

		this.effectFXAA = new ShaderPass( FXAAShader );
		this.effectFXAA.uniforms[ 'resolution' ].value.set(
			1 / this.container.clientWidth, 
			1 / this.container.clientHeight 
		);
		this.composer.addPass( this.effectFXAA );

		//=/ Пост-процесс ===============================================
		
		this.controls.update();

		this.animate();
	}

	/**
	 * Обновление данных  о расположении мыши
	 * @param e {MouseEvent} - событие движения мыши
	 */
	updateMouse(e:MouseEvent){

		this.triggerEvent('mousestart', this.mousepos);

		this.mousepos = {
			x: (e.clientX / window.innerWidth) * 2 - 1,
			y: -(e.clientY / window.innerHeight) * 2 + 1,
			_x: e.clientX,
			_y: e.clientY
		}

		this.triggerEvent('mousemove', this.mousepos);
		this.checkIntersection();

	}

	/**
	 * Создание и расстановка камер и освещения
	 */
	setupCameras(){

		let canvas = this.canvas;

		this.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, .1, 1000);
		this.camera.position.set(0, 30, 80);
		this.camera.name = "Main camera";
		this.camera.lookAt(0,0,0);
		this.camera.updateWorldMatrix(false, true);
	}

	/**
	 * Назначение событий для приложения 
	 * @param eventName {string} Имя приложения
	 * @param callback {Function} Callback, вызываемый при событии
	 */
	on(eventName:string, callback:Function){
		this.events.push(
			{
				name: eventName,
				callback: callback
			}
		);
	}

	/**
	 * Запуск обработчика событий
	 * @param eventName {string} - название события
	 * @param data {any} - данные, передаваемые инициатором
	 */
	triggerEvent(eventName:string, data?:any){

		let callbacks = this.events.filter(event => {
			return event.name == eventName
		});

		if( callbacks.length ){
			let callback = callbacks[0].callback;
			callback.bind( this );
			callback( data );
		}
	}

	/**
	 * Цикл анимации
	 */
	animate(){
		this.controls.update();
		this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
		// this.renderer.render(this.scene, this.camera);
		this.composer.render();
		
		requestAnimationFrame(this.animate.bind(this));
		// this.rotationXHelper.rotation.y += .01;

		// console.log(this.rotationXHelper.rotation.y)
	}

	/**
	 * Загрузка 3D-модели
	 * @param modelpath {string} - путь к файлу для загрузки
	 * @param texturepath {string} - путь к файлу текстуры
	 */
	loadModel(modelData:IUploadingModel){

		const textureLoader:THREE.TextureLoader = new TextureLoader();

		let diffuseTexture:THREE.Texture
		let alphaTexture:THREE.Texture

		let material;

		
		if(!modelData.isEmissive){

			material = new THREE.MeshBasicMaterial()

			diffuseTexture = modelData.diffusetexture ? textureLoader.load(modelData.diffusetexture) : null;
			alphaTexture = modelData.alphatexture ? textureLoader.load(modelData.alphatexture) : null;

			if(modelData.alphatexture != null){
				material.transparent = true;
				(material as THREE.MeshBasicMaterial).depthTest = true;
				(material as THREE.MeshBasicMaterial).depthWrite = true;
				(material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
				material.alphaMap = alphaTexture;
				alphaTexture.generateMipmaps = false;
				alphaTexture.minFilter = THREE.LinearFilter;
				alphaTexture.magFilter = THREE.LinearFilter;
				alphaTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

				material.alphaMap = alphaTexture;
				material.alphaMap.minFilter = THREE.LinearFilter;
			}


			diffuseTexture.generateMipmaps = false;
			diffuseTexture.minFilter = THREE.LinearFilter;
			diffuseTexture.magFilter = THREE.LinearFilter;
			diffuseTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
			this.renderer.capabilities.maxTextureSize = 4096;
			
			material.map = diffuseTexture;
			material.map.minFilter = THREE.LinearFilter;


		}else{

			material = new THREE.MeshPhongMaterial;
			material.Emissive = 5;
		}


		if(this.debug){
			console.info("Текстура успешно загружена");
		}
	
		// Успешное завершение загрузки текстуры
		const loader:DRACOLoader = new DRACOLoader();
		loader.setDecoderPath('/draco/');
		loader.setDecoderConfig({type: 'wasm'});

		loader.preload();

		loader.load(
			modelData.modelpath,
			function(geometry:THREE.BufferGeometry){
				// Успешное завершение загрузки модели
				this.triggerEvent('model_loaded');



				let model = new THREE.Mesh(geometry, material);
				model.name = modelData.id;
				(model as any).isInteractive = modelData.isinteractive;
				this.scene.add(model);
				model.parent = this.rotationXHelper;

				if(this.debug){
					console.info("Модель успешно загружена");
				}
				
			}.bind(this),
			function(xhr:ProgressEvent<EventTarget>){
				// Процесс загрузки
				let loadingData:IProgressData = {
					total: xhr.total,
					loaded: xhr.loaded,
					percent: (xhr.loaded / xhr.total) * 100
				}
				this.triggerEvent('model_loading', loadingData)
			}.bind(this),
			function(err:any){
				// При возникновении ошибки
				throw new Error(err);
			}.bind(this)
		)
	}

	/**
	 * Проверка наличия пересечений для луча
	 */
	checkIntersection(){

		if(this.mousePressed) return;

		let mousePos = new THREE.Vector2(this.mousepos.x, this.mousepos.y);
		this.raycaster.setFromCamera(mousePos, this.camera);

		let intersects = this.raycaster.intersectObject(this.scene, true);
		
		
		if(intersects.length > 0){

			const selectedObject = intersects[0].object;
			if((selectedObject as any).isInteractive){

				let already:boolean = false;
				let selectedObjectsEmpty = this.selectedObjects.length == 0;
				
				if(!selectedObjectsEmpty){
					already = this.selectedObjects[0].name == selectedObject.name;
				}

				if(!already){

					this.addHighlightedItem( selectedObject );
					this.outlinepass.selectedObjects = this.selectedObjects;
					let data:IHoverData = {
						object : selectedObject,
						mousePos: this.mousepos
					}
					this.triggerEvent("intersect", data);
				}


			}else{
				this.selectedObjects = [];
				this.outlinepass.selectedObjects = this.selectedObjects;
				this.triggerEvent('lost-intersect');
			}
		}else{
			this.selectedObjects = [];
			this.outlinepass.selectedObjects = this.selectedObjects;
			this.triggerEvent('lost-intersect');
		}

		console.log(intersects.length);
	}

	/**
	 * Добавление объекта в коллекцию пересечений
	 * @param object {THREE.Intersection} - объект на пересечении луча
	 */
	addHighlightedItem(object:THREE.Object3D){
		this.selectedObjects = [];
		this.selectedObjects.push(object);
	}

	/**
	 * Обработка изменения размеров окна
	 */
	windowResize(){

		let width = window.innerWidth;
		let height = window.innerHeight;

		this.renderer.setSize(width, height);
		this.camera.aspect = width /height;
		
		this.camera.updateProjectionMatrix();
		this.composer.setSize(width, height);
		
		this.effectFXAA.uniforms[ 'resolution' ].value.set( 
			1 / width, 
			1 / height 
		);
	}

	makeRenderer(){

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: true
		});

		this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

		this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

		this.renderer.shadowMap.enabled = true;
		this.renderer.toneMapping = THREE.CineonToneMapping;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		const environment = new RoomEnvironment();
		const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
		this.scene.environment = pmremGenerator.fromScene(environment).texture;
	}

	/**
	 * Отображение активного элемента
	 */
	canvasClick(){

		let xdiff = Math.abs(this.mouseStartPos._x - this.mouseEndPos._x);
		let ydiff = Math.abs(this.mouseStartPos._y - this.mouseEndPos._y);

		if (xdiff == 0 && ydiff == 0){

			// Trigger click event
			let activeObject = this.selectedObjects[0];
			if(activeObject){
				this.triggerEvent("object-clicked", activeObject);
			}
		}else{
			this.selectedObjects = [];
		}

	}
}

export default App;