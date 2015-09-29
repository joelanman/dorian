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

router.get('/services/:service', function(req,res){

	var service = req.params.service;

	var viewdata = {
		"service": {
			"journeys": []
		}
	};

	// get latest service

	var params = {
		Bucket: S3_BUCKET,
		// Marker: service + "/",
		// MaxKeys: 0,
		Prefix: service + "/"
	};
	s3.listObjects(params, function(err, data) {
		if (err) {
			console.log(err, err.stack); // an error occurred
		} else {

			console.log("listObjects: " + data);

			var params = {
				Bucket: S3_BUCKET,
				Key: service + '/data.json'
			};

			s3.getObject(params, function(err, data) {
				if (err){
					console.log(err, err.stack);
				} else {

					console.log("data: " + data.Body.toString());

					// TO DO get images

					viewdata.service = JSON.parse(data.Body.toString());

					res.render("service", viewdata);
				}
			});
		}
	});

});


router.get('/services/:service/:journey', function(req,res){

	var serviceSlug = req.params.service;
	var journeySlug = req.params.journey;

	var viewdata = {
		"journey": {
			"screens": []
		}
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

		// get latest service

		var params = {
			Bucket: S3_BUCKET,
			Key: serviceSlug + "/" + datetime + '/data.json'
		};

		s3.getObject(params, function(err, data) {
			if (err){
				console.log(err, err.stack);
			} else {

				var serviceData = JSON.parse(data.Body.toString());

				console.log(JSON.stringify(serviceData, null, '  '));

				var journeyData = null;

				for (var i = 0; i < serviceData.journeys.length; i++){

					if (serviceData.journeys[i].slug == journeySlug){
						journeyData = serviceData.journeys[i];
						break;
					}

				}

				viewdata.journey.name = journeyData.name;

				journeyData.screens.forEach(function(screen){
					viewdata.journey.screens.push({
						"name": screen.slug,
						"url": "/services/"+serviceSlug+"/"+journeySlug+"/"+screen.slug
					})
				});

				// TO DO get images
				res.render("journey", viewdata);
			}
		});
	}

});

router.post('/services/:service/:datetime/:journey/images', upload.single('file-image'), function(req,res){

	var service  = req.params.service;
	var journey  = req.params.journey;
	var datetime = req.params.datetime;

	var key = service + "/" + datetime + "/" + journey + "/images/" + req.file.originalname;

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

router.post('/services/:serviceSlug', upload.single('file-data'), function(req,res){

	var serviceSlug = req.params.serviceSlug;

	var body = fs.readFileSync(req.file.path);
	fs.unlink(req.file.path);

	console.log(body);

	var service = JSON.parse(body);

	console.dir(service);

	var datetime = service.datetime;

	var key = serviceSlug + "/" + datetime + "/data.json";

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

	// BROKEN!!

	var service = req.params.service;
	var journey = req.params.journey;

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


router.get('/services/:serviceSlug/:datetime/:journeySlug/:screenSlug', function(req,res){

	var serviceSlug = req.params.serviceSlug;
	var journeySlug = req.params.journeySlug;
	var screenSlug  = req.params.screenSlug;

	var viewdata = {};

	if (OFFLINE){

		var journeyData = require('../resources/data.json');

		var screenData = {};

		for (var i = 0; i<journeyData.screens.length; i++){
			console.dir(journeyData.screens[i]);
			if (journeyData.screens[i].name == screenSlug){
				screenData = journeyData.screens[i];
				break;
			}
		}

		viewdata.screen = {
			"name": screenData.name,
			"imageURL": "https://s3-" + S3_REGION + ".amazonaws.com/" + S3_BUCKET + "/" + serviceSlug + "/" + journeySlug + "/images/" + screenData["image-filename"]
		}

		res.render('screen', viewdata);

	} else {

		var params = {
			Bucket: S3_BUCKET,
			Key: serviceSlug + '/data.json'
		};

		s3.getObject(params, function(err, data) {
			if (err){
				console.log(err, err.stack);
			} else {

				var serviceData = JSON.parse(data.Body.toString());

				console.log(JSON.stringify(serviceData, null, '  '));

				var journeyData = {};

				for (var i = 0; i<serviceData.journeys.length; i++){
					console.dir(serviceData.journeys[i]);
					if (serviceData.journeys[i].slug == journeySlug){
						journeyData = serviceData.journeys[i];
						break;
					}
				}

				var screenData = {};

				for (var i = 0; i<journeyData.screens.length; i++){
					console.dir(journeyData.screens[i]);
					if (journeyData.screens[i].slug == screenSlug){
						screenData = journeyData.screens[i];
						break;
					}
				}

				viewdata.screen = {
					"name": screenData.slug,
					"imageURL": "https://s3-" + S3_REGION + ".amazonaws.com/" + S3_BUCKET + "/" + serviceSlug + "/" + journeySlug + "/images/" + screenData["image-filename"]
				}

				res.render('screen', viewdata);

			}
		});

	}


});

module.exports = router;
