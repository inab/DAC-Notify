import amqp from 'amqplib';
import hbs from 'nodemailer-express-handlebars';
import { transport, hbSetup } from './transport';
import { getUserList } from "./users";
import { getDACs } from "./dacs";

const sendEmail = async (msg, hbSetup) => {

    transport.use('compile', hbs(hbSetup));

    return await transport.sendMail(msg)
}

const createEmail = async (msg, additionalFields) => {

    let list = await getUserList();

    let dacMembersIds, mask, dacsInfo, dacsEmail;

    dacMembersIds = await getDACs(msg.dataset.split(",")[0].split(":").pop());

    mask = list.map(element => dacMembersIds[0]["members"].some(item => element.id.includes(item) === true));

    dacsInfo = list.filter((item, i) => mask[i]);

    dacsEmail = dacsInfo.map(el => el.email).join(",")

    const message = {
        from: `"iPC Data Acess Framework" <ipc-project.no-reply@bsc.es>`,
        to: msg.userEmail,
        cc: dacsEmail,
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

    await channel.assertQueue(process.env.RABBITMQ_QUEUE_DATA)

    channel.consume(process.env.RABBITMQ_QUEUE_DATA, async (message) => {

        const msg = JSON.parse(message.content.toString())

        console.log(`Received message: Source - '${msg.source}'`)

        let fields;

        switch (msg.source) {
            case "dac-portal":
                fields = {
                    subject: "Data Access Request",
                    template: "dac-portal",
                    dataset: msg.dataset,
                    user: msg.userId,
                    comments: msg.comments
                }
                break;
            case "dac-management":
                fields = {
                    subject: "Your Data Access Committee has been created",
                    template: "dac-management-creation",
                    dac: msg.dacId,
                    dataset: msg.dataset
                }
                break;
            case "permissions-api":
                fields = {
                    subject: "File permissions updated",
                    template: "permissions-api",
                    method: msg.method,
                    dataset: msg.dataset,
                    user: msg.userId
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