var express   = require('express');
var router 	  = express.Router();
var skipperS3 = require('skipper-s3');

var aws = require('aws-sdk');

var AWS_ACCESS_KEY = process.env.AWS_DORIAN_ACCESS_KEY;
var AWS_SECRET_KEY = process.env.AWS_DORIAN_SECRET_KEY;
var S3_BUCKET = "joelanman-dorian";

console.log(AWS_ACCESS_KEY);
console.log(AWS_SECRET_KEY);

aws.config.update({
	accessKeyId: AWS_ACCESS_KEY,
	secretAccessKey: AWS_SECRET_KEY
});

var s3Stream = require('s3-upload-stream')(new aws.S3());
var s3 = new aws.S3();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

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

router.post('/services/:service/:journey/images', function(req,res){

	var service = req.params.service;
	var journey  = req.params.journey;

	req.file('file-image').upload({
		adapter: skipperS3,
		saveAs:  function(file,cb){
			cb(null, file.filename);
		},
		key:     AWS_ACCESS_KEY,
		secret:  AWS_SECRET_KEY,
		bucket:  S3_BUCKET
	}, function(err, file){

		console.log("done");

	});

	res.send("uploaded");

});


module.exports = router;
