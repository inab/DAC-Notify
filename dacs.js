const MongoClient = require('mongodb').MongoClient
const mongoUri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/${process.env.DAC_PORTAL_DB}?authSource=${process.env.MONGO_AUTH}`;

let db; 

MongoClient.connect(mongoUri, function (err, client) {
    if (err) throw err
    db = client.db(process.env.DAC_PORTAL_DB)
})

const getDACs = async (file) => {
    const response = await db.collection('dacs').find({ 'files.fileId': file })
                                                .project({ '_id': 0, 'members': 1 }).toArray();

    return response
}

exports.getDACs = getDACs;