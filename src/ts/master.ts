import App, {IMousePos, IProgressData} from './lib/app';

(() => {

	let canvas = <HTMLCanvasElement>document.getElementById('room');
	let app = new App(canvas, false);

	let models = [
		"camera",
		"lamps",
		"main-screen",
		"projector",
		"screens-system",
		"server",
		"sufler",
	];

	let environments = [
		"room",
		"man",
		"girl",
		"cube-green",
		"cube-white",
		"chair"
	]

	environments.forEach(model => {
		app.loadModel({
			id: model,
			modelpath: `/3d/models/${model}.drc`,
			texturepath: `/3d/textures/${model}.jpg`,
			isinteractive: false
		})
	});
	
	models.forEach(model => {
		app.loadModel({
			id: model,
			modelpath: `/3d/models/${model}.drc`,
			texturepath: `/3d/textures/${model}.jpg`,
			isinteractive: true
		})
	});

	app.on("model_loading", function(data:IProgressData){
		console.log(data.percent);
	});
	
	app.loadModel({
		id: 'sensor-screen',
		modelpath: `/3d/models/sensor-screen.fbx`,
		texturepath: null,
		isinteractive: true
	})

	let total = models.length + environments.length + 1;

	app.on("model_loaded", function(){
		total --;
		if(total == 0){
			console.log("Все модели загружены!");
		}
	})

	app.on('object-clicked', function(object:any){
		if(object.isInteractive){
			window.alert(object.name);
		}
	})


	app.rotationXHelper.rotation.y = 1.0;

})();