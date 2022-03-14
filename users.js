import KcAdminClient from 'keycloak-admin';
import { keycloakAdminCredentials } from './config';

const getUserList = async () => {
    const kcAdminClient = new KcAdminClient({
        baseUrl: process.env.KEYCLOAK_URL,
        realmName: 'master'
    });

    await kcAdminClient.auth(keycloakAdminCredentials);

    kcAdminClient.setConfig({
        realmName: 'IPC',
    });

    return await kcAdminClient.users.find({})
}

exports.getUserList = getUserList;