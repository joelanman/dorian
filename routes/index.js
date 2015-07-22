var express = require('express');
var router = express.Router();

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

    console.log("s3_params");
    console.dir(s3_params);

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

router.get('/report/:presentationName', function (req, res){

	var timings = [];

	timings.push({"init": now()});

	var presentationName = req.params.presentationName;

	if (!presentationName){
	    res.status(404).send("no presentation selected");
	}

	var uploads = 0;

	var slideRegex = /^ppt\/slides\/[^\/]*\.xml$/;
	var relsRegex  = /^ppt\/slides\/_rels\/[^\/]*\.rels$/;
	var mediaRegex = /^ppt\/media\/[^\/]*$/;

	var slideNames = [];

	// read pptx and unzip to s3

	var params = {Bucket: S3_BUCKET, Key: presentationName + ".pptx"};

	var readStream = s3.getObject(params).createReadStream().on("error", function(error){

		console.error("createReadStream.error");
		console.error(error);
		res.status(error.statusCode).send(error);

	});

	function uploadFile (file) {

        var keep = false;

        if (slideRegex.test(file.path)){

            var slideName = file.path.replace("ppt/slides/","");

            slideNames.push(slideName);
            keep = true;

        } else if (relsRegex.test(file.path) || mediaRegex.test(file.path)){

            keep = true;

        }

        if (keep){

            uploads++;

            file.pipe(s3Stream.upload({
                "Bucket": S3_BUCKET,
                "Key": presentationName.replace(".pptx","") + '/' + file.path,
                "ContentType": "text/plain; charset=UTF-8"
            }).on('uploaded', function (details) {

                uploads--;
            
                if (uploads == 0){
                    console.log("all uploaded");
					timings.push({"uploaded": now()});
                    processUnzipped();
                }

            }));

        } else {

            file.autodrain();

        }

    }

});

module.exports = router;
