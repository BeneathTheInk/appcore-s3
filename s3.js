var knox = require("knox"),
	Promise = require("bluebird"),
	_ = require("underscore");

module.exports = function() {
	if (this.knox) return;

	var knox_opts = this.get("s3") || this.get("files.s3");

	if (!knox_opts) {
		if (knox_opts == null) this.log.warn('Missing S3 configuration.');
		return;
	}

	// create a knox client form options
	var client = this.knox = knox.createClient(knox_opts);

	// attach appcore-file upload api
	if (this.files) this.files.upload.register("s3", function(data, options) {
		var filepath = options.s3path;
		if (!filepath) throw new Error("Missing S3 upload path.");

		var headers = { "Content-Length": options.size };
		if (options.mimetype) headers["Content-Type"] = options.mimetype;

		if (options.s3meta != null) _.each(options.s3meta, function(v, k) {
			headers["x-amz-meta-" + k] = v;
		});

		return new Promise(function(resolve, reject) {
			var req = client.putStream(data, filepath, headers, function(err, res) {
				if (err != null) return reject(err);
				res.resume();

				if (res.statusCode !== 200) {
					return reject(new Error("S3 upload failed with status " + res.statusCode));
				}

				resolve({ url: req.url });
			});
		});
	});
}
