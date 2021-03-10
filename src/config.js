const cfg = {
	yolo:  {
		classes:        "./data/classes/coco.names",
		anchors:        "./data/anchors/basline_anchors.txt",
		strides:         [8, 16, 32],
		anchorPerScale: 3,
		iouLossThresh:  0.5
	},
	train: {
		annotPath:    "./data/dataset/yymnist_train.txt",
		batchSize:    4,
		inputSize:    [416],
		dataAug:      true,
		lrInit:       1e-3,
		lrEnd:        1e-6,
		warmUpEpochs: 2,
		epochs:       30
	},
	test:  {
		annotPath:         "./data/dataset/yymnist_test.txt",
		batchSize:         2,
		inputSize:         544,
		dataAug:           false,
		detectedImagePath: "./data/detection/",
		scoreThreshold:    0.3,
		iouThreshold:      0.45
		
	}
};

