const { dirname } = require('./src/utils.js');
const { join } = require('path')
const { Detector } = require('./src/detector.js');

const images = ['data/samples/sample1.png', 'data/samples/sample2.png'];

const weightsFile = join(dirname, './data/yolo/yolov3.weights');
const configFile = join(dirname, './data/yolo/yolov3.cfg');
const namesFile = join(dirname, './data/coco.data');

(async () => {
	try {
		const detector = new Detector(weightsFile, configFile, namesFile, false);
		let imagesPath = '';

		if (images instanceof Array) {
			images.forEach((v, i) => {
				imagesPath += join(dirname, v);
				if (i < images.length - 1)
					imagesPath += '\r\n';
			})
			imagesPath = imagesPath.trim();
		}

		detector.detect(imagesPath, './predicted')
		
	} catch (e) {
		console.error(e);
	}
})()
