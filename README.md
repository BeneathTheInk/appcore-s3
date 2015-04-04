# Appcore Amazon S3 Plugin

This is a plugin for Appcore. It assigns `app.files` with a few methods for uploading files to an S3 bucket.

```js
app.use(require("@beneaththeink/appcore-s3"));

// later
app.ready(function() {
    app.files.upload(someBuffer);
});
```

The following configuration keys are required:

- `s3.key` - S3 access key
- `s3.secret` - S3 secret token
- `s3.bucket` - S3 bucket name