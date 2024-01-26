import App, {IHoverData, IMousePos, IProgressData} from './lib/app';

(() => {

	let canvas = <HTMLCanvasElement>document.getElementById('room');
	let app = new App(canvas, false);
	let tooltip = document.createElement("div");
	tooltip.classList.add("tooltip");
	tooltip.style.display = "none";
	tooltip.style.padding = "10px";
	tooltip.style.background = "rgba(0,0,0,.7)";
	tooltip.style.color = "white";
	tooltip.style.fontFamily = "sans-serif";
	document.body.append(tooltip);

	let models = [
		"camera",
		"lamps",
		"main-screen",
		"projector",
		"screens-system",
		"sensor-screen",
		"assistent-place",
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

		let emmisive = model == "sensor-screen-lamp";
		
		app.loadModel({
			id: model,
			modelpath: `/3d/models/${model}.drc`,
			diffusetexture: `/3d/textures/${model}.jpg`,
			isinteractive: false,
			isEmissive: emmisive
		})
	});
	
	models.forEach(model => {

		let alphaMap = model == "sensor-screen" ? `/3d/textures/sensor-screen-alpha.jpg` : null

		app.loadModel({
			id: model,
			modelpath: `/3d/models/${model}.drc`,
			diffusetexture: `/3d/textures/${model}.jpg`,
			alphatexture: alphaMap,
			isinteractive: true
		})
	});

	app.on("model_loading", function(data:IProgressData){
		console.log(data.percent);
	});

	let total = models.length + environments.length;

	app.on("model_loaded", function(){
		total --;
		if(total == 0){
			console.log("Все модели загружены!");
		}
	})

	app.on('object-clicked', function(object:any){
		if(object.isInteractive){
			window.alert(`Клик по объекту: ${getName(object.name)}`);
		}
	});

	app.on('mousedown', () => {
		tooltip.style.display = "none";
	});

	app.on('mousemove', (mousedata:IMousePos) => {
		tooltip.style.left = mousedata._x + 20 + "px"
		tooltip.style.top = mousedata._y + 20 + "px"
	})

	app.on('intersect', (data:IHoverData) => {
		canvas.style.cursor = 'pointer';
		tooltip.style.position = 'fixed';
		tooltip.style.display = 'block';
		tooltip.style.top = data.mousePos._y + 20 + "px";
		tooltip.style.left = data.mousePos._x + 20 + "px";
		tooltip.innerHTML = `${getName(data.object.name)}`
	})

	app.on('lost-intersect', () => {
		canvas.style.cursor = 'default';
		tooltip.style.display = 'none';
	})


	app.rotationXHelper.rotation.y = 1.0;

})();

function getName(alias:string){
	let name:string = "";
	switch(alias){
		case "camera": name="Камера 4К" ;break;
		case "lamps": name="Система освещения" ;break;
		case "main-screen": name="Система фонов" ;break;
		case "projector": name="Комплект проекционного оборудования" ;break;
		case "screens-system": name="Система экранов спикера" ;break;
		case "assistent-place": name="Место для ассистента" ;break;
		case "server": name="Севрер" ;break;
		case "sufler": name="Телесуфлёр" ;break;
		case "sensor-screen": name="Сенсорный экран" ;break;
	}
	return name;
}