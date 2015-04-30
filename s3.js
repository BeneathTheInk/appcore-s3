var knox = require("knox"),
	app = require("./"),
	mime = require("mime"),
	async = require("async"),
	Promise = require("bluebird"),
	_ = require("underscore"),
	toStream = require('streamifier').createReadStream;

module.exports = function() {
	if (this.uploadToS3) return;

	var knox_opts = this.get("s3");
	if (!knox_opts) throw new Error("Missing S3 configuration.");

	// create a knox client form options
	var client = knox.createClient(knox_opts);

	// file upload queue so S3 connection doesn't bottleneck
	var queue = async.queue(function(task, callback) {
		upload(task.data, task.path, task.options)
		.then(function(url) { task.url = url; })
		.nodeify(callback);
	}, 3);

	var pushToQueue = Promise.promisify(queue.push, queue);

	// standard upload method
	function upload(data, filepath, options) {
		options = options || {};
		var s3 = options.client || client;

		if (typeof data === "string") data = new Buffer(data, "utf-8");
		if (Buffer.isBuffer(data)) {
			data = toStream(data);
			if (options.size == null) options.size = data.length;
		}

		if (options.size == null) throw new Error("Missing file size. Please include in options.");
		if (options.type == null) options.type = mime.lookup(filepath);

		var headers = { "Content-Length": options.size };
		if (options.type) headers["Content-Type"] = options.type;

		if (options.meta != null) _.each(options.meta, function(v, k) {
			headers["x-amz-meta-" + k] = v;
		});

		return new Promise(function(resolve, reject) {
			var req = client.putStream(data, filepath, headers, function(err, res) {
				if (err != null) return reject(err);
				res.resume();

				if (res.statusCode !== 200) {
					return reject(new Error("S3 upload failed with status " + res.statusCode));
				}

				resolve(req.url);
			});
		});
	}

	// vanity method for choosing queue or straight upload
	var api = this.uploadToS3 = function(data, filepath, options) {
		if (options && options.queue === false) return upload.apply(null, arguments);

		var task = {
			data: data,
			path: filepath,
			options: options
		};

		return pushToQueue(task).then(function() {
			return task.url;
		});
	}

	// attach knox client for access
	_.extend(api, { knox: client });
}
