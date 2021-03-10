/**
 * Alvin Ahmadov [https://github.com/AlvinAhmadov]
 * */
const fs = require("fs");
const canvas = require("canvas");
const {JSDOM} = require("jsdom");
const {cv} = require("opencv-wasm");
const path = require("path");

const {loadImage, createCanvas, Canvas, Image, ImageData} = canvas;

const dirname = path.resolve(path.dirname(''));

function installDOM() {
	const dom = new JSDOM();
	// noinspection JSConstantReassignment
	global.document = dom.window.document;
	global.Image = Image;
	global.HTMLCanvasElement = Canvas;
	global.ImageData = ImageData;
	global.HTMLImageElement = Image;
}

/**
 * Shuffle values of an array
 * */
Array.prototype.shuffle = function () {
	let currentIndex = this.length, temporaryValue, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex--);
		temporaryValue = this[currentIndex];
		this[currentIndex] = this[randomIndex];
		this[randomIndex] = temporaryValue;
	}
	return this;
}

/**
 * Read class names as a map from file
 * @param {string} classNamesFile
 *
 * @returns {Map}
 * */
function readClassNames(classNamesFile) {
	let names = new Map();
	let buffer = fs.readFileSync(classNamesFile);
	
	let classes =
		buffer
			.toString()
			.trim()
			.split('\n');
	
	classes.forEach((item, id) => {
		names.set(id, item.replace('\r', '').trim());
	});
	
	return names;
}

/**
 * Convert HSV color to RGB
 *
 * @returns {Object}
 * */
function HSVtoRGB(h, s, v) {
	var r, g, b, i, f, p, q, t;
	if (arguments.length === 1) {
		s = h.s;
		v = h.v;
		h = h.h;
	}
	i = Math.floor(h * 6);
	f = h * 6 - i;
	p = v * (1 - s);
	q = v * (1 - f * s);
	t = v * (1 - (1 - f) * s);
	
	switch (i % 6) {
		case 0:
			r = v
			g = t
			b = p;
			break;
		case 1:
			r = q;
			g = v;
			b = p;
			break;
		case 2:
			r = p;
			g = v;
			b = t;
			break;
		case 3:
			r = p;
			g = q;
			b = v;
			break;
		case 4:
			r = t;
			g = p;
			b = v;
			break;
		case 5:
			r = v;
			g = p;
			b = q;
			break;
	}
	
	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255)
	};
}

async function cvRead(img_path) {
	installDOM();
	let image = await loadImage(img_path);
	return cv.imread(image);
}

async function cvWrite(img, file_path) {
	try {
		installDOM();
		const canvas = createCanvas(300, 300);
		cv.imshow(canvas, img);
		fs.writeFileSync(file_path, canvas.toBuffer('image/png'));
	} catch (e) {
		console.error(cvTranslateError(e));
	}
}

function cvTranslateError(err) {
	let error_stmt = undefined;
	
	if (typeof err === 'undefined') {
		error_stmt = '';
	} else if (typeof err === 'number') {
		if (!isNaN(err)) {
			if (typeof cv !== 'undefined') {
				error_stmt = 'Exception: ' + cv.exceptionFromPtr(err).msg;
			}
		}
	} else if (typeof err === 'string') {
		let ptr = Number(err.split(' ')[0]);
		if (!isNaN(ptr)) {
			if (typeof cv !== 'undefined') {
				error_stmt = 'Exception: ' + cv.exceptionFromPtr(ptr).msg;
			}
		}
	} else if (err instanceof Error) {
		error_stmt = err;
	}
	
	return error_stmt;
}

module.exports = {
	dirname,
	readClassNames,
	HSVtoRGB,
	cvRead,
	cvWrite,
	cvTranslateError
}