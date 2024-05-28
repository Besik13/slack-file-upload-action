import core from '@actions/core'
import FormData from 'form-data';
import fs from 'fs'
import got from 'got';
import path from 'path';
import { glob } from 'glob'


function finishWithError(message) {
    console.log(message);
    core.setFailed(message);
}

function finish(result) {
    core.info(result);
}

async function run() {
    try {
        const token = core.getInput('token');
        const pathToFile = (await glob(core.getInput('path'), {}))[0];
        const channel = core.getInput('channel');
        const tempFileName = core.getInput('filename')

        const fileSize = fs.statSync(pathToFile).size

        var filename;
        if (tempFileName) {
            filename = tempFileName
        } else {
            filename = path.basename(pathToFile)
        }

        core.info(`Start uploading ${pathToFile}`)

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
        core.info(`Recieved upload url: ${uploadUrl}`)
        core.info(`Start uploading: ${fileSize}`)
        const uploadFileResponse = await got.post(uploadUrl, {
            headers: {
                'Authorization': 'Bearer ' + token,
            },
            body: form
        })
        core.info(`File uploaded`)
        core.info(`Complete uploading`)
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
        core.info(`Completed`)
        finish(completeResponse.body)
    } catch (error) {
        finishWithError(error);
    }

}

run()
