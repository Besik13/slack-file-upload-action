import got from 'got';
import FormData from 'form-data';
import fs from 'fs'
import path from 'path';
import { glob } from 'glob'

var form = new FormData();
function finishWithError(message) {
    console.log(message);
}

async function run() {
    try {
        const token = "token";
        const pathToFile = (await glob("test.txt", {}))[0]
        const channel = "channel";
        const tempFileName = undefined
        const fileSize = fs.statSync(pathToFile).size

        var filename;
        if (tempFileName) {
            filename = tempFileName
        } else {
            filename = path.basename(pathToFile)
        }

        var form = new FormData();
        form.append('file', fs.createReadStream(pathToFile));

        const uploadUrlResponse = await got('https://slack.com/api/files.getUploadURLExternal', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json; charset=UTF-8'
            },
            searchParams: {
                filename: filename,
                length: fileSize
            }
        });

        const uploadUrlResponseBody = JSON.parse(uploadUrlResponse.body)
        const uploadUrl = uploadUrlResponseBody.upload_url
        const file_id = uploadUrlResponseBody.file_id
        if (!uploadUrlResponseBody.ok) {
            finishWithError(uploadUrlResponseBody.error);
            return
        }

        console.log("uploadUrl: " + uploadUrl)

        const uploadFileResponse = await got.post(uploadUrl, {
            headers: {
                'Authorization': 'Bearer ' + token,
            },
            body: form
        })
        console.log("uploadFileResponse: " + uploadFileResponse.body)

        const completeResponse = await got.post('https://slack.com/api/files.completeUploadExternal', {
            headers: {
                'Authorization': 'Bearer ' + token
            },
            json: {
                files: [{ 'id': file_id }],
                channel_id: channel
            },
        })
        const completeResponseBody = JSON.parse(completeResponse.body)
        if (!completeResponse.ok) {
            finishWithError(completeResponse.error);
            return
        }
        console.log("completeResp: " + completeResponse.body)
    } catch (error) {
        finishWithError(error);
    }
}

run();
console.log("___________");
