import express from "express"
import cors from "cors"

import YoutubeDlWrap from 'yt-dlp-wrap';

import S3Service from '@/services/S3Service'

import {getPreferredFormatForSite} from "@/util/formats"
import {getNormalizedString} from '@/util/string'

const app = express();

app.use(cors({origin: "*"}))

app.get('/', async (req: express.Request, res: express.Response) => {
    try {
        const {url} = req.query

        if (!url || typeof url !== 'string') {
            return res.status(400).json({error: "Please provide an url using ?url="})
        }

        const youtubeDlWrap = new YoutubeDlWrap()
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
        ], {shell: true}) as unknown as ReadableStream;

        console.log("Uploading file to S3")
        const uploaded = await s3Service.uploadFile(normalizedId, youtubeDlStream)

        if (!uploaded) {
            return res.status(400).json({error: "Couldn't upload file"})
        }

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
