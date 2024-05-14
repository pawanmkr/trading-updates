import path from 'path';
import sdk from 'microsoft-cognitiveservices-speech-sdk';
import dotenv from 'dotenv';
dotenv.config();


const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.SPEECH_KEY, process.env.SPEECH_REGION);
speechConfig.speechRecognitionLanguage = "en-US";

export default async function tts(text: string): Promise<string> {
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
                    reject(
                        new Error(
                            "Speech synthesis canceled. " + result.errorDetails +
                            "\nDid you set the speech resource key and region values?"
                        )
                    );
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
