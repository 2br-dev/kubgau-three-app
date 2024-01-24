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

import gsap, {Power1} from 'gsap';

export interface IMousePos{
	x:number, y:number, _x:number, _y:number
}

export interface IProgressData{
	total:number,
	loaded:number,
	percent:number
}

interface IOutlinePass{
	selectedObjects:Array<THREE.Intersection>;
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
	outputpass:OutputPass
	composer:EffectComposer;
	effectFXAA:any;
	outlinepassinfo:IOutlinePass;
	container:HTMLElement;

	mousepos:IMousePos;


	highlightedObjects:Array<THREE.Intersection> = [];

	/**
	 * Инициализация приложения ThreeJS
	 * @param canvas {HTMLCanvasElement} - Элемент DOMа, куда будет выводится рендер
	 * @param debug {boolean} - Режим отладки
	 */
	constructor(canvas:HTMLCanvasElement, debug:boolean = true){

		this.outlinepassinfo = {
			selectedObjects: [],
		}

		this.container = canvas.parentElement;

		window.addEventListener('resize', function(){
			this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
			this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
			this.camera.updateProjectionMatrix();
		}.bind(this));

		let cameraPosition = new THREE.Vector3(0, 0, 0);

		this.mousepos = {
			x: 0,
			y: 0,
			_x: 0,
			_y: 0
		}

		this.scene = new THREE.Scene();

		this.canvas = canvas;
		this.makeRenderer();

		this.canvas.addEventListener('mousemove', this.updateMouse.bind(this));

		// this.light = new THREE.DirectionalLight(0xffffff, 1);
		// this.light.position.set(0, 30, 80);
		// this.scene.add(this.light);


		let rotationXGeometry = new THREE.BoxGeometry(.1, 3, .1);
		let rotationMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});

		this.rotationXHelper = new THREE.Mesh(rotationXGeometry, rotationMaterial);
		this.rotationXHelper.position.y = -10;
		this.scene.add(this.rotationXHelper);

		let rotationYGeometry = new THREE.BoxGeometry(.1, .1, 3);
		this.rotationYHelper = new THREE.Mesh(rotationYGeometry, rotationMaterial);
		
		this.scene.add(this.rotationYHelper);

		this.debug = debug;

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

		// this.composer = new EffectComposer( this.renderer );

		// const renderpass = new RenderPass(this.scene, this.camera);
		// this.composer.addPass(renderpass);

		// this.outlinepass = new OutlinePass(new THREE.Vector2(canvas.clientWidth, canvas.clientHeight), this.scene, this.camera);
		// this.composer.addPass(this.outlinepass);

		// this.outputpass = new OutputPass();
		// this.composer.addPass(this.outputpass);

		// this.effectFXAA = new ShaderPass( FXAAShader );
		// this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / canvas.clientWidth, 1 / canvas.clientHeight );
		// this.composer.addPass( this.effectFXAA );

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

		gsap.to( this.mousepos, {
			duration: .1,
			x: (e.clientX / window.innerWidth) * 2 - 1,
			y: -(e.clientY / window.innerHeight) * 2 + 1,
			_x: e.clientX,
			_y: e.clientY,
			ease: Power1.easeInOut,
			onUpdate: () => {
				this.triggerEvent('mousemove', this.mousepos)
			},
			onComplete: ()=>{
				this.triggerEvent('mouseend')
			}
		} )
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
		this.renderer.render(this.scene, this.camera);
		this.controls.update();
		this.camera.updateWorldMatrix(false, true);
		requestAnimationFrame(this.animate.bind(this));
		// this.rotationXHelper.rotation.y += .01;

		// console.log(this.rotationXHelper.rotation.y)
	}

	/**
	 * Загрузка 3D-модели
	 * @param modelpath {string} - путь к файлу для загрузки
	 * @param texturepath {string} - путь к файлу текстуры
	 */
	loadModel(modelpath:string, texturepath?:string){

		if(texturepath){

			const textureLoader:THREE.TextureLoader = new TextureLoader();
	
			textureLoader.load(
				texturepath,
				function(texture:THREE.Texture){
	
					if(this.debug){
						console.info("Текстура успешно загружена");
					}
				
					// Успешное завершение загрузки текстуры
					const loader:DRACOLoader = new DRACOLoader();
					loader.setDecoderPath('/draco/');
					loader.setDecoderConfig({type: 'wasm'});
			
					loader.preload();
			
					loader.load(
						modelpath,
						function(geometry:THREE.BufferGeometry){
							// Успешное завершение загрузки модели
							this.triggerEvent('model_loaded');
							const material = new THREE.MeshBasicMaterial();
							texture.generateMipmaps = false;
							texture.minFilter = THREE.LinearFilter;
							texture.magFilter = THREE.LinearFilter;
							texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
							this.renderer.capabilities.maxTextureSize = 4096;
							material.map = texture;
							material.map.minFilter = THREE.LinearFilter;
	
							let model = new THREE.Mesh(geometry, material);
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
				}.bind(this),
				undefined,
				function( err:any ){
					// Ошибка загрузки текстуры
					throw new Error(err);
				}.bind(this)
			)

		}else{

			let fbxLoader = new FBXLoader();
			fbxLoader.load(
				modelpath,
				(object:THREE.Group<THREE.Object3DEventMap>) => {
					this.triggerEvent('model_loaded');
					this.scene.add(object);
					object.parent = this.rotationXHelper;
				},
				(xhr:ProgressEvent<EventTarget>) => {
					// Процесс загрузки
					let loadingData:IProgressData = {
						total: xhr.total,
						loaded: xhr.loaded,
						percent: (xhr.loaded / xhr.total) * 100
					}
					this.triggerEvent('model_loading', loadingData)
				},
				(err) =>  {
					throw new Error("Ошибка!")
					console.error(err);
				}
			)

		}

	}

	/**
	 * Проверка наличия пересечений для луча
	 */
	checkIntersection(){
		let mousePos = new THREE.Vector2[this.mousepos.x, this.mousepos.y];
		this.raycaster.setFromCamera(mousePos, this.camera);

		let intersects = this.raycaster.intersectObject(this.scene, true);

		if(intersects.length > 0){
			const selectedObject = intersects[0];
			this.addHighlightedItem(selectedObject);
			this.outlinepassinfo.selectedObjects = this.highlightedObjects;
		}
	}

	/**
	 * Добавление объекта в коллекцию пересечений
	 * @param object {THREE.Intersection} - объект на пересечении луча
	 */
	addHighlightedItem(object:THREE.Intersection){
		this.highlightedObjects = [];
		this.highlightedObjects.push(object);
	}

	makeRenderer(){
		// this.renderer = new THREE.WebGLRenderer({
		// 	canvas: this.canvas, 
		// 	antialias: true,
		// 	powerPreference: 'high-performance',
		// 	logarithmicDepthBuffer: true,
		// });
		// this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

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
}

export default App;