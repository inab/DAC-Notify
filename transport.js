import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PWD
    }
});

const hbSetup = {
    viewEngine: {
        extName: ".handlebars",
        partialsDir: "./views",
        defaultLayout: false
    },
    viewPath: "./views",
    extName: ".handlebars"
}


exports.transport = transport;
exports.hbSetup = hbSetup;