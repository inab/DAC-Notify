import amqp from 'amqplib';
import hbs from 'nodemailer-express-handlebars';
import { transport, hbSetup } from './transport';
import { getUserList } from "./users";
import { getDACs } from "./dacs";

const queues = [ process.env.RABBITMQ_QUEUE_DAC_PORTAL,
                 process.env.RABBITMQ_QUEUE_DAC_MANAGEMENT,
                 process.env.RABBITMQ_QUEUE_PERMISSIONS_API]

const sendEmail = async (msg, hbSetup) => {

    transport.use('compile', hbs(hbSetup));

    return await transport.sendMail(msg)
}


const createEmail = async (msg, additionalFields) => {

    let list = await getUserList();

    let dacMembersIds = await getDACs(msg.dataset);

    const mask = list.map(element => dacMembersIds[0]["members"].some(item => element.id.includes(item) === true));

    const dacInfo = list.filter((item, i) => mask[i]);

    const dacEmail = dacInfo.map(el => el.email).join(",")

    const message = {
        from: `"iPC Data Acess Framework" <ipc-project.no-reply@bsc.es>`,
        to: msg.userEmail,
        cc: dacEmail,
        subject: additionalFields.subject,
        template: additionalFields.template,
        context: {
            ...additionalFields
        }
    };

    return message;
}

const subscriber = async () => {
    const connection = await amqp.connect(process.env.RABBITMQ_SERVER)

    const channel = await connection.createChannel()

    queues.map(async (q) => await channel.assertQueue(q))

    queues.map(q => channel.consume(q, async (message) => {

        const msg = JSON.parse(message.content.toString())
        console.log(`Received message: Queue - '${q}'`)
        console.log(msg)

        let fields;

        switch (q) {
            case queues[0]:
                fields = {
                    subject: "Data Access Request",
                    template: "dac-portal",
                    dataset: msg.dataset,
                    user: msg.userId,
                    comments: msg.comments
                }
                break;
            case queues[1]:
                fields = {
                    subject: "Data Access Committee has been created",
                    template: "dac-management",
                    dac: msg.dacId
                }
                break;
            case queues[2]:
                fields = {
                    subject: "File permissions updated",
                    template: "permissions-api",
                    dataset: msg.dataset
                }
                break;
        }

        try {
            const email = await createEmail(msg, fields);
            const status = await sendEmail(email, hbSetup);
            console.log('Email sent successfully: ', status.messageId);
            channel.ack(message);   
        } catch {
            console.error(err);
            channel.nack(message);
        }

    }));
}

subscriber().catch((error) => {
    console.error(error)
})
