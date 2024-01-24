import App, {IMousePos, IProgressData} from './lib/app';

(() => {

	let canvas = <HTMLCanvasElement>document.getElementById('room');
	let app = new App(canvas, false);

	let models = [
		"room",
		"assistent-place",
		"camera",
		"lamps",
		"main-screen",
		"projector",
		"screens-system",
		"server",
		"sufler",
		"man",
		"girl",
		"cube-green",
		"cube-white",
		"chair"
	];
	
	models.forEach(model => {
		app.loadModel(`/3d/models/${model}.drc`, `/3d/textures/${model}.jpg`);
	});

	app.on("model_loading", function(data:IProgressData){
		console.log(data.percent);
	});

	let total = models.length + 1;

	app.on("model_loaded", function(){
		total --;
		if(total == 0){
			console.log("Все модели загружены!");
		}
	})

	app.loadModel(`/3d/models/sensor-screen.fbx`);

	app.rotationXHelper.rotation.y = 1.0;

})();