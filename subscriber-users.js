import amqp from 'amqplib';
import hbs from 'nodemailer-express-handlebars';
import { transport, hbSetup } from './transport';

const sendEmail = async (msg, hbSetup) => {

    transport.use('compile', hbs(hbSetup));

    return await transport.sendMail(msg)
}

const createEmail = async (msg, additionalFields) => {

    const message = {
        from: `"iPC Data Acess Framework" <ipc-project.no-reply@bsc.es>`,
        to: msg.dacsEmail,
        subject: additionalFields.subject,
        template: additionalFields.template,
        context: {
            ...additionalFields
        }
    };

    return message

}

const subscriber = async () => {
    const connection = await amqp.connect(process.env.RABBITMQ_SERVER)

    const channel = await connection.createChannel()

    await channel.assertQueue(process.env.RABBITMQ_QUEUE_USERS)

    channel.consume(process.env.RABBITMQ_QUEUE_USERS, async (message) => {

        const msg = JSON.parse(message.content.toString())
        
        console.log(`Received message: Source - '${msg.source}'`)

        let fields;

        switch (msg.source) {
            case "dac-portal":
                fields = {
                    // Needs to be defined
                }
                break;
            case "dac-management":
                fields = {
                    subject: "DAC info updated",
                    template: "dac-management-info",
                    dac: msg.dacId
                }
                break;
        }

        console.log("FIELDS:")
        console.log(fields)

        try {
            const email = await createEmail(msg, fields);
            const status = await sendEmail(email, hbSetup);
            channel.ack(message);   
            console.log('Email delivered: ', status.messageId);
        } catch (err) {
            console.error(err);
            //channel.nack(message);
        }

    });
}

subscriber().catch((err) => {
    console.error(err)
})
