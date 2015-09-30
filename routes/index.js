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

// valid date

Date.prototype.isValid = function () {
    return !isNaN (this.getTime());
};


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

function getLatestService(serviceSlug, callback){

	var params = {
			Bucket: S3_BUCKET,
			Delimiter: "/",
			Prefix: serviceSlug + "/"
		};

	// list dirs

	s3.listObjects(params, function(err, data) {

		if (err) {

			console.log(err, err.stack);

		} else {

			var datetimes = [];

			// check dates are valid, get the most recent

			data.CommonPrefixes.forEach(function(element){

				console.log(element.Prefix);

				var dirName = element.Prefix.replace(serviceSlug, "").replace(/\//g,"");

				var date = new Date(dirName);

				if (date.isValid()){
					datetimes.push(dirName);
				}

			});

			datetimes.sort();

			console.log("datetimes: " + datetimes);

			var datetime = datetimes[0];

			var params = {
				Bucket: S3_BUCKET,
				Key: serviceSlug + "/" + datetime + '/data.json'
			};

			// get data for the most recent service

			s3.getObject(params, function(err, data) {
				if (err){
					console.log(err, err.stack);
				} else {
					var service = JSON.parse(data.Body.toString());
					callback(service);
				}
			});
		}
	});
}

router.get('/services/:serviceSlug', function(req,res){

	var serviceSlug = req.params.serviceSlug;

	// get latest service

	getLatestService(serviceSlug, function(service){

		res.render("service", {service:service});

	});

});


router.get('/services/:serviceSlug/:journeySlug', function(req,res){

	var serviceSlug = req.params.serviceSlug;
	var journeySlug = req.params.journeySlug;
	var viewdata = {
		journey: {
			screens: []
		}
	};

	getLatestService(serviceSlug, function(service){
	
		var journey = null;

		for (var i = 0; i < service.journeys.length; i++){

			if (service.journeys[i].slug == journeySlug){
				journey = service.journeys[i];
				break;
			}

		}

		viewdata.journey.name = journey.name;

		journey.screens.forEach(function(screen){
			viewdata.journey.screens.push({
				"name": screen.slug,
				"url": "/services/"+serviceSlug+"/"+journeySlug+"/"+screen.slug
			})
		});

		// TO DO get images
		res.render("journey", viewdata);
	});
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


router.get('/services/:serviceSlug/:journeySlug/:screenSlug', function(req,res){

	var serviceSlug = req.params.serviceSlug;
	var journeySlug = req.params.journeySlug;
	var screenSlug  = req.params.screenSlug;

	var viewdata = {};

	getLatestService(serviceSlug, function(service){

		var journey = {};

		for (var i = 0; i<service.journeys.length; i++){
			console.dir(service.journeys[i]);
			if (service.journeys[i].slug == journeySlug){
				journey = service.journeys[i];
				break;
			}
		}

		var screenData = {};

		for (var i = 0; i<journey.screens.length; i++){
			console.dir(journey.screens[i]);
			if (journey.screens[i].slug == screenSlug){
				screenData = journey.screens[i];
				break;
			}
		}

		var datetime = service.datetime;

		viewdata.screen = {
			"name": screenData.slug,
			"imageURL": "https://s3-" + S3_REGION + ".amazonaws.com/" + S3_BUCKET + "/" + serviceSlug + "/" + datetime + "/" + journeySlug + "/images/" + screenData["image-filename"]
		}

		res.render('screen', viewdata);

	});

});

module.exports = router;
