# Amazon S3 Upload Adaptor for Appcore Files

This is an S3 upload adaptor for Appcore files. It allows file data to be saved at any arbitrary path in an S3 bucket.

```js
app.use(require("@beneaththeink/appcore-s3"));

// later
app.ready(function() {
    app.files.upload(fileData, {
        filename: "myfile.jpg",
        s3path: "/user123/myfile.jpg" // the path in the bucket, required
    }, function(err, res) {
        res.url; // -> The full S3 url to the file
    });
});
```

The following application config keys need to be set:

- `s3.key` - S3 access key
- `s3.secret` - S3 secret token
- `s3.bucket` - S3 bucket name
