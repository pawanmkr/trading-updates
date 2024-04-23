import * as nodemailer from 'nodemailer';


export async function sendEmailWithWAVAttachment(
    subject: string,
    body: string,
    attachmentPath: string
): Promise<void> {
    // Validate WAV file extension
    if (!attachmentPath.endsWith('.wav')) {
        throw new Error('Attachment must be a WAV file.');
    }

    // Create a Nodemailer transport using your preferred email service configuration
    const transporter = nodemailer.createTransport({
        // Replace with your SMTP server details
        host: 'smtp.zoho.in',
        port: 465,
        secure: true,
        auth: {
            user: 'informme@zohomail.in',
            pass: 'mynewpassword5526'
        }
    });

    // Send the email
    const mailOptions = {
        from: 'informme@zohomail.in',
        to: 'iampawanmkr@gmail.com',
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


