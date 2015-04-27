var knox = require("knox"),
	app = require("./"),
	mime = require("mime"),
	async = require("async"),
	Promise = require("bluebird"),
	_ = require("underscore"),
	toStream = require('streamifier').createReadStream;

module.exports = function() {
	var app = this, files;

	// self awareness
	while (files == null && app != null) {
		files = app.files;
		app = app.parent;
	}

	if (files) {
		this.files = files;
		return;
	}

	var knox_opts = this.get("s3");
	if (!knox_opts) throw new Error("Missing S3 configuration.");

	files = this.files = {};
	var client = files.knox = knox.createClient(knox_opts);

	// standard upload interface
	var upload = files.upload = function(data, filepath, options) {
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

	// file upload queue so S3 connection doesn't bottleneck
	var queue = files.queue = async.queue(function(task, callback) {
		upload(task.data, task.path, task.options)
		.then(function(url) { task.url = url; })
		.nodeify(callback);
	}, 3);
}
