var fs = require('fs');

var express   = require('express');
var router 	  = express.Router();

var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })

var aws = require('aws-sdk');

var OFFLINE = process.env.OFFLINE;

var AWS_ACCESS_KEY = process.env.AWS_DORIAN_ACCESS_KEY;
var AWS_SECRET_KEY = process.env.AWS_DORIAN_SECRET_KEY;
var S3_BUCKET = "joelanman-dorian";
var S3_REGION = "eu-west-1";

aws.config.update({
	accessKeyId: AWS_ACCESS_KEY,
	secretAccessKey: AWS_SECRET_KEY,
	region: S3_REGION
});

var s3 = new aws.S3();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// sign an s3 request, for uploading directly from the client

router.get('/sign_s3', function(req, res){

    var s3_params = {
        Bucket: S3_BUCKET,
        Key: req.query.file_name.toLowerCase(),
        Expires: 60,
        ContentType: req.query.file_type,
        ACL: 'public-read'
    };

    s3.getSignedUrl('putObject', s3_params, function(err, data){
        if (err){
            console.log(err);
        }
        else{
            var return_data = {
                signed_request: data,
                url: 'https://'+S3_BUCKET+'.s3.amazonaws.com/'+req.query.file_name
            };
            res.json(return_data);
        }
    });

});

router.get('/services/:service/:journey', function(req,res){

	var service = req.params.service;
	var journey  = req.params.journey;

	var viewdata = {
		"journey": {
			"screens": []
		}
	};

	var params = {
		Bucket: S3_BUCKET,
		Key: service + '/' + journey + '/data.json'
	};

	if (OFFLINE){

		var journeyData = require('../resources/data.json');

		journeyData.screens.forEach(function(screen){
			viewdata.journey.screens.push({
				"name": screen.name,
				"url": "/services/"+service+"/"+journey+"/"+screen.name
			})
		});

		res.render("journey", viewdata);

	} else {

		s3.getObject(params, function(err, data) {
			if (err){
				console.log(err, err.stack);
			} else {

				console.dir(data.Body.toString());

				// TO DO get images

				viewdata.data = data.Body.toString();
				res.render("journey", viewdata);
			}
		});
	}

});

router.post('/services/:service/:journey/images', upload.single('file-image'), function(req,res){

	var service = req.params.service;
	var journey  = req.params.journey;

	var key = service + "/" + journey + "/images/" + req.file.originalname;

	var body = fs.readFileSync(req.file.path);
	fs.unlink(req.file.path);

	var params = {
		Bucket: S3_BUCKET,
		Key: key,
		Body: body
	};

	s3.putObject(params, function (err) {
		if (err) {
			res.status(500).send(err);
		} else {
			res.send("uploaded");
		}
	});

});

router.post('/services/:service', upload.single('file-data'), function(req,res){

	var service = req.params.service;

	var key = service + "/data.json";

	var body = fs.readFileSync(req.file.path);
	fs.unlink(req.file.path);

	var params = {
		Bucket: S3_BUCKET,
		Key: key,
		Body: body
	};	

	s3.putObject(params, function (err) {
		if (err) {
			res.status(500).send(err);
		} else {
			res.send("uploaded");
		}
	});

});

router.post('/services/:service/:journey', upload.single('file-data'), function(req,res){

	var service = req.params.service;
	var journey  = req.params.journey;

	var key = service + "/" + journey + "/data.json";

	var body = fs.readFileSync(req.file.path);
	fs.unlink(req.file.path);

	var params = {
		Bucket: S3_BUCKET,
		Key: key,
		Body: body
	};	

	s3.putObject(params, function (err) {
		if (err) {
			res.status(500).send(err);
		} else {
			res.send("uploaded");
		}
	});

});

// TO DO upload service data

router.get('/services/:service/:journey/:screen', function(req,res){

	var service = req.params.service;
	var journey = req.params.journey;
	var screen  = req.params.screen;

	var viewdata = {};

	if (OFFLINE){

		var journeyData = require('../resources/data.json');

		var screenData = {};

		for (var i = 0; i<journeyData.screens.length; i++){
			console.dir(journeyData.screens[i]);
			if (journeyData.screens[i].name == screen){
				screenData = journeyData.screens[i];
				break;
			}
		}

		viewdata.screen = {
			"name": screenData.name,
			"imageURL": "https://s3-" + S3_REGION + ".amazonaws.com/" + S3_BUCKET + "/" + service + "/" + journey + "/images/" + screenData["image-filename"]
		}

		res.render('screen', viewdata);

	} else {

		// TO DO get journey from S3 (cache?)

	}


});

module.exports = router;
