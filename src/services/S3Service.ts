import {GetObjectCommand, PutObjectCommandInput, S3Client} from '@aws-sdk/client-s3'
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import {Upload} from "@aws-sdk/lib-storage";

class S3Service {

    private bucketName = process.env.S3_BUCKET_NAME;

    private storage = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
        },
        region: process.env.S3_REGION,
    })

    async uploadFile(key: string, body: ReadableStream | Blob | Uint8Array | Buffer): Promise<boolean> {
        const target: PutObjectCommandInput = {
            Bucket: this.bucketName as string,
            Key: key,
            Body: body,
            StorageClass: "ONEZONE_IA"
        };
        try {
            const parallelUploads3 = new Upload({
                client: this.storage,
                queueSize: 4,
                leavePartsOnError: false,
                params: target,
            });

            parallelUploads3.on("httpUploadProgress", (progress) => {
                console.log(progress);
            });

            await parallelUploads3.done();
            return true
        } catch (e) {
            console.log(e);
            return false
        }
    }

    async getSignedUrl(id: string): Promise<string | null> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName as string,
                Key: id
            })
            const url = await getSignedUrl(this.storage, command, {expiresIn: 24 * 60 * 60})

            return url ? url : null
        } catch (e) {
            console.log(e)
            return null
        }
    }
}

export default S3Service

