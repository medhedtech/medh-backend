const s3Client = require("../config/aws-config");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

module.exports = {
  uploadFile: async (
    uploadData,
    successCallback = () => {},
    failCallback = () => {}
  ) => {
    const uploadParams = {
      Bucket: uploadData?.bucketName || "medhdocuments",
      Key: uploadData.key,
      Body: uploadData.file,
      ContentType: uploadData.contentType,
    };

    try {
      const command = new PutObjectCommand(uploadParams);
      const response = await s3Client.send(command);
      
      // Construct the URL since S3 v3 doesn't return Location directly
      const region = 'ap-south-1'; // Use the same region as in aws-config.js
      const location = `https://${uploadParams.Bucket}.s3.${region}.amazonaws.com/${uploadParams.Key}`;
      
      successCallback(location);
      return {
        ...response,
        Location: location,
      };
    } catch (err) {
      failCallback(err);
    }
  },
};
