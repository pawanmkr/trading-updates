import path from 'path';
import sdk from 'microsoft-cognitiveservices-speech-sdk';
import dotenv from 'dotenv';
dotenv.config();

import { sendEmailWithWAVAttachment } from './mail.js';

const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.SPEECH_KEY, process.env.SPEECH_REGION);
speechConfig.speechRecognitionLanguage = "en-US";

export default async function tts(text: string) {
    const outputPath = path.join(process.cwd(), 'jenny.wav');
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);

    // The language of the voice that speaks.
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";

    // Create the speech synthesizer.
    var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    try {
        return await new Promise((resolve, reject) => {
            synthesizer.speakTextAsync(text, (result) => {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    console.log("\nSynthesis finished.\n");
                    resolve(outputPath);
                } else {
                    reject(new Error("Speech synthesis canceled. " + result.errorDetails +
                        "\nDid you set the speech resource key and region values?"));
                }
            }, (error) => {
                reject(error);
            });
        });
    } catch (error) {
        console.error("An error occurred during speech synthesis:", error);
    } finally {
        synthesizer.close();
        synthesizer = null;
    }
};

(async function () {
    await tts("Dear Customer, This email is from unofficial E-trade API integrated app which provides your daily updates on Investements. But this particular mail is just for testing purpose. talking about project updates, as you can see mail and text-to-speech service are already in action. very soon you'll be presented with a skeleton project. Thanks for listening, have a gread day.");

    const audiofilepath = path.join(process.cwd(), "jenny.wav");
    await sendEmailWithWAVAttachment("Audio and Email Testing", "Hi Dhaval, I hope you are doing good. Checkout the implementation and recent progress, I hope you will like it.", audiofilepath);
})();
