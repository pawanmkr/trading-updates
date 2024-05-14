import * as nodemailer from 'nodemailer';
import { configDotenv } from "dotenv";
configDotenv();

// Send an email with a WAV file attachment
export async function sendEmail(
    receiver: string,
    subject: string,
    body: string,
    attachmentPath: string
): Promise<void> {
    // Validate WAV file extension
    if (!attachmentPath.endsWith('.wav')) {
        throw new Error('Attachment must be a WAV file.');
    }

    const transporter = nodemailer.createTransport({
        host: 'smtp.zoho.in',
        port: 465,
        secure: true,
        auth: {
            user: 'informme@zohomail.in',
            pass: 'admin@Z0H0'
        }
    });

    // Send the email
    const mailOptions = {
        from: 'informme@zohomail.in',
        to: receiver,
        subject: subject,
        text: body,
        // html: body,
        attachments: [
            {
                filename: 'jenny.wav',
                path: attachmentPath
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
    } catch (error) {
        console.error(error);
    }
}


