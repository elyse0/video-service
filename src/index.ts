import express from "express"
import cors from "cors"
import {Stream} from 'stream'

import YoutubeDlWrap from 'yt-dlp-wrap';

import S3Service from '@/services/S3Service'

import {getPreferredFormatForSite} from "@/util/formats"
import {getNormalizedString} from '@/util/string'

const app = express();

app.use(cors({origin: "*"}))

const streamToBuffer = async (stream: Stream): Promise<Buffer> => {
    return new Promise<Buffer>((resolve, reject) => {
        const _buf = Array<any>();

        stream.on("data", chunk => _buf.push(chunk));
        stream.on("end", () => {
            console.log("StreamToBuffer: Finished!")
            return resolve(Buffer.concat(_buf))
        });
        stream.on("error", err => {
            console.log("StreamToBuffer: Error!")
            return reject(`error converting stream - ${err}`)
        });

    });
}


app.get('/', async (req: express.Request, res: express.Response) => {
    try {
        const {url} = req.query

        if (!url || typeof url !== 'string') {
            return res.status(400).json({error: "Please provide an url using ?url="})
        }

        const youtubeDlWrap = new YoutubeDlWrap("./yt-dlp")
        const s3Service = new S3Service()

        console.log(`Downloading video ${url}`)

        const id = await youtubeDlWrap.execPromise([
            url,
            '--get-filename'
        ], {shell: true})

        const normalizedId = getNormalizedString(id)

        const youtubeDlStream = youtubeDlWrap.execStream([
            url,
            ...getPreferredFormatForSite(url),
            '--no-part',
            '-N 10',
        ], {shell: true});

        console.log("Storing stream into buffer")
        let buffer: Buffer | null = await streamToBuffer(youtubeDlStream)

        console.log("Uploading file to S3")
        const uploaded = await s3Service.uploadFile(normalizedId, buffer)

        if (!uploaded) {
            return res.status(400).json({error: "Couldn't upload file"})
        }

        buffer = null

        const signedUrl = await s3Service.getSignedUrl(normalizedId)

        return signedUrl
            ? res.status(200).redirect(signedUrl)
            : res.status(400).json({error: "Couldn't create signed url"})
    } catch (e) {
        console.log(e)
        return res.status(400).json({error: "An error occurred"})
    }
});

// Return 404 if route was not found
app.use((req: express.Request, res: express.Response) => {
    return res.status(404).json({
        error: {code: 404, message: "Resource not found", status: "Not found"},
    });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
    console.log('Server running');
});
