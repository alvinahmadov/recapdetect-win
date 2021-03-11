const cp  		= require("child_process");
const fs  		= require("fs");
const {cv}      = require("opencv-wasm");
const {join} 	= require('path');
const {
	HAVE_GPU,
	SPLIT_KEYWORD
} 				= require("./config.js")
const {
	cvRead,
	cvWrite,
	HSVtoRGB,
	readClassNames,
	cvTranslateError,
	dirname
}      			= require("./utils.js");

class Detector {
	static FONT_SCALE = 0.5;
	static TEXT_COLOR = [0, 0, 0, 255];
	static TEXT_BG = [0, 0, 0, 128]
	
	constructor(weightsPath, configPath, classNamesPath,
	            debug = false) {
		this.classNames = readClassNames(join(dirname, 'data/coco.names'));
		this.darknetCmd = `darknet\\darknet.exe detector test -ext_output -dont_show ${classNamesPath} ${configPath} ${weightsPath} < input_file`;
		this.debug = debug;
	}
	
	/**
	 * Draw predicted boxes on the image with labeling
	 * with name and probability
	 *
	 * @param {string} imagePath: Path to image to be predicted
	 * @param {Array} predictions
	 * */
	async drawBox(imagePath, predictions) {
		try {
			const alpha = 255;
			const image = await cvRead(imagePath);
			const [width, height] = [image.cols, image.rows];
			const numClasses = this.classNames.size;
			let clsIdx;
			
			const colors = Array(numClasses)
				.fill({h: 1.0, s: 1.0, v: 1.0})
				.map((value, index) => {
					return value = {h: index / numClasses, s: 1.0, v: 1.0};
				})
				.map((value => HSVtoRGB(value)))
				.shuffle();

			predictions.forEach(pred => {
				this.classNames.forEach((v, k) => {if (v.trim() === pred.name.trim()) clsIdx = k;});
				const [x, y, w, h] = [pred.box.x, pred.box.y, pred.box.w, pred.box.h ];
				const colorObj = colors[clsIdx];
				const color = new cv.Scalar(colorObj.r, colorObj.g, colorObj.b, alpha);
				const boxText = `${pred.name}: ${pred.prob}`;
				const textColor = new cv.Scalar(...Detector.TEXT_COLOR);
				const coord = [[x, y], [x + w, y + h]];

				const [p1, p2] = [new cv.Point(...coord[0]), new cv.Point(...coord[1])];
				const textCoord = new cv.Point(coord[0][0] + 105, coord[0][1] - 20);
				const thickness = 0.8 * (height + width) / 600;
				
				cv.rectangle(image, p1, p2, color, thickness);
				
				cv.rectangle(image, p1, textCoord, 
							 new cv.Scalar(colorObj.r, colorObj.g, colorObj.b, 128), 
							 cv.FILLED);
				cv.putText(
					image,
					boxText,
					new cv.Point(coord[0][0], coord[0][1] - 2),
					cv.FONT_HERSHEY_SIMPLEX,
					Detector.FONT_SCALE,
					textColor,
					1.5,
					cv.FILLED,
					false
				);
			})
			return image;
		} catch (e) {
			console.error(cvTranslateError(e));
		}
	}
	
	/**
	 * @param {string} imagePath
	 * @param {string|null} savePath
	 * */
	async detect(imagePath, savePath = null) {
		try {
			const predictions = this._preprocess(imagePath);
			let images = imagePath.split('\r\n');

			for(let i = 0; i < images.length; ++i) {
				const image = await this.drawBox(images[i], predictions[i]);
				if (this.debug) {
					console.log('Predictions:');
					console.log(predictions);
				}
				
				try {
					if (savePath !== null && savePath !== '') {
						let spath = ''
						if (!savePath.endsWith('.png'))
							spath += savePath + i.toString() + '.png';
						else
							spath = savePath;
						cvWrite(image, spath).then(() => console.log(`Image saved at ${spath}`));
					}
				} catch (e) {
					console.error(e);
				}
				image.delete();
				fs.unlink('predictions.jpg', () => {})
			}
		} catch (e) {
			console.error(e);
		}
	}

	_preprocess(imagePaths) {
		const trainFile = join(dirname, 'train.txt')
		fs.writeFileSync(trainFile, imagePaths.replace(' ', '\r\n'));

		let detections = [];
		
		this.darknetCmd = this.darknetCmd.replace("input_file", trainFile);
		let results = cp.execSync(this.darknetCmd);

		let resultsArr = results instanceof Buffer 
		? results.toString().trim().split('\n') 
		: results.trim().split('\n');

		let indices = [];

		resultsArr = HAVE_GPU
		? resultsArr.slice(1, resultsArr.length - 1)
		: resultsArr.slice(3, resultsArr.length - 1);

		for (let i = 0; i < resultsArr.length; ++i) {
			if (resultsArr[i].search(SPLIT_KEYWORD) >= 0)
				indices.push(i);
		}

		for(let i = 1, prev = indices[0]; 
			i <= indices.length; 
			++i, prev = indices[i-1]) {
				let a = resultsArr.slice(prev+1, indices[i]);
				if (a.length > 0) 
					detections.push(this._parse(a));
		}

		fs.unlink(trainFile, () => {});

		return detections;
	}

	_parse(results) {
		let detections = []
		let objConstruct = (data) => {
			if (data.length < 2)
				throw EvalError(`Expected length of data: 2, got ${data.length}: ${data}`);

			let d1 = data[0].split(': ');
			let detection = {
				name: null,
				prob: null,
				box: {}
			};
	
			detection.name = d1[0];
			detection.prob = parseInt(d1[1].replace('%', ''));
			
			let boxData = data[1].substr(1, data[1].length - 3).split(/\s{2,}/g);
	
			detection.box = {
				x: parseInt(boxData[1]),
				y: parseInt(boxData[3]),
				w: parseInt(boxData[5]),
				h: parseInt(boxData[7])
			};
			detections.push(detection);
		}
		
		for (let i = 0; i < results.length; ++i){
			let resultList = results[i].split('\t');
			objConstruct(resultList);
		}
		return detections;
	}
}

module.exports = {
	Detector
}